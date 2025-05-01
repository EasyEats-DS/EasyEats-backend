const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'assigned', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending'
  },
  pickupLocation: {
    address: String,
    lat: Number,
    lng: Number
  },
  dropoffLocation: {
    address: String,
    lat: Number,
    lng: Number
  },
  products: [
    {
      productId: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  totalPrice: {
    type: Number,
    
  },
  paymentMethod: {
    type: String,
   
    default: 'credit_card'
  },
  estimatedTime: {
    type: String,
  },
  deliveryTime: {
    type: Date,
  }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
