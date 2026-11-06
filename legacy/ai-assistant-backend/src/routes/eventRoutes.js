const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', eventController.listEvents);
router.get('/cities', eventController.listCities);
router.get('/:id', eventController.getEvent);
router.get('/:id/availability', eventController.getAvailability);
router.post('/', auth, requireRole('vendor', 'organizer'), eventController.createEvent);

module.exports = router;

