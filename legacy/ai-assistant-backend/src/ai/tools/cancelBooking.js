const actionApprovalService = require('../services/actionApprovalService');
const { verifyActionApproval } = require('../guards/actionApproval.guard');

async function cancelBookingTool(args, context) {
  const { user } = context;
  const action = await actionApprovalService.getAction(args.actionId);
  verifyActionApproval(action, 'CANCELLATION', user);

  const result = await actionApprovalService.approveAction(args.actionId, user);
  return {
    success: true,
    data: result,
  };
}

module.exports = cancelBookingTool;

