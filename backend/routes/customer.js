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

router.get('/payments/list', auth('customer'), async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.user.customerId }).sort({ date: -1 });
    return res.json(payments);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch payments' });
  }
});

// compatibility endpoint requested in spec
router.get('/payments', auth('customer'), async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.user.customerId }).sort({ date: -1 });
    return res.json(payments);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch payments' });
  }
});

router.get('/:id', auth('customer'), async (req, res) => {
  try {
    const requestedId = req.params.id.toUpperCase();
    if (requestedId !== req.user.customerId) {
      return res.status(403).json({ message: 'You can only access your profile' });
    }

    const customer = await Customer.findOne({ customerId: requestedId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    return res.json(withDerivedStatus(customer));
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch customer profile' });
  }
});

module.exports = router;
