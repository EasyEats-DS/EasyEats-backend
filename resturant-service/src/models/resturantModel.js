
const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  openingHours: {
    type: String
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  menu: [
    {
      name: {
        type: String,
        required: true
      },
      description: String,
      price: {
        type: Number,
        required: true
      },
      category: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }
  ],
  ownerId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

RestaurantSchema.index({ position: '2dsphere' });

module.exports = mongoose.model('Restaurant', RestaurantSchema);
