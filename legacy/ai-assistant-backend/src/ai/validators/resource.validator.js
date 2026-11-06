const mongoose = require('mongoose');
const AssistantError = require('../errors/AssistantError');

function validateObjectId(id, resourceName = 'Resource') {
  if (!id || typeof id !== 'string') {
    throw new AssistantError('INVALID_ID', `${resourceName} ID is required and must be a string.`);
  }

  // Allow either standard 24-character MongoDB ObjectId or string IDs
  if (!mongoose.Types.ObjectId.isValid(id) && id.length < 3) {
    throw new AssistantError('INVALID_ID_FORMAT', `Invalid ID format for ${resourceName}: ${id}`);
  }

  return id;
}

module.exports = { validateObjectId };

