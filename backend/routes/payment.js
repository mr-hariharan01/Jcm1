const express = require('express');
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');

const router = express.Router();

router.post('/', auth('customer'), async (req, res) => {
  try {
    const { transactionId, amount } = req.body;
    if (!transactionId || !amount) {
      return res.status(400).json({ message: 'transactionId and amount are required' });
    }

    const existing = await Payment.findOne({ transactionId });
    if (existing) return res.status(409).json({ message: 'transactionId already exists' });

    const payment = await Payment.create({
      customerId: req.user.customerId,
      transactionId,
      amount,
      status: 'Pending',
      date: new Date(),
    });

    return res.status(201).json(payment);
  } catch (error) {
    return res.status(500).json({ message: 'Could not submit payment' });
  }
});

router.put('/approve/:id', auth('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = 'Approved';
    await payment.save();

    const customer = await Customer.findOne({ customerId: payment.customerId });
    if (customer) {
      customer.lastRechargeDate = new Date();
      customer.status = 'active';
      await customer.save();
    }

    return res.json({ message: 'Payment approved', payment });
  } catch (error) {
    return res.status(500).json({ message: 'Could not approve payment' });
  }
});

module.exports = router;
