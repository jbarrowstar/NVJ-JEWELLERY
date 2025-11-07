// backend/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, index: true, trim: true },
  category: { type: String, trim: true, default: '' },
  metal: { type: String, enum: ['gold', 'silver'], required: true },
  weight: { type: String, trim: true, default: '' }, // store as string (e.g. "1.2") — consistent units (grams)
  purity: { type: String, trim: true, default: '' },  // e.g. "22K"
  makingCharges: { type: Number, default: 0, min: 0 },
  wastage: { type: Number, default: 0, min: 0 }, // percent
  stonePrice: { type: Number, default: 0, min: 0 },
  price: { type: Number, required: true, min: 0 }, // currency as Number (INR)
  description: { type: String, default: '' },
  image: { type: String, default: '' }, // path like /uploads/...
  qrCode: { type: String, default: '' },
  available: { type: Boolean, default: true },
}, { timestamps: true });

// Optional: ensure small text fields are safe before saving
productSchema.pre('save', function(next) {
  if (this.name) this.name = String(this.name).trim();
  if (this.sku) this.sku = String(this.sku).trim();
  if (this.category) this.category = String(this.category).trim();
  next();
});

module.exports = mongoose.model('Product', productSchema);
