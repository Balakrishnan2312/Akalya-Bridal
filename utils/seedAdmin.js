const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const Admin = require('../models/Admin');
const GalleryImage = require('../models/GalleryImage');
const StoreSettings = require('../models/StoreSettings');

const seedAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const name = process.env.ADMIN_NAME || 'Akalya Admin';
      const email = process.env.ADMIN_EMAIL || 'admin@akalyasbridal.com';
      const rawPassword = process.env.ADMIN_PASSWORD || 'ChangeThisStrongPassword';

      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      await Admin.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'admin'
      });
      console.log(`[SEED] Created default admin user: ${email}`);
    } else {
      console.log('[SEED] Admin user already exists in database.');
    }
  } catch (err) {
    console.error(`[SEED] Error seeding admin user: ${err.message}`);
  }
};

const seedInitialGallery = async () => {
  try {
    const count = await GalleryImage.countDocuments();
    if (count === 0) {
      const imagesDbPath = path.join(__dirname, '..', 'images.json');
      let initialImages = [];

      if (fs.existsSync(imagesDbPath)) {
        try {
          const fileData = fs.readFileSync(imagesDbPath, 'utf8');
          const parsed = JSON.parse(fileData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialImages = parsed.map(item => ({
              title: item.title || 'Studio Photo',
              category: item.cat || item.category || 'all',
              imageUrl: item.img || item.imageUrl || '',
              imagePath: (item.img && item.img.startsWith('/uploads/')) ? item.img : ''
            }));
          }
        } catch (e) {
          console.warn('[SEED] Could not parse images.json for seeding:', e.message);
        }
      }

      if (initialImages.length === 0) {
        // Fallback seed images
        initialImages = [
          { imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=900&auto=format&fit=crop', category: 'bridal', title: 'Classic Bridal Glam' },
          { imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=900&auto=format&fit=crop', category: 'engagement', title: 'Ring Ceremony Glow' },
          { imageUrl: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=900&auto=format&fit=crop', category: 'bridal', title: 'Traditional Bridal Look' },
          { imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=900&auto=format&fit=crop', category: 'party', title: 'Festive Party Glam' },
          { imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=900&auto=format&fit=crop', category: 'party', title: 'Soft Glam Edit' }
        ];
      }

      await GalleryImage.insertMany(initialImages);
      console.log(`[SEED] Seeded ${initialImages.length} gallery images into MongoDB.`);
    }
  } catch (err) {
    console.error(`[SEED] Error seeding gallery images: ${err.message}`);
  }
};

const seedInitialStoreSettings = async () => {
  try {
    const count = await StoreSettings.countDocuments();
    if (count === 0) {
      const storeDbPath = path.join(__dirname, '..', 'store.json');
      let defaultConfig = {
        mode: 'automatic',
        manualState: 'open',
        openTime: '09:00',
        closeTime: '21:00',
        openDays: [1, 2, 3, 4, 5, 6],
        autoBookingWithStore: false,
        bookingOpen: true,
        isOpen: true
      };

      if (fs.existsSync(storeDbPath)) {
        try {
          const fileData = fs.readFileSync(storeDbPath, 'utf8');
          const parsed = JSON.parse(fileData);
          defaultConfig = { ...defaultConfig, ...parsed };
        } catch (e) {
          console.warn('[SEED] Could not parse store.json for seeding:', e.message);
        }
      }

      await StoreSettings.create(defaultConfig);
      console.log('[SEED] Seeded store settings into MongoDB.');
    }
  } catch (err) {
    console.error(`[SEED] Error seeding store settings: ${err.message}`);
  }
};

module.exports = {
  seedAdmin,
  seedInitialGallery,
  seedInitialStoreSettings
};
