// backend/routes/rates.js
const express = require('express');
const router = express.Router();
const Rate = require('../models/Rate');
const Product = require('../models/Product');
const mongoose = require('mongoose');

function computePriceForProduct(rate, weight, wastage = 0, makingCharges = 0, stonePrice = 0) {
  const w = parseFloat(weight || '0') || 0;
  const wastageAmount = (w * rate * (wastage || 0)) / 100;
  const base = w * rate + wastageAmount + (makingCharges || 0) + (stonePrice || 0);
  return Math.round(base);
}

// GET all rates
router.get('/', async (req, res) => {
  try {
    const rates = await Rate.find();
    res.json({ success: true, rates });
  } catch (err) {
    console.error('Rates fetch error:', err);
    res.status(500).json({ success: false, message: 'Error fetching rates' });
  }
});

// PUT update rate by metal and recalc affected products
router.put('/:metal', async (req, res) => {
  const { metal } = req.params;
  const { price } = req.body;

  if (typeof price === 'undefined' || Number.isNaN(Number(price))) {
    return res.status(400).json({ success: false, message: 'Invalid price' });
  }

  try {
    // Update or upsert the rate document
    const updatedRate = await Rate.findOneAndUpdate(
      { metal },
      { price: Number(price), updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let updatedCount = 0;

    // Only recalc products for the metal changed (e.g., gold)
    if (metal === 'gold' || metal === 'silver') {
      const products = await Product.find({ metal }).select('weight wastage makingCharges stonePrice _id');

      if (products.length) {
        // Build bulk operations
        const bulkOps = products.map((p) => {
          const newPrice = computePriceForProduct(
            Number(price),
            p.weight,
            p.wastage ?? 0,
            p.makingCharges ?? 0,
            p.stonePrice ?? 0
          );

          return {
            updateOne: {
              filter: { _id: p._id },
              update: { $set: { price: newPrice } },
            },
          };
        });

        if (bulkOps.length) {
          const result = await Product.bulkWrite(bulkOps);
          // result.nModified or result.modifiedCount depending on mongoose version
          updatedCount = (result.modifiedCount ?? result.nModified ?? 0);
        }
      }
    }

    res.json({ success: true, rate: updatedRate, updatedProducts: updatedCount });
  } catch (err) {
    console.error('Rate update error', err);
    res.status(500).json({ success: false, message: 'Error updating rate' });
  }
});

module.exports = router;
