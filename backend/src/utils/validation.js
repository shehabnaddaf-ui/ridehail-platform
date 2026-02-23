/**
 * Validation utilities
 */

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Validate phone number format
 */
function validatePhone(phone) {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { valid: false, error: 'Phone number must be between 10 and 15 digits' };
  }

  return { valid: true, cleaned };
}

/**
 * Validate coordinates
 */
function validateCoordinates(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Invalid latitude' };
  }

  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Invalid longitude' };
  }

  return { valid: true, lat: latitude, lng: longitude };
}

/**
 * Validate trip distance
 */
function validateTripDistance(distanceKm) {
  const distance = parseFloat(distanceKm);

  if (isNaN(distance) || distance < 0.1) {
    return { valid: false, error: 'Trip distance too short (minimum 0.1 km)' };
  }

  if (distance > 500) {
    return { valid: false, error: 'Trip distance too long (maximum 500 km)' };
  }

  return { valid: true, distance };
}

module.exports = {
  validatePassword,
  validatePhone,
  validateCoordinates,
  validateTripDistance,
};
