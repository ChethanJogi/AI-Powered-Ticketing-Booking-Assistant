const crypto = require('crypto');
const Conversation = require('../../models/Conversation');
const AssistantError = require('../errors/AssistantError');

class ConversationService {
  async getOrCreateConversation(conversationId, user) {
    if (conversationId) {
      const conv = await Conversation.findById(conversationId);
      if (!conv) {
        throw new AssistantError('CONVERSATION_NOT_FOUND', 'Conversation not found.', null, 404);
      }
      if (user && String(conv.userId) !== String(user._id)) {
        throw new AssistantError(
          'FORBIDDEN_CONVERSATION',
          'You do not have access to this conversation.',
          null,
          403
        );
      }
      return conv;
    }

    if (!user) {
      throw new AssistantError('AUTHENTICATION_REQUIRED', 'Please sign in to start a conversation.', null, 401);
    }

    const newConv = await Conversation.create({
      userId: user._id,
      title: 'Event Inquiry',
      messages: [],
    });

    return newConv;
  }

  async getConversation(conversationId, user) {
    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      throw new AssistantError('CONVERSATION_NOT_FOUND', 'Conversation not found.', null, 404);
    }
    if (user && String(conv.userId) !== String(user._id)) {
      throw new AssistantError(
        'FORBIDDEN_CONVERSATION',
        'You do not have access to this conversation.',
        null,
        403
      );
    }
    return conv;
  }

  async appendMessage(conversationId, { role, content, toolCalls = [], toolCallId = null, metadata = {} }) {
    const message = {
      id: `msg_${crypto.randomBytes(6).toString('hex')}`,
      role,
      content: content || '',
      toolCalls: toolCalls || [],
      toolCallId,
      metadata: metadata || {},
      createdAt: new Date(),
    };

    const conv = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );

    return message;
  }
}

module.exports = new ConversationService();

