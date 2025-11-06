const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
  metal: { type: String, enum: ['gold', 'silver'], required: true, unique: true },
  price: { type: Number, required: true }, // ₹ per gram
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Rate', rateSchema);
