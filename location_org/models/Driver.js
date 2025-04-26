const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const driverSchema = new mongoose.Schema({
  driverId: String,
  name: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  position: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true
    }
  },
  role:{
    type: String,
    enum: ['driver', 'customer'],
    default: 'driver'
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'off-duty'],
    default: 'off-duty'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// 🔐 Hash password before saving
driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('Driver', driverSchema);
