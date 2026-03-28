const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

async function ensureAdminUser() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;

  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() });
  if (existing) return;

  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  await User.create({ role: 'admin', email: process.env.ADMIN_EMAIL.toLowerCase(), password: hash });
  console.log('Admin user seeded from environment credentials.');
}

async function bootstrap() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    await ensureAdminUser();

    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {
    console.error('Server start failed:', error.message);
    process.exit(1);
  }
}

bootstrap();
