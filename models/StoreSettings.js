const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['automatic', 'manual'],
      default: 'automatic'
    },
    manualState: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    openTime: {
      type: String,
      default: '09:00'
    },
    closeTime: {
      type: String,
      default: '21:00'
    },
    openDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6]
    },
    autoBookingWithStore: {
      type: Boolean,
      default: false
    },
    bookingOpen: {
      type: Boolean,
      default: true
    },
    isOpen: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    bufferCommands: false
  }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
