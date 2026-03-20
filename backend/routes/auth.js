const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { customerId: identifier.toUpperCase() };

    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, customerId: user.customerId || null },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({ token, role: user.role });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
