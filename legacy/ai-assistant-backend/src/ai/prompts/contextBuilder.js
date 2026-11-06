const Event = require('../../models/Event');
const AssistantAction = require('../../models/AssistantAction');

async function buildTrustedContext(user, conversationId) {
  const contextParts = [];

  // 1. User & Auth info
  if (user) {
    contextParts.push(`Authenticated User: ${user.name} (${user.email}), Role: ${user.role}${user.college ? ', College: ' + user.college : ''}.`);
  } else {
    contextParts.push('User is currently browsing as an unauthenticated guest.');
  }

  // 2. Pending Actions (if any)
  if (user && conversationId) {
    const pendingActions = await AssistantAction.find({
      conversationId,
      userId: user._id,
      status: 'PENDING_APPROVAL',
      expiresAt: { $gt: new Date() },
    });

    if (pendingActions.length > 0) {
      contextParts.push(
        `Active Pending Actions requiring user approval:\n` +
          pendingActions
            .map((a) => `- [${a.actionType}] Action ID: ${a.actionId}, Details: ${JSON.stringify(a.payload)}`)
            .join('\n')
      );
    }
  }

  // 3. Featured / Upcoming Events Summary
  try {
    const events = await Event.find({ date: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } })
      .sort({ date: 1 })
      .limit(10)
      .select('title category eventType city venue price date capacity certificateAvailable');

    if (events.length > 0) {
      contextParts.push(
        `Featured Events in Database:\n` +
          events
            .map(
              (e) =>
                `- ID: "${e._id}" | Title: "${e.title}" | Category: ${e.category}${e.eventType ? ' (' + e.eventType + ')' : ''} | City: ${e.city} | Price: ₹${e.price} | Date: ${e.date.toISOString().split('T')[0]}`
            )
            .join('\n')
      );
    }
  } catch (err) {
    console.warn('[ContextBuilder Warning]:', err.message);
  }

  return contextParts.join('\n\n');
}

module.exports = { buildTrustedContext };

