const ToolExecution = require('../../models/ToolExecution');
const { validateToolArguments } = require('../validators/toolArguments.validator');
const { checkToolPermission } = require('../guards/toolPermission.guard');
const AssistantError = require('../errors/AssistantError');

// Tool handlers
const checkAvailability = require('./checkAvailability');
const prepareBooking = require('./prepareBooking');
const createBooking = require('./createBooking');
const confirmBooking = require('./confirmBooking');
const getBooking = require('./getBooking');
const prepareCancellation = require('./prepareCancellation');
const cancelBooking = require('./cancelBooking');

const HANDLERS = {
  check_availability: checkAvailability,
  prepare_booking: prepareBooking,
  create_booking: createBooking,
  confirm_booking: confirmBooking,
  get_booking: getBooking,
  prepare_cancellation: prepareCancellation,
  cancel_booking: cancelBooking,
};

async function executeTool(toolName, rawArgs, context) {
  const startTime = Date.now();
  let executionStatus = 'SUCCESS';
  let result = null;
  let errorMessage = null;

  try {
    // 1. Permission guard check
    checkToolPermission(toolName, context.user);

    // 2. Validate arguments
    const validatedArgs = validateToolArguments(toolName, rawArgs);

    // 3. Dispatch to handler
    const handler = HANDLERS[toolName];
    if (!handler) {
      throw new AssistantError('HANDLER_NOT_FOUND', `No handler registered for tool ${toolName}`);
    }

    result = await handler(validatedArgs, context);
    return result;
  } catch (err) {
    executionStatus = err.statusCode === 401 || err.statusCode === 403 ? 'BLOCKED_BY_GUARD' : 'FAILED';
    errorMessage = err.message;
    throw err;
  } finally {
    // 4. Audit logging into ToolExecution collection
    try {
      const durationMs = Date.now() - startTime;
      await ToolExecution.create({
        conversationId: context.conversationId || null,
        userId: context.user ? context.user._id : null,
        toolName,
        arguments: rawArgs,
        executionStatus,
        result: executionStatus === 'SUCCESS' ? result : null,
        errorMessage,
        durationMs,
      });
    } catch (auditErr) {
      console.warn('[ToolExecution Audit Warning]:', auditErr.message);
    }
  }
}

module.exports = { executeTool };

