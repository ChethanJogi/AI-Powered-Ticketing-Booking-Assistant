const ticketingAdapter = require('../services/ticketingAdapter');

async function getBookingTool(args, context) {
  const { user } = context;
  const booking = await ticketingAdapter.getBooking(args.bookingId, user ? user._id : null);
  return {
    success: true,
    data: {
      bookingId: String(booking._id),
      eventTitle: booking.eventTitle,
      eventDate: booking.eventDate,
      venue: booking.venue,
      quantity: booking.qty,
      amount: booking.amount,
      status: booking.status,
      ticketCode: booking.ticketCode || null,
      cancellationPolicy: booking.cancellationPolicy,
    },
  };
}

module.exports = getBookingTool;

