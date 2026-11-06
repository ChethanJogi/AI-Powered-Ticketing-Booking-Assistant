const mongoose = require('mongoose');

const toolExecutionSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    toolName: {
      type: String,
      required: true,
      index: true,
    },
    arguments: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    executionStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'BLOCKED_BY_GUARD'],
      required: true,
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('ToolExecution', toolExecutionSchema);

