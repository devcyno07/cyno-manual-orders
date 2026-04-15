const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  subtotal: { type: Number, required: true },
});

const ShippingAddressSchema = new mongoose.Schema({
  remitterName:  { type: String, default: '' },
  fullName:      { type: String, required: true },  // Consignee Name
  sex:           { type: String, default: '' },
  age:           { type: String, default: '' },
  addressLine1:  { type: String, required: true },
  addressLine2:  { type: String, default: '' },
  city:          { type: String, required: true },
  state:         { type: String, required: true },  // Province
  postalCode:    { type: String, required: true },
  country:       { type: String, required: true },
  phone:         { type: String, default: '' },
});

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ── Personal Info ──────────────────────────────────────────────
    customerName: { type: String, required: true, trim: true },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    contactNumber: { type: String, required: true, trim: true },

    // ── Products ───────────────────────────────────────────────────
    items: { type: [OrderItemSchema], required: true, validate: v => v.length > 0 },
    subtotalAmount: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // ── Payment ────────────────────────────────────────────────────
    paymentProof: {
      filename:     { type: String, default: null },
      originalName: { type: String, default: null },
      mimetype:     { type: String, default: null },
      size:         { type: Number, default: null },
      url:          { type: String, default: null },  // ← ADDED: full accessible URL
      wpUrl:        { type: String },
    },

    // ── Shipping ───────────────────────────────────────────────────
    shippingAddress: { type: ShippingAddressSchema, required: true },

    // ── Status ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'payment_review', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },

    emailSent: { type: Boolean, default: false },
    ipAddress: { type: String, default: '' },

    // ── WooCommerce ────────────────────────────────────────────────
    meta: {
      wcOrderId: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

OrderSchema.virtual('formattedTotal').get(function () {
  return `$${this.totalAmount.toFixed(2)}`;
});

module.exports = mongoose.model('Order', OrderSchema);