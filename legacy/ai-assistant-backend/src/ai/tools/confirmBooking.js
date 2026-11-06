const ticketingAdapter = require('../services/ticketingAdapter');
const { verifyPaymentConfirmation } = require('../guards/paymentConfirmation.guard');

async function confirmBookingTool(args, context) {
  const { user } = context;
  const booking = await ticketingAdapter.getBooking(args.bookingId, user._id);
  verifyPaymentConfirmation(booking, user, args.paymentRef);

  const confirmed = await ticketingAdapter.confirmPayment(args.bookingId, args.paymentRef);
  return {
    success: true,
    data: {
      bookingId: String(confirmed._id),
      status: confirmed.status,
      ticketCode: confirmed.ticketCode,
      message: 'Booking confirmed and tickets issued successfully.',
    },
  };
}

module.exports = confirmBookingTool;

