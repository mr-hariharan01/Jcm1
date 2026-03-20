const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    speed: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    validity: { type: Number, default: 28 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
