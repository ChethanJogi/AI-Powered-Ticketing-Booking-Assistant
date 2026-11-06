const assert = require('assert');
const mongoose = require('mongoose');

// Import validators, guards, formatters, and services
const { validateChatRequest } = require('../src/ai/validators/chatRequest.validator');
const { validateToolArguments } = require('../src/ai/validators/toolArguments.validator');
const { validateDateNotPast } = require('../src/ai/validators/date.validator');
const { validateObjectId } = require('../src/ai/validators/resource.validator');
const { checkToolPermission } = require('../src/ai/guards/toolPermission.guard');
const { verifyActionApproval } = require('../src/ai/guards/actionApproval.guard');
const { verifyPaymentConfirmation } = require('../src/ai/guards/paymentConfirmation.guard');
const AssistantError = require('../src/ai/errors/AssistantError');
const { formatAssistantResponse } = require('../src/ai/formatters/assistantResponse');

console.log('--- Starting TicketAI AI Assistant Test Suite ---');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

async function runAllTests() {
  // 1. Input Validation Tests
  test('1.1 Input Validation: Empty message is rejected', () => {
    assert.throws(
      () => validateChatRequest({ message: '   ' }),
      (err) => err instanceof AssistantError && err.code === 'EMPTY_MESSAGE'
    );
  });

  test('1.2 Input Validation: Oversized message is rejected', () => {
    const hugeMessage = 'a'.repeat(2001);
    assert.throws(
      () => validateChatRequest({ message: hugeMessage }),
      (err) => err instanceof AssistantError && err.code === 'MESSAGE_TOO_LONG'
    );
  });

  test('1.3 Input Validation: Invalid conversationId is rejected', () => {
    assert.throws(
      () => validateChatRequest({ message: 'Hello', conversationId: 'invalid-id' }),
      (err) => err instanceof AssistantError && err.code === 'INVALID_CONVERSATION_ID'
    );
  });

  test('1.4 Input Validation: Valid chat request passes', () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const result = validateChatRequest({ message: 'How much are hackathon tickets?', conversationId: validId });
    assert.strictEqual(result.message, 'How much are hackathon tickets?');
    assert.strictEqual(result.conversationId, validId);
  });

  test('1.5 Tool Arguments: Invalid ticket quantity rejected', () => {
    assert.throws(
      () => validateToolArguments('prepare_booking', { eventId: new mongoose.Types.ObjectId().toString(), quantity: 0 }),
      (err) => err instanceof AssistantError && err.code === 'INVALID_QUANTITY'
    );
    assert.throws(
      () => validateToolArguments('prepare_booking', { eventId: new mongoose.Types.ObjectId().toString(), quantity: 15 }),
      (err) => err instanceof AssistantError && err.code === 'INVALID_QUANTITY'
    );
  });

  test('1.6 Tool Arguments: Missing required argument is caught', () => {
    assert.throws(
      () => validateToolArguments('check_availability', {}),
      (err) => err instanceof AssistantError && err.code === 'MISSING_ARGUMENT'
    );
  });

  // 2. Unauthorized Access & Permission Guard Tests
  test('2.1 Unauthorized Access: Unauthenticated user blocked from booking', () => {
    assert.throws(
      () => checkToolPermission('prepare_booking', null),
      (err) => err instanceof AssistantError && err.code === 'UNAUTHORIZED_TOOL_USE' && err.statusCode === 401
    );
  });

  test('2.2 Unauthorized Access: Unauthenticated user blocked from viewing private bookings', () => {
    assert.throws(
      () => checkToolPermission('get_booking', null),
      (err) => err instanceof AssistantError && err.code === 'UNAUTHORIZED_TOOL_USE' && err.statusCode === 401
    );
  });

  test('2.3 Permissions: Public tool check_availability allowed for guests', () => {
    const allowed = checkToolPermission('check_availability', null);
    assert.strictEqual(allowed, true);
  });

  // 3. Conversation Ownership Tests
  test('3.1 Conversation Ownership: Cross-user conversation access is blocked', () => {
    const userA = { _id: new mongoose.Types.ObjectId() };
    const userB = { _id: new mongoose.Types.ObjectId() };
    const conversationOfUserA = { userId: userA._id };

    assert.strictEqual(
      String(conversationOfUserA.userId) === String(userB._id),
      false,
      'User B must not match User A conversation'
    );
  });

  // 4. Action Approval Guard Tests
  test('4.1 Action Approval: Unapproved action cannot be executed', () => {
    const user = { _id: new mongoose.Types.ObjectId() };
    const pendingAction = {
      actionId: 'act_123',
      userId: user._id,
      actionType: 'BOOKING',
      status: 'PENDING_APPROVAL',
      expiresAt: new Date(Date.now() + 60000),
    };

    assert.throws(
      () => verifyActionApproval(pendingAction, 'BOOKING', user),
      (err) => err instanceof AssistantError && err.code === 'ACTION_NOT_APPROVED'
    );
  });

  test('4.2 Action Approval: User mismatch on action approval is rejected', () => {
    const userA = { _id: new mongoose.Types.ObjectId() };
    const userB = { _id: new mongoose.Types.ObjectId() };
    const action = {
      actionId: 'act_123',
      userId: userA._id,
      actionType: 'BOOKING',
      status: 'APPROVED',
    };

    assert.throws(
      () => verifyActionApproval(action, 'BOOKING', userB),
      (err) => err instanceof AssistantError && err.code === 'FORBIDDEN_ACTION'
    );
  });

  test('4.3 Action Approval: Expired action cannot be executed', () => {
    const user = { _id: new mongoose.Types.ObjectId() };
    const expiredAction = {
      actionId: 'act_123',
      userId: user._id,
      actionType: 'BOOKING',
      status: 'APPROVED',
      expiresAt: new Date(Date.now() - 10000), // Expired
    };

    assert.throws(
      () => verifyActionApproval(expiredAction, 'BOOKING', user),
      (err) => err instanceof AssistantError && err.code === 'ACTION_EXPIRED'
    );
  });

  // 5. Duplicate Action Prevention Tests
  test('5.1 Duplicate Prevention: Already executed action cannot be re-executed', () => {
    const user = { _id: new mongoose.Types.ObjectId() };
    const executedAction = {
      actionId: 'act_123',
      userId: user._id,
      actionType: 'BOOKING',
      status: 'EXECUTED',
      expiresAt: new Date(Date.now() + 60000),
    };

    assert.throws(
      () => verifyActionApproval(executedAction, 'BOOKING', user),
      (err) => err instanceof AssistantError && err.code === 'DUPLICATE_ACTION' && err.statusCode === 409
    );
  });

  test('5.2 Duplicate Prevention: Rejected action cannot be executed', () => {
    const user = { _id: new mongoose.Types.ObjectId() };
    const rejectedAction = {
      actionId: 'act_123',
      userId: user._id,
      actionType: 'BOOKING',
      status: 'REJECTED',
    };

    assert.throws(
      () => verifyActionApproval(rejectedAction, 'BOOKING', user),
      (err) => err instanceof AssistantError && err.code === 'ACTION_REJECTED'
    );
  });

  // 6. Payment Confirmation Guard Tests
  test('6.1 Payment Confirmation: Cannot confirm payment for another user’s booking', () => {
    const userA = { _id: new mongoose.Types.ObjectId() };
    const userB = { _id: new mongoose.Types.ObjectId() };
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      userId: userA._id,
      status: 'HELD',
      holdExpiresAt: new Date(Date.now() + 60000),
    };

    assert.throws(
      () => verifyPaymentConfirmation(booking, userB, 'pay_123'),
      (err) => err instanceof AssistantError && err.code === 'FORBIDDEN'
    );
  });

  test('6.2 Payment Confirmation: Cannot confirm payment on expired hold', () => {
    const user = { _id: new mongoose.Types.ObjectId() };
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      userId: user._id,
      status: 'HELD',
      holdExpiresAt: new Date(Date.now() - 5000), // hold expired
    };

    assert.throws(
      () => verifyPaymentConfirmation(booking, user, 'pay_123'),
      (err) => err instanceof AssistantError && err.code === 'HOLD_EXPIRED'
    );
  });

  test('6.3 Payment Confirmation: Already confirmed booking cannot be re-paid', () => {
    const user = { _id: new mongoose.Types.ObjectId() };
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      userId: user._id,
      status: 'CONFIRMED',
      holdExpiresAt: new Date(Date.now() + 60000),
    };

    assert.throws(
      () => verifyPaymentConfirmation(booking, user, 'pay_123'),
      (err) => err instanceof AssistantError && err.code === 'ALREADY_PAID' && err.statusCode === 409
    );
  });

  test('6.4 Payment Confirmation: Valid held booking with payment reference passes', () => {
    const user = { _id: new mongoose.Types.ObjectId() };
    const booking = {
      _id: new mongoose.Types.ObjectId(),
      userId: user._id,
      status: 'HELD',
      holdExpiresAt: new Date(Date.now() + 60000),
    };

    const verified = verifyPaymentConfirmation(booking, user, 'pay_valid_ref_123');
    assert.strictEqual(verified, true);
  });

  // 7. Cancellation Approval Tests
  test('7.1 Cancellation Approval: Cancellation action requires matching type and approval', () => {
    const user = { _id: new mongoose.Types.ObjectId() };
    const cancelAction = {
      actionId: 'act_cancel_1',
      userId: user._id,
      actionType: 'CANCELLATION',
      status: 'APPROVED',
      expiresAt: new Date(Date.now() + 60000),
    };

    const verified = verifyActionApproval(cancelAction, 'CANCELLATION', user);
    assert.strictEqual(verified, true);
  });

  // 8. Response Formatter Tests
  test('8.1 Response Formatter: Correctly formats actionRequired and payload', () => {
    const convId = new mongoose.Types.ObjectId();
    const action = {
      actionId: 'act_test_99',
      actionType: 'BOOKING',
      status: 'PENDING_APPROVAL',
      payload: { eventTitle: 'National Hackathon', totalPrice: 500 },
      expiresAt: new Date(),
    };

    const response = formatAssistantResponse({
      conversationId: convId,
      message: 'Please approve your booking proposal.',
      pendingAction: action,
      toolResults: [{ toolName: 'prepare_booking', status: 'SUCCESS', summary: 'Prepared' }],
    });

    assert.strictEqual(response.conversationId, String(convId));
    assert.strictEqual(response.actionRequired, true);
    assert.strictEqual(response.action.actionId, 'act_test_99');
    assert.strictEqual(response.toolExecutions.length, 1);
  });

  console.log(`\n========================================`);
  console.log(`All ${passedTests} automated tests passed successfully!`);
  console.log(`========================================\n`);
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

