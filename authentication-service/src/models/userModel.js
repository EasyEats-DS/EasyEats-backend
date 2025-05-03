const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['RESTAURANT_OWNER', 'DELIVERY_PERSON','CUSTOMER','SUPER_ADMIN'],
    required: true,
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  position: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      default: [0, 0]  // Default coordinates set to [0, 0]
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});
// 🗺️ Add the 2dsphere index for geospatial queries
UserSchema.index({ position: '2dsphere' });
module.exports = mongoose.model('User', UserSchema);