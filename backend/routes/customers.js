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

// UPDATE customer
router.put('/:id', async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, customer: updated });
  } catch (err) {
    console.error('Customer update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Customer delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
