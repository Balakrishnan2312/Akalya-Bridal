require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Utilities and Seeders
const { connectDB, isDbConnected } = require('./utils/db');
const { seedAdmin, seedInitialGallery, seedInitialStoreSettings } = require('./utils/seedAdmin');

// Middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { protectAdmin } = require('./middleware/authMiddleware');

// Route Modules
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const galleryRoutesModule = require('./routes/galleryRoutes');
const storeRoutesModule = require('./routes/storeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
console.log('[INIT] Enabling CORS and body parsers...');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ================= ROUTE MOUNTING =================

// Health Route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    server: "running",
    database: isDbConnected() ? "connected" : "offline"
  });
});

// 1. Auth Routes
app.use('/api/auth', authRoutes);
// Legacy Auth compatibility aliases
app.use('/api/login', authRoutes);
app.use('/login', authRoutes);

// 2. Booking Routes
app.use('/api/bookings', bookingRoutes);

// 3. Gallery Routes
app.use('/api/gallery', galleryRoutesModule.router);
// Legacy Gallery compatibility aliases
app.get('/images', galleryRoutesModule.getGallery);
app.post('/upload', protectAdmin, (req, res, next) => {
  galleryRoutesModule.upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, galleryRoutesModule.uploadImage);
app.put('/image/:id', protectAdmin, galleryRoutesModule.updateImage);
app.delete('/image/:id', protectAdmin, galleryRoutesModule.deleteImage);

// 4. Store Routes
app.use('/api/store', storeRoutesModule.router);
// Legacy Store compatibility aliases
app.get('/status', storeRoutesModule.getStatus);
app.get('/store-status', storeRoutesModule.getStatus);
app.post('/store-status', protectAdmin, storeRoutesModule.toggleStoreStatus);
app.post('/toggle-store', protectAdmin, storeRoutesModule.toggleStoreStatus);
app.post('/toggle-booking', protectAdmin, storeRoutesModule.toggleBookingStatus);
app.post('/api/store-settings', protectAdmin, storeRoutesModule.saveStoreSettings);

// Static files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(__dirname));

// Error Middleware
app.use(notFound);
app.use(errorHandler);

// Start server
async function startServer() {
  const connected = await connectDB();
  if (connected) {
    await seedAdmin();
    await seedInitialGallery();
    await seedInitialStoreSettings();
  } else {
    console.warn('[DB] Server initialized, but MongoDB connection is currently offline.');
  }

  app.listen(PORT, () => {
    console.log(`[START] =============================================`);
    console.log(`[START] Server running on port ${PORT}`);
    console.log(`[START] Open Admin: http://localhost:${PORT}/admin.html`);
    console.log(`[START] Open Website: http://localhost:${PORT}/`);
    console.log(`[START] =============================================`);
  });
}

startServer();
