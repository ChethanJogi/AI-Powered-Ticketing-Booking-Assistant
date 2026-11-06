const AssistantError = require('../errors/AssistantError');
const mongoose = require('mongoose');

function validateChatRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new AssistantError('INVALID_REQUEST', 'Request body must be an object.');
  }

  const { message, conversationId } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new AssistantError('EMPTY_MESSAGE', 'Message cannot be empty.');
  }

  if (message.length > 2000) {
    throw new AssistantError('MESSAGE_TOO_LONG', 'Message cannot exceed 2000 characters.');
  }

  if (conversationId) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AssistantError('INVALID_CONVERSATION_ID', 'Invalid conversationId format.');
    }
  }

  return {
    message: message.trim(),
    conversationId: conversationId || null,
  };
}

module.exports = { validateChatRequest };

