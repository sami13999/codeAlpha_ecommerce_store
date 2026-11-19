function validateRegister(body = {}) {
  const errors = [];
  const { full_name, email, password, phone } = body;

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters.');
  }

  if (phone !== undefined && phone !== null && phone !== '') {
    if (typeof phone !== 'string' || phone.trim().length < 7 || phone.trim().length > 30) {
      errors.push('Phone number must be between 7 and 30 characters.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateLogin(body = {}) {
  const errors = [];
  const { email, password } = body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateRegister,
  validateLogin
};
