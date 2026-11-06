const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check live ticket availability, seats left, venue, date, and price for a specific event.',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'The unique ID of the event to check.',
          },
        },
        required: ['eventId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_booking',
      description: 'Prepare a booking proposal for user confirmation. Verifies capacity and pricing, and generates an action approval request.',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'The unique ID of the event.',
          },
          quantity: {
            type: 'integer',
            description: 'Number of tickets requested (1-10).',
          },
          teamName: {
            type: 'string',
            description: 'Optional team name for group or hackathon booking.',
          },
          attendees: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional names of additional attendees.',
          },
        },
        required: ['eventId', 'quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Execute a pre-approved booking. Requires a valid, user-approved action ID.',
      parameters: {
        type: 'object',
        properties: {
          actionId: {
            type: 'string',
            description: 'The approved action ID returned by prepare_booking.',
          },
        },
        required: ['actionId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_booking',
      description: 'Confirm payment and finalize tickets for a held booking.',
      parameters: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'The booking ID currently in HELD status.',
          },
          paymentRef: {
            type: 'string',
            description: 'Verified payment confirmation reference.',
          },
        },
        required: ['bookingId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_booking',
      description: 'Retrieve details, status, and tickets for a user’s booking.',
      parameters: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'The unique booking ID.',
          },
        },
        required: ['bookingId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_cancellation',
      description: 'Prepare a cancellation request. Verifies ownership and computes refund according to event cancellation policy.',
      parameters: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'The booking ID to be cancelled.',
          },
        },
        required: ['bookingId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_booking',
      description: 'Execute an approved booking cancellation.',
      parameters: {
        type: 'object',
        properties: {
          actionId: {
            type: 'string',
            description: 'The approved action ID for cancellation.',
          },
        },
        required: ['actionId'],
      },
    },
  },
];

module.exports = toolDefinitions;

