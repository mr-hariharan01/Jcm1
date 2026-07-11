const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, trim: true, index: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },
    reply: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
