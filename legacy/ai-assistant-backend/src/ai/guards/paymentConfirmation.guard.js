const AssistantError = require('../errors/AssistantError');

function verifyPaymentConfirmation(booking, user, paymentRef) {
  if (!booking) {
    throw new AssistantError('BOOKING_NOT_FOUND', 'Target booking was not found.', null, 404);
  }

  if (String(booking.userId) !== String(user._id)) {
    throw new AssistantError('FORBIDDEN', 'Cannot confirm payment for another user’s booking.', null, 403);
  }

  if (booking.status === 'CONFIRMED') {
    throw new AssistantError('ALREADY_PAID', 'This booking has already been paid and confirmed.', null, 409);
  }

  if (booking.status !== 'HELD') {
    throw new AssistantError('INVALID_BOOKING_STATUS', `Cannot pay for booking with status ${booking.status}.`);
  }

  if (new Date() > new Date(booking.holdExpiresAt)) {
    throw new AssistantError('HOLD_EXPIRED', 'The 10-minute hold for this booking has expired. Please re-book.');
  }

  if (!paymentRef || typeof paymentRef !== 'string' || paymentRef.length < 5) {
    throw new AssistantError('INVALID_PAYMENT_REF', 'Payment reference must be verified and non-empty.');
  }

  return true;
}

module.exports = { verifyPaymentConfirmation };

