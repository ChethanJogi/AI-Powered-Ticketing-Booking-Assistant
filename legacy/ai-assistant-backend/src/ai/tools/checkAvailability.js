const ticketingAdapter = require('../services/ticketingAdapter');

async function checkAvailabilityTool(args) {
  const result = await ticketingAdapter.checkSeats(args.eventId);
  return {
    success: true,
    data: result,
  };
}

module.exports = checkAvailabilityTool;

