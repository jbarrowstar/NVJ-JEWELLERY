const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },         // ✅ Internal tracking
  invoiceNumber: { type: String, required: true, unique: true },   // ✅ GST-compliant
  customer: {
    name: String,
    phone: String,
    email: String,
  },
  items: [
    {
      name: String,
      price: Number,
      qty: Number,
      sku: String,
    },
  ],
  paymentMode: String,
  subtotal: Number,
  discount: Number,
  tax: Number,
  grandTotal: Number,
  date: String,
  time: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
