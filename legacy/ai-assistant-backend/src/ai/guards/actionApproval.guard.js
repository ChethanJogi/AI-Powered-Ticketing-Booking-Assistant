const AssistantError = require('../errors/AssistantError');

function verifyActionApproval(action, expectedType, user) {
  if (!action) {
    throw new AssistantError('ACTION_NOT_FOUND', 'Requested approval action does not exist.', null, 404);
  }

  if (String(action.userId) !== String(user._id)) {
    throw new AssistantError('FORBIDDEN_ACTION', 'You do not have permission to execute this action.', null, 403);
  }

  if (action.actionType !== expectedType) {
    throw new AssistantError(
      'ACTION_TYPE_MISMATCH',
      `Expected action type ${expectedType}, but found ${action.actionType}.`
    );
  }

  if (action.status === 'EXECUTED') {
    throw new AssistantError('DUPLICATE_ACTION', 'This action has already been executed.', null, 409);
  }

  if (action.status === 'REJECTED') {
    throw new AssistantError('ACTION_REJECTED', 'This action was rejected by the user and cannot be executed.');
  }

  if (action.status === 'EXPIRED' || (action.expiresAt && new Date() > new Date(action.expiresAt))) {
    throw new AssistantError('ACTION_EXPIRED', 'This action proposal has expired. Please initiate a new request.');
  }

  if (action.status !== 'APPROVED') {
    throw new AssistantError(
      'ACTION_NOT_APPROVED',
      'This action requires explicit user approval before execution.'
    );
  }

  return true;
}

module.exports = { verifyActionApproval };

