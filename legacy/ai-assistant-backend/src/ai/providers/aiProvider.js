const aiConfig = require('../config/ai.config');
const AssistantError = require('../errors/AssistantError');

class MockAIProvider {
  async generateResponse({ messages, systemPrompt, context, tools }) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const text = (lastUserMessage?.content || '').toLowerCase();

    // Check if the conversation has a recent tool output that needs a concluding reply
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'tool') {
      let parsedToolData = {};
      try {
        parsedToolData = JSON.parse(lastMessage.content);
      } catch {}

      if (parsedToolData.actionId) {
        return {
          content: `I have prepared the action for you. Details: ${JSON.stringify(parsedToolData.bookingDetails || parsedToolData.cancellationDetails)}. Please review and approve it using Action ID: ${parsedToolData.actionId}.`,
          toolCalls: [],
        };
      }

      if (parsedToolData.data) {
        return {
          content: `Here are the verified details from the system: ${JSON.stringify(parsedToolData.data)}. Let me know if you would like me to prepare a booking or answer any further questions!`,
          toolCalls: [],
        };
      }

      return {
        content: `I received the backend verification. How would you like to proceed?`,
        toolCalls: [],
      };
    }

    // Smart heuristic tool dispatch for testing and mock mode:
    // 1. Check availability
    if (text.includes('availability') || text.includes('seats') || text.includes('how many tickets') || text.includes('available')) {
      const idMatch = text.match(/[0-9a-fA-F]{24}/) || text.match(/ev_[a-zA-Z0-9_-]+/);
      const eventId = idMatch ? idMatch[0] : (context.match(/ID:\s*"([^"]+)"/) || [])[1];

      if (eventId) {
        return {
          content: null,
          toolCalls: [
            {
              id: `call_${Date.now()}`,
              name: 'check_availability',
              arguments: { eventId },
            },
          ],
        };
      }
    }

    // 2. Prepare booking
    if (text.includes('book') || text.includes('reserve') || text.includes('ticket')) {
      const idMatch = text.match(/[0-9a-fA-F]{24}/) || text.match(/ev_[a-zA-Z0-9_-]+/);
      const eventId = idMatch ? idMatch[0] : (context.match(/ID:\s*"([^"]+)"/) || [])[1];
      const qtyMatch = text.match(/(\d+)\s*(?:ticket|seat|pass)/);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      if (eventId) {
        return {
          content: null,
          toolCalls: [
            {
              id: `call_${Date.now()}`,
              name: 'prepare_booking',
              arguments: { eventId, quantity: qty },
            },
          ],
        };
      }
    }

    // 3. Prepare cancellation
    if (text.includes('cancel') && (text.includes('booking') || text.includes('ticket'))) {
      const idMatch = text.match(/[0-9a-fA-F]{24}/) || text.match(/bk_[a-zA-Z0-9_-]+/i);
      const bookingId = idMatch ? idMatch[0] : null;

      if (bookingId) {
        return {
          content: null,
          toolCalls: [
            {
              id: `call_${Date.now()}`,
              name: 'prepare_cancellation',
              arguments: { bookingId },
            },
          ],
        };
      }
    }

    // 4. Default informational response using context
    return {
      content: `I am your TicketAI assistant. I can check live seat availability, explain ticket prices and cancellation policies, and prepare bookings for you with your approval. What event would you like to explore?`,
      toolCalls: [],
    };
  }
}

class OpenAICompatibleProvider {
  constructor(apiKey, model, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async generateResponse({ messages, systemPrompt, context, tools }) {
    const formattedMessages = [
      { role: 'system', content: `${systemPrompt}\n\nTRUSTED CONTEXT:\n${context}` },
      ...messages.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'tool',
            content: m.content,
            tool_call_id: m.toolCallId,
          };
        }
        if (m.toolCalls && m.toolCalls.length > 0) {
          return {
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
              },
            })),
          };
        }
        return { role: m.role, content: m.content };
      }),
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiConfig.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: formattedMessages,
          tools: tools && tools.length > 0 ? tools : undefined,
          tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new AssistantError('PROVIDER_ERROR', `AI provider error (${response.status}): ${errBody}`, null, 502);
      }

      const data = await response.json();
      const choice = data.choices?.[0]?.message;

      const toolCalls = (choice?.tool_calls || []).map((tc) => {
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = tc.function.arguments;
        }
        return {
          id: tc.id,
          name: tc.function.name,
          arguments: args,
        };
      });

      return {
        content: choice?.content || null,
        toolCalls,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AssistantError('PROVIDER_TIMEOUT', 'AI provider request timed out.', null, 504);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function getAIProvider() {
  const providerType = (aiConfig.provider || 'mock').toLowerCase();
  if (providerType === 'openai' && aiConfig.apiKey) {
    return new OpenAICompatibleProvider(aiConfig.apiKey, aiConfig.model);
  }
  return new MockAIProvider();
}

module.exports = {
  getAIProvider,
  MockAIProvider,
  OpenAICompatibleProvider,
};

