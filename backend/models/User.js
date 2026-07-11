const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['admin', 'customer'], required: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    customerId: { type: String, trim: true, unique: true, sparse: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
