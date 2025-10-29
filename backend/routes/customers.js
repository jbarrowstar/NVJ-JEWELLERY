const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// GET all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json({ success: true, customers });
  } catch (err) {
    console.error('Customer fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST already exists
router.post('/', async (req, res) => {
  try {
    const newCustomer = new Customer(req.body);
    await newCustomer.save();
    res.json({ success: true, customer: newCustomer });
  } catch (err) {
    console.error('Customer save error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
