const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  subtotal: { type: Number, required: true },
});

const ShippingAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String, default: '' },
  deliveryNotes: { type: String, default: '' },
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
      filename: { type: String, default: null },
      originalName: { type: String, default: null },
      mimetype: { type: String, default: null },
      size: { type: Number, default: null },
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
  },
  {
    timestamps: true,
  }
);

// Virtual: formatted total
OrderSchema.virtual('formattedTotal').get(function () {
  return `$${this.totalAmount.toFixed(2)}`;
});

module.exports = mongoose.model('Order', OrderSchema);
