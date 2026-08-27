import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { updateUserProfile, updateUserPassword } from '../controllers/authController.js';
import userRepository from '../repositories/userRepository.js';

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('updateUserProfile controller', () => {
  test('updates profile attributes and responds with 200', async () => {
    const originalUpdateProfile = userRepository.updateProfile;
    userRepository.updateProfile = async (userId, data) => ({
      _id: userId,
      name: data.name || 'Original Name',
      bio: data.bio || '',
      avatar: data.avatar || '📚',
      readingGoal: data.readingGoal || 12,
      preferredGenres: data.preferredGenres || [],
    });

    try {
      const req = {
        user: { _id: 'user123' },
        body: {
          name: 'New Name',
          bio: 'Love reading classics',
          avatar: '📖',
          readingGoal: 25,
          preferredGenres: ['Fiction'],
        },
      };
      const res = makeRes();
      let nextError = null;

      await updateUserProfile(req, res, (err) => {
        nextError = err;
      });

      assert.equal(nextError, null);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'Profile updated successfully');
      assert.equal(res.body.user.name, 'New Name');
      assert.equal(res.body.user.bio, 'Love reading classics');
      assert.equal(res.body.user.readingGoal, 25);
    } finally {
      userRepository.updateProfile = originalUpdateProfile;
    }
  });

  test('calls next with error if user is not found', async () => {
    const originalUpdateProfile = userRepository.updateProfile;
    userRepository.updateProfile = async () => null;

    try {
      const req = {
        user: { _id: 'unknown' },
        body: { name: 'New Name' },
      };
      const res = makeRes();
      let nextError = null;

      await updateUserProfile(req, res, (err) => {
        nextError = err;
      });

      assert.equal(res.statusCode, 404);
      assert.ok(nextError instanceof Error);
      assert.equal(nextError.message, 'User not found');
    } finally {
      userRepository.updateProfile = originalUpdateProfile;
    }
  });
});

describe('updateUserPassword controller', () => {
  test('updates password when current password matches', async () => {
    const originalFindById = userRepository.findById;
    const originalMatchPassword = userRepository.matchPassword;
    const originalUpdatePassword = userRepository.updatePassword;

    let passwordUpdated = false;

    userRepository.findById = async (id) => ({ _id: id });
    userRepository.matchPassword = async () => true;
    userRepository.updatePassword = async () => {
      passwordUpdated = true;
      return true;
    };

    try {
      const req = {
        user: { _id: 'user123' },
        body: {
          currentPassword: 'old-password-123',
          newPassword: 'new-secure-password-456',
        },
      };
      const res = makeRes();
      let nextError = null;

      await updateUserPassword(req, res, (err) => {
        nextError = err;
      });

      assert.equal(nextError, null);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'Password updated successfully');
      assert.equal(passwordUpdated, true);
    } finally {
      userRepository.findById = originalFindById;
      userRepository.matchPassword = originalMatchPassword;
      userRepository.updatePassword = originalUpdatePassword;
    }
  });

  test('rejects update when current password does not match', async () => {
    const originalFindById = userRepository.findById;
    const originalMatchPassword = userRepository.matchPassword;

    userRepository.findById = async (id) => ({ _id: id });
    userRepository.matchPassword = async () => false;

    try {
      const req = {
        user: { _id: 'user123' },
        body: {
          currentPassword: 'wrong-password',
          newPassword: 'new-secure-password-456',
        },
      };
      const res = makeRes();
      let nextError = null;

      await updateUserPassword(req, res, (err) => {
        nextError = err;
      });

      assert.equal(res.statusCode, 401);
      assert.ok(nextError instanceof Error);
      assert.equal(nextError.message, 'Current password is incorrect');
    } finally {
      userRepository.findById = originalFindById;
      userRepository.matchPassword = originalMatchPassword;
    }
  });
});
