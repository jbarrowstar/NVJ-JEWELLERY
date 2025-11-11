// routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { getNextSequence } = require('../utils/counterHelper');

const multer = require('multer');
const path = require('path');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

// ensure env loaded at app entry; safe to call here as well
require('dotenv').config();

// ----------------------
// S3 client
// ----------------------
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer memory storage + validation

const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (allowedExt.has(ext)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
};

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, 
});

// Helpers

const safeKey = (originalName) => {
  const base = (originalName || 'upload')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_\-\.]/g, '');
  const datePrefix = new Date().toISOString().slice(0, 10);
  const ts = Date.now();
  return `uploads/${datePrefix}/${ts}-${base}`;
};

async function uploadBufferToS3({ buffer, key, contentType }) {
  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      ACL: 'private',
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024,
    leavePartsOnError: false,
  });
  await uploader.done();
  return {
    key,
    url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
}

// Single image upload (field: image)
router.post('/upload', uploadMemory.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const key = safeKey(req.file.originalname);
    const { url } = await uploadBufferToS3({
      buffer: req.file.buffer,
      key,
      contentType: req.file.mimetype,
    });
    // keep shape compatible with your existing client usage
    return res.json({ success: true, imageUrl: url, key });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, message: 'Image upload failed' });
  }
});

// Multiple images upload (field: images, up to 10)
router.post('/upload-multiple', uploadMemory.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    // upload in parallel
    const uploads = await Promise.all(
      req.files.map((f) => {
        const key = safeKey(f.originalname);
        return uploadBufferToS3({
          buffer: f.buffer,
          key,
          contentType: f.mimetype,
        });
      })
    );
    // Return arrays matching each file
    return res.json({
      success: true,
      images: uploads.map(u => ({ imageUrl: u.url, key: u.key })),
      count: uploads.length,
    });
  } catch (err) {
    console.error('Multi upload error:', err);
    return res.status(500).json({ success: false, message: 'Images upload failed' });
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
// Create product (unchanged logic; pass image URL you got from upload)
// ----------------------
const getYyyymm = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
};

const sanitizeCategoryPrefix = (category = '') => {
  const clean = String(category || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = clean.slice(0, 3);
  return prefix.length === 3 ? prefix : (prefix + 'GEN').slice(0, 3);
};

router.post('/', async (req, res) => {
  try {
    const {
      name, category, metal, weight, purity, makingCharges, wastagePercent, wastage, stonePrice, price, description, image,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Name and category are required' });
    }

    const prefix = sanitizeCategoryPrefix(category);
    const yyyymm = getYyyymm();
    const counterName = `SKU_${prefix}_${yyyymm}`;
    const seq = await getNextSequence(counterName);
    const serial = String(seq).padStart(4, '0');
    const sku = `${prefix}-${yyyymm}-${serial}`;
    const qrCode = `QR-${sku}`;

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
      image: image || '', // client sets this from /upload or first of /upload-multiple
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
// Update product (unchanged logic)
// ----------------------
router.put('/:id', async (req, res) => {
  try {
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
// Delete product: delete S3 object if the image is an S3 URL
// ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const prod = await Product.findById(req.params.id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    // best-effort: if image looks like S3 URL, delete object
    if (prod.image && typeof prod.image === 'string' && prod.image.includes('.s3.')) {
      const key = new URL(prod.image).pathname.replace(/^\//, '');
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
        }));
      } catch (e) {
        console.error('Failed to delete S3 object:', e);
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('Product delete error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----------------------
// Mark sold (unchanged logic)
// ----------------------
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