const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistantController');
const { auth } = require('../middleware/auth');
const assistantRateLimiter = require('../middleware/assistantRateLimit');

// All assistant interactions apply rate limiting and JWT auth
router.use(assistantRateLimiter);

router.post('/chat', auth, (req, res, next) => assistantController.chat(req, res, next));
router.get('/conversations/:id', auth, (req, res, next) => assistantController.getConversation(req, res, next));
router.post('/actions/:id/approve', auth, (req, res, next) => assistantController.approveAction(req, res, next));
router.post('/actions/:id/reject', auth, (req, res, next) => assistantController.rejectAction(req, res, next));

module.exports = router;

