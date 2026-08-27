import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import {
  loginLimiter,
  loginIpLimiter,
  registerLimiter,
} from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema,
} from '../validators/authValidators.js';

const router = express.Router();

// Limit before validating: a request that is already over the limit should
// not get to spend anything on parsing its body.
router.post(
  '/register',
  registerLimiter,
  validateBody(registerSchema),
  registerUser
);

/*
 * Login carries two limits, and the order is deliberate.
 *
 * loginIpLimiter is the loose per-address ceiling that catches credential
 * stuffing — one attempt each against a thousand accounts never trips a
 * per-account limit. loginLimiter is the tight per-account limit that stops
 * a single password being guessed.
 *
 * The per-account one runs second so its X-RateLimit-* headers are the ones
 * the client sees; it is the limit an ordinary user with a forgotten
 * password will actually meet.
 *
 * Both read req.body.email, which express.json() has already parsed at the
 * app level. Neither waits on validateBody — a request over the limit should
 * be answered before anything else is spent on it.
 */
router.post(
  '/login',
  loginIpLimiter,
  loginLimiter,
  validateBody(loginSchema),
  authUser
);
router.post('/logout', logoutUser);
router.get('/me', protect, getUserProfile);
router.put('/profile', protect, validateBody(updateProfileSchema), updateUserProfile);
router.put('/password', protect, validateBody(updatePasswordSchema), updateUserPassword);

export default router;
