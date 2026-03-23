require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createWooCommerceOrder } = require('./services/woocommerceService');

const Order = require('./models/Order');
const { fetchProductsFromSheet } = require('./services/productService');
const { sendOrderConfirmationEmail } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app preview URL automatically
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ─── Multer (Payment Proof Upload) ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `proof_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|pdf)$/i;
    const allowedMime = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
    if (allowed.test(file.originalname) && allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WebP images and PDF files are allowed (max 5MB)'));
    }
  },
});

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orderdb')
  .then(() => console.log('✅  MongoDB connected'))
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/health */
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

/** GET /api/products — fetch from Google Sheets */
app.get('/api/products', async (_req, res) => {
  try {
    const products = await fetchProductsFromSheet();
    res.json({ success: true, data: products });
  } catch (err) {
    console.error('[/api/products]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/** GET /api/bank-details — return bank info from env */
app.get('/api/bank-details', (_req, res) => {
  res.json({
    success: true,
    data: {
      bankName:      process.env.BANK_NAME          || 'First National Bank',
      accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'Your Company LLC',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '1234 5678 9012',
      routing:       process.env.COMPANY_ADDRESS     || '021000021',
      swift:         process.env.BANK_SWIFT          || 'FNBAUS33XXX',
      iban:          process.env.BANK_IBAN           || '',
      branch:        process.env.BANK_BRANCH         || 'Main Branch',
      referenceNote: process.env.BANK_REFERENCE_NOTE || 'Buyer must cover bank charges in China and the USA (intermediary bank). If unknown, add USD 27.00. Subject to final receipt.',
    },
  });
});

/** POST /api/orders — create new order */
app.post('/api/orders', upload.single('paymentProof'), async (req, res) => {
  try {
    const {
      customerName, customerEmail, contactNumber,
      items: itemsRaw,
      addressFullName, addressLine1, addressLine2,
      city, state, postalCode, country,
      addressPhone,
      remitterName, sex, age,
    } = req.body;

    // ── Validation ──
    const errors = [];
    if (!customerName?.trim())                      errors.push('Customer name is required');
    if (!customerEmail?.match(/^\S+@\S+\.\S+$/))    errors.push('Valid email is required');
    if (!contactNumber?.trim())                     errors.push('Contact number is required');
    if (!itemsRaw)                                  errors.push('Order items are required');
    if (!req.file)                                  errors.push('Payment proof is required');
    if (!addressLine1?.trim())                      errors.push('Street address is required');
    if (!city?.trim())                              errors.push('City is required');
    if (!state?.trim())                             errors.push('State is required');
    if (!postalCode?.trim())                        errors.push('Postal code is required');
    if (!country?.trim())                           errors.push('Country is required');

    if (errors.length) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, errors });
    }

    // ── Parse items ──
    let items;
    try {
      items = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : itemsRaw;
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid items format' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Please select at least one product' });
    }

    // ── Compute totals ──
    const enrichedItems = items.map(item => ({
      productId: item.id || item.productId,
      name:      item.name,
      price:     parseFloat(item.price),
      quantity:  parseInt(item.quantity, 10),
      subtotal:  parseFloat(item.price) * parseInt(item.quantity, 10),
    }));

    const subtotalAmount = enrichedItems.reduce((s, i) => s + i.subtotal, 0);
    const totalAmount    = subtotalAmount;

    // ── Generate Order ID ──
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 5).toUpperCase()}`;

    // ── Create order ──
    const order = await Order.create({
      orderId,
      customerName:  customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      contactNumber: contactNumber.trim().replace(/[^\d+\s\-().]/g, ''),
      items:         enrichedItems,
      subtotalAmount,
      shippingFee:   0,
      totalAmount,
      paymentProof: {
        filename:     req.file.filename,
        originalName: req.file.originalname,
        mimetype:     req.file.mimetype,
        size:         req.file.size,
      },
      shippingAddress: {
        remitterName: (remitterName || '').trim(),
        fullName:     (addressFullName || customerName).trim(),
        sex:          (sex || '').trim(),
        age:          (age || '').trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: (addressLine2 || '').trim(),
        city:         city.trim(),
        state:        state.trim(),
        postalCode:   postalCode.trim(),
        country:      country.trim(),
        phone: (addressPhone || contactNumber).trim().replace(/[^\d+\s\-().]/g, ''),
      },
      ipAddress: req.ip,
    });

    // ── Send confirmation email (non-blocking) ──
    sendOrderConfirmationEmail(order)
      .then(sent => {
        if (sent) Order.findByIdAndUpdate(order._id, { emailSent: true }).exec();
      })
      .catch(err => console.error('[Email async error]', err.message));

    // ── Create WooCommerce draft order (non-blocking) ──
    createWooCommerceOrder(order)
      .then(wcOrder => {
        if (wcOrder?.id) {
          Order.findByIdAndUpdate(order._id, {
            $set: { 'meta.wcOrderId': wcOrder.id }
          }).exec();
          console.log(`[WC] Linked WC Order #${wcOrder.id} to MERN Order ${order.orderId}`);
        }
      })
      .catch(err => console.error('[WC async error]', err.message));

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        orderId:       order.orderId,
        totalAmount:   order.totalAmount,
        status:        order.status,
        customerEmail: order.customerEmail,
      },
    });
  } catch (err) {
    console.error('[POST /api/orders]', err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, error: err.message || 'Server error — please try again' });
  }
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message,
    });
  }
  if (err) return res.status(400).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀  Server running → http://localhost:${PORT}`);
  console.log(`📋  API docs → GET /api/health | /api/products | /api/bank-details\n`);
});


// Serve React static files
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all: send React app for any non-API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});
