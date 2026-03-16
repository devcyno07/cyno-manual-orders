const axios = require('axios');

let cache = { data: null, fetchedAt: null };
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchProductsFromSheet() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const tab = process.env.GOOGLE_SHEET_TAB || 'Sheet1';

  if (!sheetId || !apiKey || sheetId === 'your_google_sheet_id_here') {
    console.warn('[Products] Google Sheets not configured — returning pharmacy demo products');
    return getPharmacyDemoProducts();
  }

  if (cache.data && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const range = encodeURIComponent(`${tab}!A2:F500`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    const { data } = await axios.get(url, { timeout: 8000 });

    const products = (data.values || [])
      .map((row, idx) => ({
        id: row[0] || String(idx + 1),
        name: row[1] || '',
        price: parseFloat(row[2]) || 0,
        description: row[3] || '',
        category: row[4] || 'OTC Medicines',
        inStock: row[5] !== undefined ? row[5].toString().toLowerCase() !== 'false' : true,
      }))
      .filter(p => p.name && p.price > 0 && p.inStock);

    cache = { data: products, fetchedAt: Date.now() };
    console.log(`[Products] Fetched ${products.length} products from Google Sheets`);
    return products;
  } catch (err) {
    console.error('[Products] Fetch failed:', err.message);
    if (cache.data) return cache.data;
    return getPharmacyDemoProducts();
  }
}

function getPharmacyDemoProducts() {
  return [
    { id: 'MED001', name: 'Amoxicillin 500mg Capsules (10s)', price: 120.00, description: 'Broad-spectrum antibiotic for bacterial infections', category: 'Prescription', inStock: true },
    { id: 'MED002', name: 'Metformin 500mg Tablets (30s)', price: 85.00, description: 'Oral medication for type 2 diabetes management', category: 'Diabetes Care', inStock: true },
    { id: 'MED003', name: 'Atorvastatin 10mg Tablets (30s)', price: 210.00, description: 'Statin medication to lower cholesterol', category: 'Cardiac Care', inStock: true },
    { id: 'MED004', name: 'Paracetamol 500mg Tablets (20s)', price: 35.00, description: 'Fast-acting pain relief and fever reducer', category: 'OTC Medicines', inStock: true },
    { id: 'MED005', name: 'Vitamin D3 1000 IU Softgels (60s)', price: 450.00, description: 'Supports bone health and immune function', category: 'Vitamins', inStock: true },
    { id: 'MED006', name: 'Omeprazole 20mg Capsules (14s)', price: 95.00, description: 'Reduces stomach acid, treats acid reflux', category: 'OTC Medicines', inStock: true },
    { id: 'MED007', name: 'Omega-3 Fish Oil 1000mg (90s)', price: 680.00, description: 'Heart health and cognitive support supplement', category: 'Vitamins', inStock: true },
    { id: 'MED008', name: 'Amlodipine 5mg Tablets (30s)', price: 175.00, description: 'Calcium channel blocker for blood pressure', category: 'Cardiac Care', inStock: true },
    { id: 'MED009', name: 'Cetrizine 10mg Tablets (10s)', price: 45.00, description: 'Non-drowsy antihistamine for allergy relief', category: 'OTC Medicines', inStock: true },
    { id: 'MED010', name: 'First Aid Kit — Complete (50 items)', price: 1200.00, description: 'Comprehensive home and travel first aid kit', category: 'First Aid', inStock: true },
    { id: 'MED011', name: 'Blood Glucose Test Strips (50s)', price: 850.00, description: 'Compatible with most glucose monitoring devices', category: 'Diabetes Care', inStock: true },
    { id: 'MED012', name: 'Baby Fever Syrup 60ml', price: 180.00, description: 'Gentle paracetamol suspension for infants 3m+', category: 'Baby & Mother', inStock: true },
  ];
}

module.exports = { fetchProductsFromSheet };
