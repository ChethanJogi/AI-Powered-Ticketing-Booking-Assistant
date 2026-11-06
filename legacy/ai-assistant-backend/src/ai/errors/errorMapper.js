const AssistantError = require('./AssistantError');

function errorMapper(err, req, res, next) {
  if (err instanceof AssistantError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Handle Mongoose CastError or ValidationError
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'INVALID_RESOURCE_ID',
      message: `Invalid ID format for field ${err.path}`,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.message,
    });
  }

  console.error('[AI Assistant Unhandled Error]:', err);
  return res.status(500).json({
    error: 'INTERNAL_ASSISTANT_ERROR',
    message: 'An unexpected error occurred in the AI Assistant service.',
  });
}

module.exports = errorMapper;
