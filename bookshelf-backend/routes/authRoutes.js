import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';

const router = express.Router();

// Limit before validating: a request that is already over the limit should
// not get to spend anything on parsing its body.
router.post(
  '/register',
  registerLimiter,
  validateBody(registerSchema),
  registerUser
);
router.post('/login', loginLimiter, validateBody(loginSchema), authUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getUserProfile);

export default router;
