const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const GalleryImage = require('../models/GalleryImage');
const { protectAdmin } = require('../middleware/authMiddleware');
const { ensureDbConnected } = require('../utils/db');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `gallery-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPG, JPEG, PNG, WEBP, GIF) under 5MB are allowed!'));
  }
});

const formatImageObj = (doc) => ({
  id: doc._id.toString(),
  _id: doc._id.toString(),
  img: doc.imageUrl,
  imageUrl: doc.imageUrl,
  cat: doc.category,
  category: doc.category,
  title: doc.title,
  createdAt: doc.createdAt
});

const fallbackImages = [
  { id: "1", _id: "1", img: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=900&auto=format&fit=crop', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=900&auto=format&fit=crop', cat: 'bridal', category: 'bridal', title: 'Classic Bridal Glam' },
  { id: "2", _id: "2", img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=900&auto=format&fit=crop', imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=900&auto=format&fit=crop', cat: 'engagement', category: 'engagement', title: 'Ring Ceremony Glow' },
  { id: "3", _id: "3", img: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=900&auto=format&fit=crop', imageUrl: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=900&auto=format&fit=crop', cat: 'bridal', category: 'bridal', title: 'Traditional Bridal Look' },
  { id: "4", _id: "4", img: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=900&auto=format&fit=crop', imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=900&auto=format&fit=crop', cat: 'party', category: 'party', title: 'Festive Party Glam' }
];

// GET /api/gallery & /images - Public get all images
const getGallery = async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      console.warn('[GALLERY] DB offline, serving fallback images');
      return res.json(fallbackImages);
    }
    const docs = await GalleryImage.find().sort({ createdAt: -1 });
    const formatted = docs.map(formatImageObj);
    return res.json(formatted.length > 0 ? formatted : fallbackImages);
  } catch (err) {
    console.warn('[GALLERY] DB error, serving fallback images:', err.message);
    return res.json(fallbackImages);
  }
};

// POST /api/gallery & /upload - Protected upload image
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file.' });
    }

    // Verify MongoDB connection BEFORE saving document
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      console.error('[GALLERY] MongoDB connection unavailable during gallery upload.');
      return res.status(500).json({
        success: false,
        message: 'Gallery upload failed: Database connection unavailable.'
      });
    }

    const title = req.body.title || 'Studio Photo';
    const category = req.body.category || 'all';

    const relativeUrlPath = `/uploads/${req.file.filename}`;
    const host = req.get('host');
    const protocol = req.protocol;
    const absoluteUrlPath = `${protocol}://${host}${relativeUrlPath}`;

    const newDoc = await GalleryImage.create({
      title,
      category,
      imageUrl: relativeUrlPath,
      imagePath: req.file.path
    });

    console.log(`[GALLERY] Uploaded image: ${newDoc._id} (${title})`);

    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully to the gallery!',
      imageUrl: absoluteUrlPath,
      image: formatImageObj(newDoc)
    });
  } catch (err) {
    console.error('[GALLERY] Exception uploading image:', err.message);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    const isDbErr = err.message && (err.message.includes('buffering') || err.message.includes('connect') || err.name === 'MongooseError');
    const responseMsg = isDbErr ? 'Gallery upload failed: Database connection unavailable.' : (err.message || 'Image upload failed.');
    res.status(500).json({ success: false, message: responseMsg });
  }
};

// PUT /api/gallery/:id & /image/:id - Protected update category
const updateImage = async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable.' });
    }

    const { id } = req.params;
    const { category, title } = req.body;

    const doc = await GalleryImage.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Image record not found.' });
    }

    if (category) doc.category = category;
    if (title) doc.title = title;

    await doc.save();
    console.log(`[GALLERY] Updated image ${id}: category=${doc.category}`);

    res.json({
      success: true,
      message: 'Image category updated successfully.',
      image: formatImageObj(doc)
    });
  } catch (err) {
    console.error('[GALLERY] Exception updating image:', err.message);
    res.status(500).json({ success: false, message: 'Error updating image.' });
  }
};

// DELETE /api/gallery/:id & /image/:id - Protected delete image
const deleteImage = async (req, res) => {
  try {
    const isConnected = await ensureDbConnected();
    if (!isConnected) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable.' });
    }

    const { id } = req.params;
    let doc = null;

    // 1. Check if ID is a valid Mongoose ObjectId before calling findById
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await GalleryImage.findById(id);
    }

    // 2. If not found by ObjectId, try finding by matching imageUrl
    if (!doc) {
      try {
        doc = await GalleryImage.findOne({
          $or: [
            { imageUrl: id },
            { imageUrl: { $regex: id, $options: 'i' } }
          ]
        });
      } catch (findErr) {
        doc = null;
      }
    }

    // 3. Clean up legacy images.json file if present
    const imagesJsonPath = path.join(__dirname, '..', 'images.json');
    let deletedFromLegacy = false;
    if (fs.existsSync(imagesJsonPath)) {
      try {
        const fileData = fs.readFileSync(imagesJsonPath, 'utf8');
        let parsed = JSON.parse(fileData);
        if (Array.isArray(parsed)) {
          const originalLen = parsed.length;
          parsed = parsed.filter(img => img.id !== id && img._id !== id && !img.img?.includes(id));
          if (parsed.length < originalLen) {
            fs.writeFileSync(imagesJsonPath, JSON.stringify(parsed, null, 2));
            deletedFromLegacy = true;
            console.log(`[GALLERY] Removed image ID ${id} from images.json`);
          }
        }
      } catch (e) {
        console.warn(`[GALLERY] Could not update images.json: ${e.message}`);
      }
    }

    if (!doc && !deletedFromLegacy) {
      return res.status(404).json({ success: false, message: 'Image record not found.' });
    }

    // 4. Safely delete physical file if image document was found
    if (doc) {
      let targetFilePath = null;
      if (doc.imagePath && fs.existsSync(doc.imagePath)) {
        targetFilePath = doc.imagePath;
      } else if (doc.imageUrl && doc.imageUrl.includes('/uploads/')) {
        const filename = path.basename(doc.imageUrl);
        targetFilePath = path.join(uploadsDir, filename);
      }

      if (targetFilePath && fs.existsSync(targetFilePath)) {
        try {
          fs.unlinkSync(targetFilePath);
          console.log(`[GALLERY] Deleted file at ${targetFilePath}`);
        } catch (e) {
          console.warn(`[GALLERY] Failed to delete file at ${targetFilePath}: ${e.message}`);
        }
      }

      await GalleryImage.findByIdAndDelete(doc._id);
      console.log(`[GALLERY] Deleted MongoDB gallery record ID: ${doc._id}`);
    }

    return res.json({
      success: true,
      message: 'Image deleted successfully.'
    });
  } catch (err) {
    console.error('[GALLERY] Exception deleting image:', err);
    return res.status(500).json({ success: false, message: 'Error deleting image.' });
  }
};

router.get('/', getGallery);

router.post('/', protectAdmin, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, uploadImage);

router.put('/:id', protectAdmin, updateImage);
router.delete('/:id', protectAdmin, deleteImage);

module.exports = {
  router,
  getGallery,
  uploadImage,
  updateImage,
  deleteImage,
  upload
};
