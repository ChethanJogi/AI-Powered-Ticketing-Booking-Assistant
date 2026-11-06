const ticketingAdapter = require('../services/ticketingAdapter');
const actionApprovalService = require('../services/actionApprovalService');
const AssistantError = require('../errors/AssistantError');

async function prepareBookingTool(args, context) {
  const { user, conversationId } = context;
  if (!user) {
    throw new AssistantError('UNAUTHORIZED', 'You must be signed in to book tickets.', null, 401);
  }

  const availability = await ticketingAdapter.checkSeats(args.eventId);
  if (availability.isSoldOut) {
    throw new AssistantError('SOLD_OUT', 'This event is sold out.');
  }

  if (args.quantity > availability.seatsLeft) {
    throw new AssistantError(
      'NOT_ENOUGH_SEATS',
      `Requested ${args.quantity} tickets, but only ${availability.seatsLeft} are available.`
    );
  }

  const event = await ticketingAdapter.getEvent(args.eventId);
  const unitPrice = event.price;
  const totalPrice = unitPrice * args.quantity;

  const payload = {
    eventId: String(event._id),
    eventTitle: event.title,
    eventDate: event.date,
    venue: event.venue,
    quantity: args.quantity,
    unitPrice,
    totalPrice,
    teamName: args.teamName || '',
    attendees: args.attendees || [],
    cancellationPolicy: event.cancellationPolicy,
  };

  const action = await actionApprovalService.createAction({
    conversationId,
    userId: user._id,
    actionType: 'BOOKING',
    payload,
  });

  return {
    success: true,
    requiresApproval: true,
    actionId: action.actionId,
    expiresAt: action.expiresAt,
    bookingDetails: payload,
    message: `I have prepared a booking for ${args.quantity} ticket(s) to "${event.title}" for a total of ₹${totalPrice}. Please confirm your approval to proceed.`,
  };
}

module.exports = prepareBookingTool;

