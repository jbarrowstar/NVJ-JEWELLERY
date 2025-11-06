const express = require('express');
const router = express.Router();
const Rate = require('../models/Rate');

// GET all rates
router.get('/', async (req, res) => {
  try {
    const rates = await Rate.find();
    res.json({ success: true, rates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching rates' });
  }
});

// PUT update rate by metal
router.put('/:metal', async (req, res) => {
  const { metal } = req.params;
  const { price } = req.body;
  try {
    const updated = await Rate.findOneAndUpdate(
      { metal },
      { price, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json({ success: true, rate: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating rate' });
  }
});

module.exports = router;
