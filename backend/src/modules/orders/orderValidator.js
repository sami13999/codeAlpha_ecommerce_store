function validateCheckout(body = {}) {
  const errors = [];
  const {
    shipping_name,
    shipping_phone,
    shipping_address_line1,
    shipping_city
  } = body;

  if (!shipping_name || typeof shipping_name !== 'string' || shipping_name.trim().length < 2) {
    errors.push('Full recipient name is required.');
  }

  if (!shipping_phone || typeof shipping_phone !== 'string' || shipping_phone.trim().length < 7) {
    errors.push('A valid phone number is required for delivery contact.');
  }

  if (!shipping_address_line1 || typeof shipping_address_line1 !== 'string' || shipping_address_line1.trim().length < 5) {
    errors.push('Street address is required (minimum 5 characters).');
  }

  if (!shipping_city || typeof shipping_city !== 'string' || shipping_city.trim().length < 2) {
    errors.push('City name is required.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateCheckout
};
