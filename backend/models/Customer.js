const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    customerId: { type: String, required: true, trim: true, unique: true },
    phone: { type: String, required: true, trim: true },
    plan: { type: String, required: true, trim: true },
    lastRechargeDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
