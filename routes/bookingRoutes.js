const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const StoreSettings = require('../models/StoreSettings');
const { protectAdmin } = require('../middleware/authMiddleware');
const { validateBookingInput } = require('../utils/validateBooking');

let inMemoryBookings = [];

const getEffectiveStoreStatus = async () => {
  if (mongoose.connection.readyState !== 1) {
    return { settings: null, isOpen: true, bookingOpen: true };
  }

  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({});
  }

  let isOpen = settings.isOpen;
  if (settings.mode === 'automatic') {
    const now = new Date();
    const currentDay = now.getDay();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const isDayOpen = Array.isArray(settings.openDays) ? settings.openDays.includes(currentDay) : true;
    const isTimeOpen = (timeStr >= settings.openTime && timeStr < settings.closeTime);

    isOpen = isDayOpen && isTimeOpen;
  } else {
    isOpen = (settings.manualState === 'open');
  }

  let bookingOpen = settings.bookingOpen;
  if (settings.autoBookingWithStore && settings.mode === 'automatic') {
    bookingOpen = isOpen;
  }

  return { settings, isOpen, bookingOpen };
};

// POST /api/bookings - Create new booking
router.post('/', async (req, res) => {
  try {
    const { bookingOpen } = await getEffectiveStoreStatus();

    if (!bookingOpen) {
      return res.status(400).json({
        success: false,
        message: 'Online bookings are currently closed. Please contact us directly via phone or WhatsApp.'
      });
    }

    const { isValid, errors, cleanedData } = validateBookingInput(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: errors.join(' '),
        errors
      });
    }

    let newBooking;
    if (mongoose.connection.readyState === 1) {
      newBooking = await Booking.create({
        customerName: cleanedData.customerName,
        phone: cleanedData.phone,
        email: cleanedData.email,
        eventDate: cleanedData.eventDate,
        service: cleanedData.service,
        message: cleanedData.message,
        status: 'pending'
      });
    } else {
      newBooking = {
        _id: 'bk_' + Date.now(),
        customerName: cleanedData.customerName,
        phone: cleanedData.phone,
        email: cleanedData.email,
        eventDate: cleanedData.eventDate,
        service: cleanedData.service,
        message: cleanedData.message,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      inMemoryBookings.unshift(newBooking);
    }

    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully. We will contact you shortly.',
      bookingId: newBooking._id,
      booking: newBooking
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error while processing your appointment request.'
    });
  }
});

// GET /api/bookings/stats/summary
router.get('/stats/summary', protectAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const total = await Booking.countDocuments();
      const pending = await Booking.countDocuments({ status: 'pending' });
      const confirmed = await Booking.countDocuments({ status: 'confirmed' });
      const completed = await Booking.countDocuments({ status: 'completed' });
      const cancelled = await Booking.countDocuments({ status: 'cancelled' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = await Booking.countDocuments({
        eventDate: { $gte: today },
        status: { $in: ['pending', 'confirmed'] }
      });

      return res.json({
        success: true,
        stats: { total, pending, confirmed, completed, cancelled, upcoming }
      });
    }

    // In-memory stats fallback
    const total = inMemoryBookings.length;
    const pending = inMemoryBookings.filter(b => b.status === 'pending').length;
    const confirmed = inMemoryBookings.filter(b => b.status === 'confirmed').length;
    const completed = inMemoryBookings.filter(b => b.status === 'completed').length;
    const cancelled = inMemoryBookings.filter(b => b.status === 'cancelled').length;
    const upcoming = pending + confirmed;

    res.json({
      success: true,
      stats: { total, pending, confirmed, completed, cancelled, upcoming }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving summary statistics.' });
  }
});

// GET /api/bookings - Paginated bookings list
router.get('/', protectAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }

      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { customerName: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { service: searchRegex }
        ];
      }

      const totalBookings = await Booking.countDocuments(query);
      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(totalBookings / limit) || 1;

      return res.json({
        success: true,
        count: bookings.length,
        totalBookings,
        currentPage: page,
        totalPages,
        bookings
      });
    }

    // In-memory pagination fallback
    let filtered = [...inMemoryBookings];

    if (status && status !== 'all') {
      filtered = filtered.filter(b => b.status === status);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(b =>
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.phone && b.phone.includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.service && b.service.toLowerCase().includes(q))
      );
    }

    const totalBookings = filtered.length;
    const bookings = filtered.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalBookings / limit) || 1;

    res.json({
      success: true,
      count: bookings.length,
      totalBookings,
      currentPage: page,
      totalPages,
      bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving bookings.' });
  }
});

// GET /api/bookings/:id
router.get('/:id', protectAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findById(id);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
      return res.json({ success: true, booking });
    }

    const booking = inMemoryBookings.find(b => String(b._id) === String(id));
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching booking detail.' });
  }
});

// PATCH /api/bookings/:id
router.patch('/:id', protectAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { status, adminNotes } = req.body;

    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findById(id);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

      if (status) booking.status = status;
      if (adminNotes !== undefined) booking.adminNotes = String(adminNotes).trim();

      await booking.save();
      return res.json({ success: true, message: 'Booking updated.', booking });
    }

    const booking = inMemoryBookings.find(b => String(b._id) === String(id));
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (status) booking.status = status;
    if (adminNotes !== undefined) booking.adminNotes = String(adminNotes).trim();

    res.json({ success: true, message: 'Booking updated.', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating booking.' });
  }
});

// DELETE /api/bookings/:id
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findById(id);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
      await Booking.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Booking deleted.' });
    }

    const index = inMemoryBookings.findIndex(b => String(b._id) === String(id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Booking not found.' });

    inMemoryBookings.splice(index, 1);
    res.json({ success: true, message: 'Booking deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting booking.' });
  }
});

module.exports = router;
