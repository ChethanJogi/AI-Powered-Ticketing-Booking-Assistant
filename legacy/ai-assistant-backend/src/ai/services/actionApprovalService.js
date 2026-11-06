const crypto = require('crypto');
const AssistantAction = require('../../models/AssistantAction');
const AssistantError = require('../errors/AssistantError');
const ticketingAdapter = require('./ticketingAdapter');
const aiConfig = require('../config/ai.config');
const { verifyActionApproval } = require('../guards/actionApproval.guard');

class ActionApprovalService {
  _generateSecurityToken(actionId, userId, payload) {
    const data = `${actionId}:${userId}:${JSON.stringify(payload)}`;
    return crypto.createHmac('sha256', aiConfig.actionSecret).update(data).digest('hex');
  }

  async createAction({ conversationId, userId, actionType, payload }) {
    const actionId = `act_${crypto.randomBytes(8).toString('hex')}`;
    const securityToken = this._generateSecurityToken(actionId, userId, payload);
    const expiresAt = new Date(Date.now() + aiConfig.actionExpiryMinutes * 60 * 1000);

    const action = await AssistantAction.create({
      actionId,
      conversationId,
      userId,
      actionType,
      status: 'PENDING_APPROVAL',
      payload,
      securityToken,
      expiresAt,
    });

    return action;
  }

  async getAction(actionId) {
    const action = await AssistantAction.findOne({ actionId });
    if (!action) {
      throw new AssistantError('ACTION_NOT_FOUND', `Action ${actionId} not found.`, null, 404);
    }
    return action;
  }

  async approveAction(actionId, user) {
    const action = await this.getAction(actionId);

    // Verify security token
    const expectedToken = this._generateSecurityToken(action.actionId, action.userId, action.payload);
    if (action.securityToken !== expectedToken) {
      throw new AssistantError('SECURITY_TOKEN_MISMATCH', 'Action payload has been altered or tampered with.', null, 403);
    }

    if (action.status === 'EXECUTED') {
      throw new AssistantError('DUPLICATE_ACTION', 'This action has already been executed.', null, 409);
    }

    if (action.status === 'REJECTED') {
      throw new AssistantError('ACTION_ALREADY_REJECTED', 'This action has already been rejected.', null, 400);
    }

    if (action.expiresAt && new Date() > new Date(action.expiresAt)) {
      action.status = 'EXPIRED';
      await action.save();
      throw new AssistantError('ACTION_EXPIRED', 'Action has expired. Please initiate a new request.', null, 400);
    }

    if (String(action.userId) !== String(user._id)) {
      throw new AssistantError('FORBIDDEN', 'Cannot approve another user’s action.', null, 403);
    }

    action.status = 'APPROVED';
    action.approvedAt = new Date();

    let executionResult;
    if (action.actionType === 'BOOKING') {
      const { eventId, quantity, teamName, attendees } = action.payload;
      const booking = await ticketingAdapter.createBooking({
        eventId,
        user,
        qty: quantity,
        teamName,
        attendees,
      });
      executionResult = {
        bookingId: String(booking._id),
        eventTitle: booking.eventTitle,
        amount: booking.amount,
        qty: booking.qty,
        status: booking.status,
        holdExpiresAt: booking.holdExpiresAt,
      };
    } else if (action.actionType === 'CANCELLATION') {
      const { bookingId } = action.payload;
      const cancelResult = await ticketingAdapter.cancelBooking(bookingId, user);
      executionResult = {
        bookingId: String(cancelResult.booking._id),
        status: cancelResult.booking.status,
        refundStatus: cancelResult.refundStatus,
        policy: cancelResult.policy,
      };
    } else if (action.actionType === 'PAYMENT_CONFIRMATION') {
      const { bookingId, paymentRef } = action.payload;
      const confirmed = await ticketingAdapter.confirmPayment(bookingId, paymentRef);
      executionResult = {
        bookingId: String(confirmed._id),
        status: confirmed.status,
        ticketCode: confirmed.ticketCode,
      };
    }

    action.status = 'EXECUTED';
    action.executionResult = executionResult;
    await action.save();

    return {
      actionId: action.actionId,
      status: action.status,
      actionType: action.actionType,
      result: executionResult,
    };
  }

  async rejectAction(actionId, user) {
    const action = await this.getAction(actionId);

    if (String(action.userId) !== String(user._id)) {
      throw new AssistantError('FORBIDDEN', 'Cannot reject another user’s action.', null, 403);
    }

    if (action.status === 'EXECUTED') {
      throw new AssistantError('DUPLICATE_ACTION', 'Cannot reject an action that was already executed.', null, 409);
    }

    action.status = 'REJECTED';
    action.rejectedAt = new Date();
    await action.save();

    return {
      actionId: action.actionId,
      status: 'REJECTED',
    };
  }
}

module.exports = new ActionApprovalService();

