const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    transactionId: { type: String, required: true, trim: true, unique: true },
    status: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
