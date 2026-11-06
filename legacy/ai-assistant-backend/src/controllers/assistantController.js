const assistantService = require('../ai/services/assistantService');
const conversationService = require('../ai/services/conversationService');
const actionApprovalService = require('../ai/services/actionApprovalService');
const { validateChatRequest } = require('../ai/validators/chatRequest.validator');

class AssistantController {
  async chat(req, res, next) {
    try {
      const validated = validateChatRequest(req.body);
      const user = req.user; // populated by auth middleware

      const result = await assistantService.processUserMessage({
        user,
        conversationId: validated.conversationId,
        messageText: validated.message,
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getConversation(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      const conversation = await conversationService.getConversation(id, user);
      return res.status(200).json(conversation);
    } catch (err) {
      next(err);
    }
  }

  async approveAction(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      const result = await actionApprovalService.approveAction(id, user);
      return res.status(200).json({
        success: true,
        message: 'Action approved and executed successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectAction(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      const result = await actionApprovalService.rejectAction(id, user);
      return res.status(200).json({
        success: true,
        message: 'Action has been rejected.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AssistantController();

