const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required']
    },
    service: {
      type: String,
      required: [true, 'Service selection is required'],
      trim: true
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending'
    },
    adminNotes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    bufferCommands: false
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
