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
  ResturantCoverImageUrl: {
    type: String,
    default: "https://res.cloudinary.com/denqj4zdy/image/upload/v1745770799/04_Fenchurch-Interior_2024_4548_2-3840x2160_eno1kw.jpg"
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
      },
      imageUrl: { type: String }
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