const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Payment = require('../models/Payment');

const router = express.Router();

function validateCustomerPayload(body, requirePassword = true) {
  const { name, customerId, phone, plan, password } = body;
  if (!name || !customerId || !phone || !plan || (requirePassword && !password)) {
    return 'name, customerId, phone, plan and password are required';
  }
  if (!/^JCM\d{3}$/i.test(customerId)) return 'customerId must match JCM001 format';
  return null;
}

router.get('/customers', auth('admin'), async (_req, res) => {
  const customers = await Customer.find().sort({ createdAt: -1 });
  res.json(customers);
});

router.post('/customer', auth('admin'), async (req, res) => {
  try {
    const err = validateCustomerPayload(req.body, true);
    if (err) return res.status(400).json({ message: err });

    const customerId = req.body.customerId.toUpperCase();
    const existingCustomer = await Customer.findOne({ customerId });
    if (existingCustomer) return res.status(409).json({ message: 'Customer already exists' });

    const customer = await Customer.create({
      name: req.body.name,
      customerId,
      phone: req.body.phone,
      plan: req.body.plan,
      lastRechargeDate: new Date(),
      status: 'active',
    });

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await User.create({ role: 'customer', customerId, password: hashedPassword });

    return res.status(201).json(customer);
  } catch (error) {
    return res.status(500).json({ message: 'Could not create customer' });
  }
});

router.put('/customer/:id', auth('admin'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const nextCustomerId = (req.body.customerId || customer.customerId).toUpperCase();
    if (!/^JCM\d{3}$/.test(nextCustomerId)) return res.status(400).json({ message: 'Invalid customerId format' });

    customer.name = req.body.name ?? customer.name;
    customer.customerId = nextCustomerId;
    customer.phone = req.body.phone ?? customer.phone;
    customer.plan = req.body.plan ?? customer.plan;
    customer.lastRechargeDate = req.body.lastRechargeDate ?? customer.lastRechargeDate;

    const dueDate = new Date(customer.lastRechargeDate);
    dueDate.setDate(dueDate.getDate() + 28);
    customer.status = dueDate < new Date() ? 'expired' : 'active';

    await customer.save();

    const user = await User.findOne({ customerId: customer.customerId });
    if (user && req.body.password) user.password = await bcrypt.hash(req.body.password, 10);
    if (user) await user.save();

    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ message: 'Could not update customer' });
  }
});

router.delete('/customer/:id', auth('admin'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await User.deleteOne({ customerId: customer.customerId });
    await Payment.deleteMany({ customerId: customer.customerId });
    return res.json({ message: 'Customer deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete customer' });
  }
});

router.get('/payments', auth('admin'), async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  const payments = await Payment.find(query).sort({ createdAt: -1 });
  res.json(payments);
});

module.exports = router;
