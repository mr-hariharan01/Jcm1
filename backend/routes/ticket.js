const express = require('express');
const auth = require('../middleware/auth');
const Ticket = require('../models/Ticket');

const router = express.Router();

router.post('/', auth('customer'), async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'subject and message are required' });
    }
    const ticket = await Ticket.create({ customerId: req.user.customerId, subject, message });
    return res.status(201).json(ticket);
  } catch (error) {
    return res.status(500).json({ message: 'Could not create ticket' });
  }
});

router.get('/my', auth('customer'), async (req, res) => {
  try {
    const tickets = await Ticket.find({ customerId: req.user.customerId }).sort({ createdAt: -1 });
    return res.json(tickets);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch tickets' });
  }
});

router.put('/reply/:id', auth('admin'), async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'reply is required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.reply = reply;
    ticket.status = 'Resolved';
    await ticket.save();

    return res.json(ticket);
  } catch (error) {
    return res.status(500).json({ message: 'Could not reply to ticket' });
  }
});

module.exports = router;
