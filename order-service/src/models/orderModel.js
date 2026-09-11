const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  restaurantId: {
    type: String,
    // required: true,
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
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  /**
   * Where the food is actually going.
   *
   * Until now the drop-off was inferred from the customer's last reported
   * geolocation, which is wherever their browser happened to be when it last
   * had permission -- not necessarily where they want dinner. GeoJSON order,
   * [longitude, latitude], matching every other position in the system.
   *
   * Optional so orders placed before this existed still load; dispatch falls
   * back to the customer's stored position when it is absent.
   */
  deliveryLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },

  /** Flat number, landmark, gate code -- what the driver reads at the door. */
  deliveryAddress: {
    type: String,
    trim: true,
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
