const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { auth } = require('../middleware/auth');

router.post('/', auth, bookingController.createBooking);
router.get('/mine', auth, bookingController.listMine);
router.get('/:id', auth, bookingController.getBooking);
router.post('/:id/pay', auth, bookingController.payBooking);
router.post('/:id/cancel', auth, bookingController.cancelBooking);

module.exports = router;

