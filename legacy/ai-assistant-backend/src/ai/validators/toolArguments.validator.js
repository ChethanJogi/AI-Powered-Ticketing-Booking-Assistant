const AssistantError = require('../errors/AssistantError');
const { validateObjectId } = require('./resource.validator');

function validateToolArguments(toolName, args) {
  if (!args || typeof args !== 'object') {
    throw new AssistantError('INVALID_TOOL_ARGUMENTS', `Arguments for tool ${toolName} must be an object.`);
  }

  switch (toolName) {
    case 'check_availability': {
      if (!args.eventId) {
        throw new AssistantError('MISSING_ARGUMENT', 'check_availability requires eventId.');
      }
      validateObjectId(args.eventId, 'Event');
      return { eventId: String(args.eventId) };
    }

    case 'prepare_booking': {
      if (!args.eventId) {
        throw new AssistantError('MISSING_ARGUMENT', 'prepare_booking requires eventId.');
      }
      validateObjectId(args.eventId, 'Event');

      const qty = parseInt(args.quantity, 10);
      if (isNaN(qty) || qty < 1 || qty > 10) {
        throw new AssistantError('INVALID_QUANTITY', 'Ticket quantity must be an integer between 1 and 10.');
      }

      return {
        eventId: String(args.eventId),
        quantity: qty,
        teamName: args.teamName ? String(args.teamName).trim() : '',
        attendees: Array.isArray(args.attendees) ? args.attendees.map(String) : [],
      };
    }

    case 'create_booking': {
      if (!args.actionId) {
        throw new AssistantError('MISSING_ARGUMENT', 'create_booking requires actionId.');
      }
      return { actionId: String(args.actionId) };
    }

    case 'confirm_booking': {
      if (!args.bookingId) {
        throw new AssistantError('MISSING_ARGUMENT', 'confirm_booking requires bookingId.');
      }
      validateObjectId(args.bookingId, 'Booking');
      return {
        bookingId: String(args.bookingId),
        paymentRef: args.paymentRef ? String(args.paymentRef) : 'sandbox_verified',
      };
    }

    case 'get_booking': {
      if (!args.bookingId) {
        throw new AssistantError('MISSING_ARGUMENT', 'get_booking requires bookingId.');
      }
      validateObjectId(args.bookingId, 'Booking');
      return { bookingId: String(args.bookingId) };
    }

    case 'prepare_cancellation': {
      if (!args.bookingId) {
        throw new AssistantError('MISSING_ARGUMENT', 'prepare_cancellation requires bookingId.');
      }
      validateObjectId(args.bookingId, 'Booking');
      return { bookingId: String(args.bookingId) };
    }

    case 'cancel_booking': {
      if (!args.actionId) {
        throw new AssistantError('MISSING_ARGUMENT', 'cancel_booking requires actionId.');
      }
      return { actionId: String(args.actionId) };
    }

    default:
      throw new AssistantError('UNKNOWN_TOOL', `Unrecognized tool name: ${toolName}`);
  }
}

module.exports = { validateToolArguments };

