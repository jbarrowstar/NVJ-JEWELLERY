const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Login route only
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  res.json({ success: true, message: 'Login successful', user: { email: user.email, role: user.role } });
});

module.exports = router;
