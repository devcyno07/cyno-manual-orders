/**
 * woocommerceService.js
 * Creates a draft order in WooCommerce after every MERN order submission.
 * Non-blocking — if WooCommerce fails, MERN order still saves successfully.
 */

const https = require('https');
const http  = require('http');
const path = require('path');
const fs   = require('fs');
const FormData = require('form-data');

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
      lineItems.push({
        product_id: wcProductId,
        quantity:   item.quantity,
        price:      item.price.toString(),
      });
    } else {
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

// ── Post payment proof as an internal admin order note ────────────────────
// WooCommerce order notes render HTML — unlike customer_note which is plain text.
async function addPaymentProofNote(wcOrderId, paymentProof) {
  // Resolve the URL from either a string or an object { url: '...' }
  const proofUrl =
    typeof paymentProof === 'string'
      ? paymentProof
      : paymentProof?.url || '';

  if (!proofUrl) {
    console.warn(`[WC] No payment proof URL found for WC Order #${wcOrderId} — skipping note`);
    return;
  }

  try {
    await wcRequest('POST', `orders/${wcOrderId}/notes`, {
      note: `<strong>Payment Proof:</strong> <a href="${proofUrl}" target="_blank" rel="noopener noreferrer">📎 View Uploaded File</a>`,
      customer_note: false, // internal admin-only note, not sent to customer
    });
    console.log(`[WC] Payment proof note added to WC Order #${wcOrderId}`);
  } catch (err) {
    console.warn(`[WC] Failed to add payment proof note for Order #${wcOrderId}:`, err.message);
  }
}


// ── Upload payment proof to WordPress Media Library ───────────────────────
// ── Upload payment proof to WordPress Media Library ───────────────────────
// Uses WordPress Application Password (separate from WooCommerce API keys)
// Set WP_APP_USER and WP_APP_PASSWORD in your .env file
async function uploadProofToWordPress(filePath, filename, mimetype) {
    return new Promise((resolve, reject) => {
        const wpUser     = process.env.WP_APP_USER     || '';
        const wpPassword = process.env.WP_APP_PASSWORD || '';

        if (!WC_URL || !wpUser || !wpPassword) {
            return reject(new Error('WordPress credentials not configured — set WP_APP_USER and WP_APP_PASSWORD in .env'));
        }

        const base   = WC_URL.replace(/\/$/, '');
        // Remove spaces from app password (WordPress generates it with spaces)
        const auth   = Buffer.from(`${wpUser}:${wpPassword.replace(/\s/g, '')}`).toString('base64');
        const urlStr = `${base}/wp-json/wp/v2/media`;
        const parsed = new URL(urlStr);

        const fileStream = fs.createReadStream(filePath);
        const form = new FormData();
        form.append('file', fileStream, { filename, contentType: mimetype });

        const options = {
            hostname: parsed.hostname,
            port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path:     parsed.pathname,
            method:   'POST',
            headers: {
                'Authorization':       `Basic ${auth}`,
                'Content-Disposition': `attachment; filename="${filename}"`,
                ...form.getHeaders(),
            },
        };

        const transport = parsed.protocol === 'https:' ? https : http;
        const req = transport.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(new Error(`WP Media API ${res.statusCode}: ${result.message || data}`));
                    } else {
                        const url = result.source_url || result.guid?.rendered || '';
                        console.log(`[WC] Proof uploaded to WordPress Media Library: ${url}`);
                        resolve(url);
                    }
                } catch {
                    reject(new Error(`WP Media parse error: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('WordPress upload timeout')); });
        form.pipe(req);
    });
}

// ── Main: Create Draft Order in WooCommerce ────────────────────────────────
async function createWooCommerceOrder(order) {
  if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.warn('[WC] Credentials not configured — skipping WooCommerce order creation');
    return null;
  }

  try {
    const addr = order.shippingAddress || {};

    // Use already-uploaded WP URL if available, otherwise fallback to MERN URL
    const proofUrl = order.paymentProof?.wpUrl 
      || order.paymentProof?.url 
      || '';

    console.log(`[WC] Using payment proof URL: "${proofUrl || 'NONE'}"`);

    const lineItems = await buildLineItems(order.items);

    const payload = {
      status:                'pending',
      currency:              'INR',
      set_paid:              false,
      payment_method:        'bacs',
      payment_method_title:  'Direct Bank Transfer',

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

      line_items: lineItems,

      customer_note: [
        `Manual Order ID: ${order.orderId}`,
        `Remitter: ${addr.remitterName || 'N/A'}`,
        `Consignee: ${addr.fullName || 'N/A'}`,
        `Sex: ${addr.sex || 'N/A'} | Age: ${addr.age || 'N/A'}`,
        `Contact: ${order.contactNumber}`,
        `Source: Cyno Manual Orders`,
      ].join('\n'),

      meta_data: [
        { key: '_mern_order_id',     value: order.orderId },
        { key: '_remitter_name',     value: addr.remitterName || '' },
        { key: '_consignee_name',    value: addr.fullName || '' },
        { key: '_consignee_sex',     value: addr.sex || '' },
        { key: '_consignee_age',     value: addr.age || '' },
        { key: '_bank_receipt_url',  value: proofUrl },
        { key: '_payment_proof_url', value: proofUrl },
        { key: '_order_source',      value: 'cyno-manual-orders' },
      ],
    };

    const wcOrder = await wcRequest('POST', 'orders', payload);
    console.log(`[WC] Order created → WC #${wcOrder.id} for MERN ${order.orderId}`);

    // Add clickable HTML note in admin
    if (proofUrl) {
      await wcRequest('POST', `orders/${wcOrder.id}/notes`, {
        note: `<strong>💳 Payment Proof:</strong> <a href="${proofUrl}" target="_blank" rel="noopener noreferrer">📎 View / Download Receipt</a>`,
        customer_note: false,
      });
    }

    return wcOrder;

  } catch (err) {
    console.error('[WC] Failed to create WooCommerce order:', err.message);
    return null;
  }
}

module.exports = { createWooCommerceOrder, uploadProofToWordPress };