const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Image title is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'all'
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required']
    },
    imagePath: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    bufferCommands: false
  }
);

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
