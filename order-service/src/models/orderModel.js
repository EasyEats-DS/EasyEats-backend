const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  restaurantId: {
    type: String,
    required: true,
  },
  orderId: {
    type: String,
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
  paymentMethod: {
    type: String,
    enum: ["card", "cash"],
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  deliveryAddress: {
    type: String,
    default: "SLIIT Campus, Malabe",
  },
  dropNote: {
    type: String,
    default: "",
  },
  deliveryType: {
    type: String,
    default: "standard",
  },
  dropoff: {
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
