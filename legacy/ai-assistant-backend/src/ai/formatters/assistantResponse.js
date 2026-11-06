function formatAssistantResponse({ conversationId, message, pendingAction, toolResults = [] }) {
  return {
    conversationId: String(conversationId),
    message: message || '',
    actionRequired: Boolean(pendingAction),
    action: pendingAction
      ? {
          actionId: pendingAction.actionId,
          actionType: pendingAction.actionType,
          status: pendingAction.status,
          payload: pendingAction.payload,
          expiresAt: pendingAction.expiresAt,
        }
      : null,
    toolExecutions: toolResults.map((t) => ({
      tool: t.toolName,
      status: t.status,
      summary: t.summary,
    })),
    timestamp: new Date().toISOString(),
  };
}

module.exports = { formatAssistantResponse };

