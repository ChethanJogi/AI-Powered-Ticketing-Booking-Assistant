const ticketingAdapter = require('../services/ticketingAdapter');
const actionApprovalService = require('../services/actionApprovalService');
const AssistantError = require('../errors/AssistantError');

async function prepareCancellationTool(args, context) {
  const { user, conversationId } = context;
  if (!user) {
    throw new AssistantError('UNAUTHORIZED', 'You must be signed in to manage bookings.', null, 401);
  }

  const booking = await ticketingAdapter.getBooking(args.bookingId, user._id);
  if (booking.status !== 'CONFIRMED' && booking.status !== 'HELD') {
    throw new AssistantError(
      'NON_CANCELLABLE_STATUS',
      `Booking status is ${booking.status} and cannot be cancelled.`
    );
  }

  const payload = {
    bookingId: String(booking._id),
    eventTitle: booking.eventTitle,
    quantity: booking.qty,
    amountPaid: booking.amount,
    status: booking.status,
    policySummary: booking.cancellationPolicy,
    estimatedRefund: booking.status === 'CONFIRMED' ? booking.amount : 0,
  };

  const action = await actionApprovalService.createAction({
    conversationId,
    userId: user._id,
    actionType: 'CANCELLATION',
    payload,
  });

  return {
    success: true,
    requiresApproval: true,
    actionId: action.actionId,
    expiresAt: action.expiresAt,
    cancellationDetails: payload,
    message: `I have prepared the cancellation request for "${booking.eventTitle}". Refund policy: "${booking.cancellationPolicy}". Please confirm to cancel this booking.`,
  };
}

module.exports = prepareCancellationTool;

