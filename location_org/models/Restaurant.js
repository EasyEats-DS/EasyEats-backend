const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  placeId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
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
  address: String,
  cuisineType: {
    type: [String],
    enum: ['Italian', 'Chinese', 'Indian', 'Fast Food', 'Mexican', 'Japanese', 'Pizza' , 'Other']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  openingHours: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index
restaurantSchema.index({ position: '2dsphere' });

// Static methods
restaurantSchema.statics.findNearby = function(coordinates, maxDistance = 5000) {
  return this.find({
    position: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates
        },
        $maxDistance: maxDistance
      }
    }
  });
};

module.exports = mongoose.model('Restaurant', restaurantSchema);