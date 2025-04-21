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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


module.exports = mongoose.model('Restaurant', RestaurantSchema);