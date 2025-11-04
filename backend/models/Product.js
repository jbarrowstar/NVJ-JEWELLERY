const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  sku: { type: String, required: true, unique: true },
  image: { type: String },
  category: { type: String },
  weight: { type: String },
  purity: { type: String },
  description: { type: String },
  qrCode: { type: String },
  stock: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
