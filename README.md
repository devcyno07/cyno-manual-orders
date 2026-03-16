# 🛒 Order Placement Portal — MERN Stack

A production-ready, full-stack order placement application with a gorgeous multi-step form UI, Google Sheets product catalog, bank payment details display, payment proof upload, and automated email confirmations.

---

## ✨ Features

- **4-Step Multi-Section Form** with live validation and step progress indicator
- **Google Sheets Integration** — products, prices and descriptions fetched live with 5-min cache
- **Live Total Calculation** — updates instantly as products are added/removed/quantity changed
- **Bank Payment Display** — all bank details shown with one-click copy buttons
- **Payment Proof Upload** — drag & drop or click, supports JPG/PNG/WebP/PDF up to 5MB
- **Beautiful Confirmation Email** — HTML email with full order summary sent to customer
- **MongoDB Storage** — full order record persisted with timestamps
- **Responsive Design** — works perfectly on mobile, tablet and desktop
- **Modern UI** — dark glass-morphism design with Instrument Serif + Outfit fonts

---

## 📁 Project Structure

```
order-mern/
├── backend/
│   ├── models/
│   │   └── Order.js              # Mongoose schema
│   ├── services/
│   │   ├── productService.js     # Google Sheets fetcher with cache
│   │   └── emailService.js       # Nodemailer HTML email
│   ├── uploads/                  # Payment proof files (auto-created)
│   ├── server.js                 # Express API
│   ├── package.json
│   └── .env.example              # ← copy to .env
│
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── pages/
│       │   ├── OrderForm.js       # Main 4-step form
│       │   └── OrderForm.module.css
│       ├── services/api.js        # Axios calls
│       ├── styles/globals.css     # Design tokens + base
│       ├── App.js
│       └── index.js
│
├── package.json                   # Root scripts
└── README.md
```

---

## 🚀 Quick Start

### 1. Install all dependencies

```bash
# From project root:
npm run install:all
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env with your values (see Configuration section below)
```

### 3. Start MongoDB

```bash
# Local MongoDB:
mongod

# OR use MongoDB Atlas — set MONGODB_URI in .env to your Atlas connection string
```

### 4. Run the app

```bash
# From root — runs both backend + frontend concurrently:
npm run dev

# OR start separately:
# Terminal 1: cd backend && npm run dev   → http://localhost:5000
# Terminal 2: cd frontend && npm start    → http://localhost:3000
```

---

## ⚙️ Configuration (.env)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Backend port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/orderdb` |
| `GOOGLE_SHEET_ID` | Sheet ID from URL | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms` |
| `GOOGLE_SHEETS_API_KEY` | Google Cloud API key | `AIzaSy...` |
| `GOOGLE_SHEET_TAB` | Tab name in sheet | `Sheet1` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | Sender email | `your@gmail.com` |
| `EMAIL_PASS` | Gmail App Password | `xxxx xxxx xxxx xxxx` |
| `EMAIL_FROM_NAME` | Sender display name | `Your Company Orders` |
| `EMAIL_FROM_ADDRESS` | Sender address | `orders@yourcompany.com` |
| `BANK_NAME` | Your bank name | `First National Bank` |
| `BANK_ACCOUNT_HOLDER` | Account holder | `Your Company LLC` |
| `BANK_ACCOUNT_NUMBER` | Account number | `1234567890` |
| `BANK_ROUTING` | Routing/ABA number | `021000021` |
| `BANK_SWIFT` | SWIFT/BIC code | `FNBAUS33` |
| `BANK_IBAN` | IBAN | `US12FNBA...` |
| `BANK_BRANCH` | Branch name | `Main Branch` |
| `BANK_REFERENCE_NOTE` | Payment reference note | `Include Order ID as reference` |

---

## 📊 Google Sheets Setup

**Sheet format** (header row is optional, data starts from row 2):

| A: ID | B: Name | C: Price | D: Description | E: Category | F: InStock |
|---|---|---|---|---|---|
| P001 | Widget Alpha | 29.99 | High-quality widget | Electronics | TRUE |
| P002 | Bundle Pack | 59.99 | Full package | Bundles | TRUE |

**Setup steps:**
1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Sheets API**
3. Create **Credentials** → API Key → restrict to Sheets API
4. Share your sheet: **Share → Anyone with link → Viewer**
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/**SHEET_ID**/edit`

> ℹ️ If Google Sheets is not configured, the app automatically uses 8 built-in mock products.

---

## 📧 Gmail App Password Setup

1. Enable 2-Factor Authentication on your Google account
2. Visit [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate an App Password for "Mail" / "Other"
4. Use the 16-character code as `EMAIL_PASS` (with or without spaces)

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/products` | Fetch products from Google Sheets |
| `GET` | `/api/bank-details` | Get bank payment details |
| `POST` | `/api/orders` | Submit new order (multipart/form-data) |

### POST /api/orders — Form fields

```
customerName       string    required
customerEmail      string    required
contactNumber      string    required
items              JSON      required  — array of {id, name, price, quantity}
addressFullName    string    required
addressLine1       string    required
addressLine2       string    optional
city               string    required
state              string    required
postalCode         string    required
country            string    required
addressPhone       string    optional
deliveryNotes      string    optional
paymentProof       file      optional  — JPG/PNG/WebP/PDF, max 5MB
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, CSS Modules |
| **Backend** | Node.js, Express 4 |
| **Database** | MongoDB + Mongoose |
| **Email** | Nodemailer (SMTP) |
| **File Upload** | Multer |
| **Products** | Google Sheets API v4 |
| **HTTP Client** | Axios |
| **Fonts** | Instrument Serif + Outfit (Google Fonts) |

---

## 📱 Form Sections

1. **Personal Info** — Full name, email address, contact number (with validation)
2. **Select Products** — Live dropdown from Google Sheets, add multiple items, adjust quantities, see live total
3. **Payment Details** — Bank transfer info with copy buttons, payment proof upload (drag & drop)
4. **Shipping Info** — Full delivery address, phone, notes + final order summary before submit

After submission, the customer receives a full HTML confirmation email with order details, items table, and shipping address.
