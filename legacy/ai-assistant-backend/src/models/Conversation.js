const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: true,
    },
    content: { type: String, default: '' },
    toolCalls: [
      {
        id: { type: String },
        name: { type: String },
        arguments: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    toolCallId: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, default: 'New Conversation' },
    messages: [messageSchema],
    metadata: {
      lastActiveEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
      contextSummary: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);

