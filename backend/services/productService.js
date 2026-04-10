/**
 * productService.js
 * Fetches products from WooCommerce REST API.
 * Replaces Google Sheets integration.
 */

const https = require('https');
const http  = require('http');

const WC_URL             = process.env.WC_URL             || '';
const WC_CONSUMER_KEY    = process.env.WC_CONSUMER_KEY    || '';
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET || '';

// ── Generic WooCommerce GET request ───────────────────────────────────────
function wcGet(endpoint) {
  return new Promise((resolve, reject) => {
    if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
      return reject(new Error('WooCommerce credentials not configured'));
    }

    const base   = WC_URL.replace(/\/$/, '');
    const auth   = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const urlStr = `${base}/wp-json/wc/v3/${endpoint}`;
    const parsed = new URL(urlStr);

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/json',
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
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('WooCommerce request timeout'));
    });
    req.end();
  });
}

// ── Fetch all products with pagination ────────────────────────────────────
async function fetchAllWcProducts() {
  let allProducts = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const results = await wcGet(`products?status=publish&per_page=${perPage}&page=${page}&orderby=menu_order&order=asc`);

    if (!Array.isArray(results) || results.length === 0) break;

    allProducts = allProducts.concat(results);

    // If fewer results than perPage, we've got all products
    if (results.length < perPage) break;
    page++;
  }

  return allProducts;
}

// ── Map WooCommerce product to our format ─────────────────────────────────
function mapWcProduct(wcProduct) {
  return {
    id:          String(wcProduct.id),
    name:        wcProduct.name || '',
    price:       parseFloat(wcProduct.price) || 0,
    description: wcProduct.short_description
      ? wcProduct.short_description.replace(/<[^>]*>/g, '').trim()
      : wcProduct.description?.replace(/<[^>]*>/g, '').trim() || '',
    category:    wcProduct.categories?.[0]?.name || 'General',
    inStock:     wcProduct.stock_status === 'instock',
    image:       wcProduct.images?.[0]?.src || '',
    sku:         wcProduct.sku || '',
    permalink:   wcProduct.permalink || '',
  };
}

// ── Main export: fetchProductsFromSheet (kept same name for compatibility) ─
async function fetchProductsFromSheet() {
  if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.warn('[Products] WooCommerce not configured — returning demo products');
    return getPharmacyDemoProducts();
  }

  try {
    const wcProducts = await fetchAllWcProducts();

    const products = wcProducts
      .map(mapWcProduct)
      .filter(p => p.name && p.price > 0 && p.inStock);

    console.log(`[Products] Fetched ${products.length} products from WooCommerce`);
    return products;
  } catch (err) {
    console.error('[Products] WooCommerce fetch failed:', err.message);
    return getPharmacyDemoProducts();
  }
}

// ── Fallback demo products ────────────────────────────────────────────────
function getPharmacyDemoProducts() {
  return [
    { id: 'MED001', name: 'Amoxicillin 500mg Capsules (10s)',    price: 120.00, description: 'Broad-spectrum antibiotic for bacterial infections',    category: 'Prescription',  inStock: true },
    { id: 'MED002', name: 'Metformin 500mg Tablets (30s)',        price: 85.00,  description: 'Oral medication for type 2 diabetes management',         category: 'Diabetes Care', inStock: true },
    { id: 'MED003', name: 'Atorvastatin 10mg Tablets (30s)',      price: 210.00, description: 'Statin medication to lower cholesterol',                  category: 'Cardiac Care',  inStock: true },
    { id: 'MED004', name: 'Paracetamol 500mg Tablets (20s)',      price: 35.00,  description: 'Fast-acting pain relief and fever reducer',               category: 'OTC Medicines', inStock: true },
    { id: 'MED005', name: 'Vitamin D3 1000 IU Softgels (60s)',    price: 450.00, description: 'Supports bone health and immune function',                category: 'Vitamins',      inStock: true },
    { id: 'MED006', name: 'Omeprazole 20mg Capsules (14s)',        price: 95.00,  description: 'Reduces stomach acid, treats acid reflux',                category: 'OTC Medicines', inStock: true },
  ];
}

module.exports = { fetchProductsFromSheet };