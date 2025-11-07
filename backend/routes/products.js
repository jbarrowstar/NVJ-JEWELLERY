// routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { getNextSequence } = require('../utils/counterHelper');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage and filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // make filename safer
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\.]/g, '');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Helper: yyyymm and sanitize prefix
const getYyyymm = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
};

const sanitizeCategoryPrefix = (category = '') => {
  const clean = String(category || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = clean.slice(0, 3);
  return prefix.length === 3 ? prefix : (prefix + 'GEN').slice(0, 3); // fallback / pad
};

// ----------------------
// Image upload endpoint
// ----------------------
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // serve as /uploads/<filename>
    const imageUrl = `/uploads/${req.file.filename}`;
    return res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, message: 'Image upload failed' });
  }
});

// ----------------------
// List all products
// ----------------------
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----------------------
// Fetch single product by id
// ----------------------
router.get('/:id', async (req, res) => {
  try {
    const prod = await Product.findById(req.params.id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: prod });
  } catch (err) {
    console.error('Product fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----------------------
// Fetch by SKU
// ----------------------
router.get('/sku/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const prod = await Product.findOne({ sku });
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: prod });
  } catch (err) {
    console.error('Product fetch by SKU error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----------------------
// Create product (atomic SKU using Counter)
// ----------------------
router.post('/', async (req, res) => {
  try {
    const {
      name, category, metal, weight, purity, makingCharges, wastagePercent, wastage, stonePrice, price, description, image,
    } = req.body;

    // basic validation
    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Name and category are required' });
    }

    // Build SKU parts
    const prefix = sanitizeCategoryPrefix(category);
    const yyyymm = getYyyymm();

    // Use a counter document per prefix+yyyymm for atomic serial increments
    const counterName = `SKU_${prefix}_${yyyymm}`;
    const seq = await getNextSequence(counterName); // atomic increment in DB
    const serial = String(seq).padStart(4, '0');
    const sku = `${prefix}-${yyyymm}-${serial}`;

    const qrCode = `QR-${sku}`;

    // Compose product payload (allow frontend to override price but we keep price as number)
    const payload = {
      name,
      category,
      metal: metal || 'gold',
      weight: weight || '',
      purity: purity || '',
      makingCharges: makingCharges ?? 0,
      wastage: wastage ?? wastagePercent ?? 0,
      stonePrice: stonePrice ?? 0,
      price: price ?? 0,
      description: description || '',
      image: image || '',
      sku,
      qrCode,
    };

    const product = new Product(payload);
    await product.save();

    return res.json({ success: true, product });
  } catch (err) {
    console.error('Product create error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----------------------
// Update product
// ----------------------
router.put('/:id', async (req, res) => {
  try {
    // Do not auto-change SKU on update. If client explicitly wants to change SKU they can send it.
    const updates = { ...req.body };

    const updated = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, product: updated });
  } catch (err) {
    console.error('Product update error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----------------------
// Delete product (and try to remove image file)
// ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const prod = await Product.findById(req.params.id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    // If product has an image that lives under /uploads, remove it (best-effort)
    if (prod.image && typeof prod.image === 'string' && prod.image.startsWith('/uploads/')) {
      const filename = prod.image.replace('/uploads/', '');
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') console.error('Failed to delete image file:', err);
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('Product delete error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


router.put('/:sku/mark-sold', async (req, res) => {
  try {
    await Product.findOneAndUpdate({ sku: req.params.sku }, { available: false });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark sold error:', err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
