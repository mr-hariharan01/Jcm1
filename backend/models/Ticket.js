const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },
    adminReply: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
