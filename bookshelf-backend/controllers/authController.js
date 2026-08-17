import userRepository from '../repositories/userRepository.js';
import generateToken from '../utils/generateToken.js';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
} from '../utils/cookies.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await userRepository.findByEmail(email);

    if (user && (await userRepository.matchPassword(user, password))) {
      generateToken(res, user._id, user.email, user.role);

      res.status(200).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    // Shape, length and email format are enforced by validateBody() on the
    // route, and email arrives already trimmed and lowercased. This handler
    // only has to deal with the one rule that needs a database lookup.
    const { name, email, password } = req.body;

    const userExists = await userRepository.findByEmail(email);

    if (userExists) {
      res.status(400);
      throw new Error('Email already exists');
    }

    const user = await userRepository.create({
      name,
      email,
      password,
    });

    if (user) {
      generateToken(res, user._id, user.email, user.role);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = (req, res) => {
  // A browser only replaces a cookie when name, domain and path all match the
  // one it already has. Deriving these from the same helper that sets the
  // cookie is what guarantees they do — the inline `{ httpOnly, expires }`
  // that used to be here matched only by coincidence, and would have stopped
  // matching the moment the setter grew a `domain`.
  res.cookie(SESSION_COOKIE_NAME, '', clearSessionCookieOptions());

  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile (restore session)
// @route   GET /api/auth/me
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await userRepository.findByIdWithoutPassword(req.user._id);

    if (user) {
      res.status(200).json({ user });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};
