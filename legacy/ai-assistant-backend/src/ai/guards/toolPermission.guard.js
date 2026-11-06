const AssistantError = require('../errors/AssistantError');

const AUTH_REQUIRED_TOOLS = [
  'get_booking',
  'prepare_booking',
  'create_booking',
  'prepare_cancellation',
  'cancel_booking',
  'confirm_booking',
];

function checkToolPermission(toolName, user) {
  if (AUTH_REQUIRED_TOOLS.includes(toolName) && !user) {
    throw new AssistantError(
      'UNAUTHORIZED_TOOL_USE',
      `You must be logged in to execute ${toolName}. Please log in to proceed.`,
      null,
      401
    );
  }
  return true;
}

module.exports = { checkToolPermission };

