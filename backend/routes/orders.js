const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.json({ success: true, order: newOrder });
  } catch (err) {
    console.error('Order save error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
