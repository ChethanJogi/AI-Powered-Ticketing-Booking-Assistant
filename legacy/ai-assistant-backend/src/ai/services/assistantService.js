const conversationService = require('./conversationService');
const { getSystemPrompt } = require('../prompts/systemPrompt');
const { buildTrustedContext } = require('../prompts/contextBuilder');
const { getAIProvider } = require('../providers/aiProvider');
const toolDefinitions = require('../tools/toolDefinitions');
const { executeTool } = require('../tools/toolExecutor');
const { formatAssistantResponse } = require('../formatters/assistantResponse');
const aiConfig = require('../config/ai.config');
const AssistantAction = require('../../models/AssistantAction');

class AssistantService {
  async processUserMessage({ user, conversationId, messageText }) {
    // 1. Load or create conversation
    const conversation = await conversationService.getOrCreateConversation(conversationId, user);

    // 2. Append incoming user message
    await conversationService.appendMessage(conversation._id, {
      role: 'user',
      content: messageText,
    });

    // 3. Build trusted context and system prompt
    const systemPrompt = getSystemPrompt(user);
    const trustedContext = await buildTrustedContext(user, conversation._id);
    const provider = getAIProvider();

    // 4. Conversation loop with tool calls (up to maxToolCalls limit)
    let currentIteration = 0;
    let pendingAction = null;
    const executedTools = [];

    // Reload conversation to get complete message history
    let activeConversation = await conversationService.getConversation(conversation._id, user);

    while (currentIteration < aiConfig.maxToolCalls) {
      currentIteration++;

      // Send to AI provider
      const aiResponse = await provider.generateResponse({
        messages: activeConversation.messages,
        systemPrompt,
        context: trustedContext,
        tools: toolDefinitions,
      });

      // If AI called tools:
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        // Record assistant tool-call message in conversation
        await conversationService.appendMessage(activeConversation._id, {
          role: 'assistant',
          content: aiResponse.content || '',
          toolCalls: aiResponse.toolCalls,
        });

        // Execute each tool
        for (const toolCall of aiResponse.toolCalls) {
          try {
            const toolResult = await executeTool(toolCall.name, toolCall.arguments, {
              user,
              conversationId: activeConversation._id,
            });

            executedTools.push({
              toolName: toolCall.name,
              status: 'SUCCESS',
              summary: toolResult,
            });

            // Check if this tool generated a pending action (e.g. prepare_booking, prepare_cancellation)
            if (toolResult && toolResult.actionId) {
              pendingAction = await AssistantAction.findOne({ actionId: toolResult.actionId });
            }

            // Append tool execution result message for AI to inspect
            await conversationService.appendMessage(activeConversation._id, {
              role: 'tool',
              content: JSON.stringify(toolResult),
              toolCallId: toolCall.id,
            });
          } catch (toolErr) {
            executedTools.push({
              toolName: toolCall.name,
              status: 'ERROR',
              summary: toolErr.message,
            });

            await conversationService.appendMessage(activeConversation._id, {
              role: 'tool',
              content: JSON.stringify({ error: toolErr.code || 'TOOL_ERROR', message: toolErr.message }),
              toolCallId: toolCall.id,
            });
          }
        }

        // Refresh active conversation history for next loop iteration
        activeConversation = await conversationService.getConversation(activeConversation._id, user);
      } else {
        // Final assistant conversational reply reached
        await conversationService.appendMessage(activeConversation._id, {
          role: 'assistant',
          content: aiResponse.content || '',
        });

        return formatAssistantResponse({
          conversationId: activeConversation._id,
          message: aiResponse.content,
          pendingAction,
          toolResults: executedTools,
        });
      }
    }

    // If max iterations reached, get the last assistant message
    const latestConv = await conversationService.getConversation(activeConversation._id, user);
    const lastMsg = latestConv.messages[latestConv.messages.length - 1];

    return formatAssistantResponse({
      conversationId: latestConv._id,
      message: lastMsg?.content || 'I have retrieved the necessary information. Please let me know how you would like to proceed.',
      pendingAction,
      toolResults: executedTools,
    });
  }
}

module.exports = new AssistantService();

