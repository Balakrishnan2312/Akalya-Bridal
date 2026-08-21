const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const StoreSettings = require('../models/StoreSettings');
const { protectAdmin } = require('../middleware/authMiddleware');

let inMemoryStoreConfig = {
  mode: 'automatic',
  manualState: 'open',
  openTime: '09:00',
  closeTime: '21:00',
  openDays: [1, 2, 3, 4, 5, 6],
  autoBookingWithStore: false,
  isOpen: true,
  bookingOpen: true
};

const getOrInitSettingsDoc = async () => {
  if (mongoose.connection.readyState !== 1) {
    return inMemoryStoreConfig;
  }
  let doc = await StoreSettings.findOne();
  if (!doc) {
    doc = await StoreSettings.create(inMemoryStoreConfig);
  }
  return doc;
};

const computeStoreStatus = (doc) => {
  const config = doc.toObject ? doc.toObject() : { ...doc };

  if (config.mode === 'manual') {
    config.isOpen = (config.manualState === 'open');
  } else {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    const isDayOpen = Array.isArray(config.openDays) ? config.openDays.includes(currentDay) : true;
    const isTimeOpen = (currentTimeStr >= config.openTime && currentTimeStr < config.closeTime);

    config.isOpen = (isDayOpen && isTimeOpen);
  }

  if (config.autoBookingWithStore && config.mode === 'automatic') {
    config.bookingOpen = config.isOpen;
  }

  return config;
};

// GET /api/store/status & /status - Public store and booking status
const getStatus = async (req, res) => {
  try {
    const doc = await getOrInitSettingsDoc();
    const computed = computeStoreStatus(doc);
    return res.json(computed);
  } catch (err) {
    return res.json(computeStoreStatus(inMemoryStoreConfig));
  }
};

// POST /api/store/toggle-store & /toggle-store - Protected toggle store status
const toggleStoreStatus = async (req, res) => {
  try {
    const doc = await getOrInitSettingsDoc();
    const currentComputed = computeStoreStatus(doc);

    const isCurrentlyOpen = currentComputed.isOpen;

    if (isCurrentlyOpen) {
      // Manually closing store -> set manual override to 'closed'
      if (doc.save && mongoose.connection.readyState === 1) {
        doc.manualState = 'closed';
        doc.mode = 'manual';
        await doc.save();
      } else {
        inMemoryStoreConfig.manualState = 'closed';
        inMemoryStoreConfig.mode = 'manual';
      }
    } else {
      // Manually opening store -> set manual override to 'open'
      if (doc.save && mongoose.connection.readyState === 1) {
        doc.manualState = 'open';
        doc.mode = 'manual';
        await doc.save();
      } else {
        inMemoryStoreConfig.manualState = 'open';
        inMemoryStoreConfig.mode = 'manual';
      }
    }

    const updated = computeStoreStatus(doc.save ? doc : inMemoryStoreConfig);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error toggling store status.' });
  }
};

// POST /api/store/toggle-booking & /toggle-booking - Protected toggle booking availability
const toggleBookingStatus = async (req, res) => {
  try {
    const doc = await getOrInitSettingsDoc();
    if (doc.save && mongoose.connection.readyState === 1) {
      doc.bookingOpen = !doc.bookingOpen;
      await doc.save();
    } else {
      inMemoryStoreConfig.bookingOpen = !inMemoryStoreConfig.bookingOpen;
    }

    const updated = computeStoreStatus(doc.save ? doc : inMemoryStoreConfig);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error toggling booking status.' });
  }
};

// POST /api/store/settings & /api/store-settings - Protected update schedule settings
const saveStoreSettings = async (req, res) => {
  try {
    const doc = await getOrInitSettingsDoc();

    const {
      mode,
      manualState,
      openTime,
      closeTime,
      openDays,
      autoBookingWithStore,
      bookingOpen
    } = req.body;

    if (doc.save && mongoose.connection.readyState === 1) {
      if (mode !== undefined) doc.mode = mode;
      if (manualState !== undefined) doc.manualState = manualState;
      if (openTime !== undefined) doc.openTime = openTime;
      if (closeTime !== undefined) doc.closeTime = closeTime;
      if (openDays !== undefined && Array.isArray(openDays)) doc.openDays = openDays;
      if (autoBookingWithStore !== undefined) doc.autoBookingWithStore = autoBookingWithStore;
      if (bookingOpen !== undefined) doc.bookingOpen = bookingOpen;
      await doc.save();
    } else {
      if (mode !== undefined) inMemoryStoreConfig.mode = mode;
      if (manualState !== undefined) inMemoryStoreConfig.manualState = manualState;
      if (openTime !== undefined) inMemoryStoreConfig.openTime = openTime;
      if (closeTime !== undefined) inMemoryStoreConfig.closeTime = closeTime;
      if (openDays !== undefined && Array.isArray(openDays)) inMemoryStoreConfig.openDays = openDays;
      if (autoBookingWithStore !== undefined) inMemoryStoreConfig.autoBookingWithStore = autoBookingWithStore;
      if (bookingOpen !== undefined) inMemoryStoreConfig.bookingOpen = bookingOpen;
    }

    const updated = computeStoreStatus(doc.save ? doc : inMemoryStoreConfig);
    res.json({
      success: true,
      message: 'Store settings saved successfully.',
      status: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving store settings.' });
  }
};

// Routes definition
router.get('/status', getStatus);
router.post('/toggle-store', protectAdmin, toggleStoreStatus);
router.post('/toggle-booking', protectAdmin, toggleBookingStatus);
router.post('/settings', protectAdmin, saveStoreSettings);

module.exports = {
  router,
  getStatus,
  toggleStoreStatus,
  toggleBookingStatus,
  saveStoreSettings
};
