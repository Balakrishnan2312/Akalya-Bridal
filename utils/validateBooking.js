const validateBookingInput = (data) => {
  const errors = [];

  const { customerName, phone, eventDate, service } = data;

  if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
    errors.push('Full Name is required (at least 2 characters).');
  }

  // Clean phone string by stripping spaces/hyphens
  const cleanPhone = phone ? String(phone).replace(/[\s\-\+]/g, '') : '';
  // Support 10-digit Indian mobile number format (starts with 6-9, or 10 digits starting with 6-9 when 91 prefix is stripped)
  const phoneDigits = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone.slice(2) : cleanPhone;
  
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(phoneDigits)) {
    errors.push('Please enter a valid 10-digit mobile number.');
  }

  if (!service || typeof service !== 'string' || service.trim() === '') {
    errors.push('Please select a service.');
  }

  if (!eventDate) {
    errors.push('Event date is required.');
  } else {
    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Invalid event date format.');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(parsedDate);
      selected.setHours(0, 0, 0, 0);

      if (selected < today) {
        errors.push('Event date cannot be in the past. Please select today or a future date.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanedData: {
      customerName: customerName ? customerName.trim() : '',
      phone: phoneDigits,
      email: data.email ? String(data.email).trim().toLowerCase() : '',
      eventDate: eventDate ? new Date(eventDate) : null,
      service: service ? service.trim() : '',
      message: data.message ? String(data.message).trim() : ''
    }
  };
};

module.exports = { validateBookingInput };
