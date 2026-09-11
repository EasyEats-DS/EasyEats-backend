const mongoose = require('mongoose');

/**
 * The search for a driver, as opposed to the delivery itself.
 *
 * A Delivery record only exists once someone has accepted. Everything before
 * that -- who has been asked, who said no, which offer is open right now, how
 * many rounds we have burned -- lives here. Keeping it in Mongo rather than in
 * a Map is what lets an order survive a restart of this service: the boot sweep
 * reads these documents back and re-arms the timers.
 */

const ACTIVE_STATES = ['searching', 'offered', 'accepted', 'picked_up'];
const TERMINAL_STATES = ['delivered', 'cancelled', 'failed'];

const candidateSchema = new mongoose.Schema(
  {
    driverId: { type: String, required: true },
    distance: { type: Number, default: null },
  },
  { _id: false },
);

const rejectionSchema = new mongoose.Schema(
  {
    driverId: { type: String, required: true },
    reason: {
      type: String,
      enum: ['declined', 'timeout', 'disconnected'],
      required: true,
    },
    round: { type: Number, default: 0 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    restaurantId: { type: String, required: true },

    state: {
      type: String,
      enum: [...ACTIVE_STATES, ...TERMINAL_STATES],
      default: 'searching',
      index: true,
    },

    /**
     * The enriched order (restaurant + customer + items) as it looked when the
     * order was placed. Stored so that re-offering to the next driver costs no
     * further calls to the restaurant and user services -- an order rejected by
     * six drivers would otherwise refetch the same two documents twelve times.
     */
    snapshot: { type: mongoose.Schema.Types.Mixed },

    candidates: { type: [candidateSchema], default: [] },
    currentIndex: { type: Number, default: 0 },

    /**
     * The one offer that is open right now. Cleared the moment it is answered,
     * expires, or the order is claimed.
     */
    currentOffer: {
      driverId: { type: String, default: null },
      offerToken: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },

    rejections: { type: [rejectionSchema], default: [] },

    /** Completed sweeps through the candidate list. */
    round: { type: Number, default: 0 },

    driverId: { type: String, default: null, index: true },
    deliveryId: { type: String, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

/** The boot sweep and the busy-driver check both read by state. */
deliveryAssignmentSchema.index({ state: 1, 'currentOffer.expiresAt': 1 });
deliveryAssignmentSchema.index({ driverId: 1, state: 1 });

module.exports = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
module.exports.ACTIVE_STATES = ACTIVE_STATES;
module.exports.TERMINAL_STATES = TERMINAL_STATES;
