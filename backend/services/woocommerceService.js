/**
 * woocommerceService.js
 * Creates a draft order in WooCommerce after every MERN order submission.
 * Non-blocking — if WooCommerce fails, MERN order still saves successfully.
 */

const https = require('https');
const http  = require('http');

const WC_URL             = process.env.WC_URL             || '';
const WC_CONSUMER_KEY    = process.env.WC_CONSUMER_KEY    || '';
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET || '';

// ── Generic WooCommerce API request ───────────────────────────────────────
function wcRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
      return reject(new Error('WooCommerce credentials not configured'));
    }

    const base    = WC_URL.replace(/\/$/, '');
    const auth    = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const urlStr  = `${base}/wp-json/wc/v3/${endpoint}`;
    const parsed  = new URL(urlStr);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`WC API ${res.statusCode}: ${parsed.message || data}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`WC API parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('WooCommerce request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Find WooCommerce product ID by name ───────────────────────────────────
async function findWcProductId(productName) {
  try {
    const results = await wcRequest('GET', `products?search=${encodeURIComponent(productName)}&per_page=5`);
    if (!Array.isArray(results) || results.length === 0) return null;

    // Exact match first
    const exact = results.find(p =>
      p.name.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    return (exact || results[0]).id;
  } catch (err) {
    console.warn(`[WC] Product lookup failed for "${productName}":`, err.message);
    return null;
  }
}

// ── Build WooCommerce line items ───────────────────────────────────────────
async function buildLineItems(orderItems) {
  const lineItems = [];

  for (const item of orderItems) {
    const wcProductId = await findWcProductId(item.name);

    if (wcProductId) {
      // Matched WooCommerce product
      lineItems.push({
        product_id: wcProductId,
        quantity:   item.quantity,
        price:      item.price.toString(),
      });
    } else {
      // Not found — add as custom line item with subtotal
      lineItems.push({
        name:      item.name,
        quantity:  item.quantity,
        subtotal:  item.subtotal.toFixed(2),
        total:     item.subtotal.toFixed(2),
        price:     item.price.toString(),
      });
    }
  }

  return lineItems;
}

// ── Main: Create Draft Order in WooCommerce ────────────────────────────────
async function createWooCommerceOrder(order) {
  if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.warn('[WC] Credentials not configured — skipping WooCommerce order creation');
    return null;
  }

  try {
    const addr = order.shippingAddress || {};

    // Build line items (match by name)
    const lineItems = await buildLineItems(order.items);

    // Build order payload
    const payload = {
      status: 'pending',   // Draft / pending payment
      currency: 'USD',

      // ── Customer Info ──────────────────────────────────────────────────
      billing: {
        first_name: order.customerName.split(' ')[0] || order.customerName,
        last_name:  order.customerName.split(' ').slice(1).join(' ') || '',
        email:      order.customerEmail,
        phone:      order.contactNumber,
        address_1:  addr.addressLine1 || '',
        address_2:  addr.addressLine2 || '',
        city:       addr.city         || '',
        state:      addr.state        || '',
        postcode:   addr.postalCode   || '',
        country:    addr.country      || '',
      },

      // ── Shipping Address ───────────────────────────────────────────────
      shipping: {
        first_name: (addr.fullName || order.customerName).split(' ')[0],
        last_name:  (addr.fullName || order.customerName).split(' ').slice(1).join(' ') || '',
        phone:      addr.phone || order.contactNumber,
        address_1:  addr.addressLine1 || '',
        address_2:  addr.addressLine2 || '',
        city:       addr.city         || '',
        state:      addr.state        || '',
        postcode:   addr.postalCode   || '',
        country:    addr.country      || '',
      },

      // ── Line Items ─────────────────────────────────────────────────────
      line_items: lineItems,

      // ── Order Notes ────────────────────────────────────────────────────
      customer_note: [
        `Manual Order ID: ${order.orderId}`,
        `Remitter: ${addr.remitterName || 'N/A'}`,
        `Consignee: ${addr.fullName || 'N/A'}`,
        `Sex: ${addr.sex || 'N/A'} | Age: ${addr.age || 'N/A'}`,
        `Contact: ${order.contactNumber}`,
        `Payment Proof: ${order.paymentProof?.originalName || 'Uploaded'}`,
        `Source: Cyno Manual Orders`,
      ].join('\n'),

      // ── Meta Data ──────────────────────────────────────────────────────
      meta_data: [
        { key: '_mern_order_id',      value: order.orderId },
        { key: '_remitter_name',      value: addr.remitterName || '' },
        { key: '_consignee_name',     value: addr.fullName || '' },
        { key: '_consignee_sex',      value: addr.sex || '' },
        { key: '_consignee_age',      value: addr.age || '' },
        { key: '_payment_proof_file', value: order.paymentProof?.originalName || '' },
        { key: '_order_source',       value: 'cyno-manual-orders' },
      ],
    };

    const wcOrder = await wcRequest('POST', 'orders', payload);

    console.log(`[WC] Draft order created → WC Order #${wcOrder.id} for MERN Order ${order.orderId}`);
    return wcOrder;

  } catch (err) {
    console.error('[WC] Failed to create WooCommerce order:', err.message);
    return null;
  }
}

module.exports = { createWooCommerceOrder };