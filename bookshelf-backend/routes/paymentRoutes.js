import express from 'express';
import { createIntent } from '../controllers/paymentController.js';
import { checkoutLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/*
 * Guests can check out, so this route stays unauthenticated — but it is not
 * free to call. Every successful request reserves inventory in books.json
 * before any money changes hands, and there was nothing here stopping a loop
 * from calling it: no auth, and no limiter, while /api/auth has had one since
 * #275. 78 units across the catalogue went to zero in well under a minute.
 *
 * The limiter bounds how fast stock can be taken. services/
 * reservationSweeper.js is what gives it back. See #329.
 */
router.post('/create-intent', checkoutLimiter, createIntent);

export default router;
