const AssistantError = require('../errors/AssistantError');

function validateDateNotPast(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new AssistantError('INVALID_DATE', 'Provided date string is not a valid date.');
  }

  const now = new Date();
  if (date.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    throw new AssistantError('DATE_IN_PAST', 'Cannot book or query availability for past events.');
  }

  return date;
}

module.exports = { validateDateNotPast };

