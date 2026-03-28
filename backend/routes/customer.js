const express = require('express');
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');

const router = express.Router();

function withDerivedStatus(customerDoc) {
  const customer = customerDoc.toObject();
  const due = new Date(customer.lastRechargeDate);
  due.setDate(due.getDate() + 28);
  customer.dueDate = due;
  customer.status = due < new Date() ? 'expired' : 'active';
  return customer;
}

router.get('/profile', auth('customer'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ customerId: req.user.customerId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    return res.json(withDerivedStatus(customer));
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch profile' });
  }
});

router.get('/payments', auth('customer'), async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.user.customerId }).sort({ date: -1 });
    return res.json(payments);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch payments' });
  }
});

module.exports = router;
