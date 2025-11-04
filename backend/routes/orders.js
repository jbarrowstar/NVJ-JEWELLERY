const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Counter = require('../models/Counter');

// Helper to generate formatted IDs
async function getNextFormattedNumber(prefix, separator = '/') {
  const counter = await Counter.findOneAndUpdate(
    { name: prefix },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  const year = new Date().getFullYear();
  const padded = String(counter.value).padStart(4, '0');
  return `${prefix}${separator}${year}${separator}${padded}`;
}

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const orderId = await getNextFormattedNumber('ORD', '-');
    const invoiceNumber = await getNextFormattedNumber('INV', '/');

    const newOrder = new Order({
      ...req.body,
      orderId,
      invoiceNumber,
    });

    await newOrder.save();

    // 🔻 Update stock for each item
    for (const item of req.body.items) {
      await Product.findOneAndUpdate(
        { sku: item.sku },
        { $inc: { stock: -item.qty } },
        { new: true }
      );
    }

    res.json({ success: true, order: newOrder });
  } catch (err) {
    console.error('Order save error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Order fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
