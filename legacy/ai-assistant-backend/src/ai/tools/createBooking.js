const actionApprovalService = require('../services/actionApprovalService');
const { verifyActionApproval } = require('../guards/actionApproval.guard');

async function createBookingTool(args, context) {
  const { user } = context;
  const action = await actionApprovalService.getAction(args.actionId);
  verifyActionApproval(action, 'BOOKING', user);

  const result = await actionApprovalService.approveAction(args.actionId, user);
  return {
    success: true,
    data: result,
  };
}

module.exports = createBookingTool;

