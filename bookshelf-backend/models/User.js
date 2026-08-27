import mongoose from 'mongoose';
import { hashPassword, comparePassword, isHashed } from '../utils/password.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    wishlist: [{
      type: String,
    }],
    bio: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '📚',
    },
    readingGoal: {
      type: Number,
      default: 12,
      min: 1,
    },
    preferredGenres: [{
      type: String,
    }],
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return comparePassword(enteredPassword, this.password);
};

/**
 * Hash the password before it is written, and only when it actually changed.
 *
 * The previous version of this hook mixed the two Mongoose middleware styles:
 * it took a `next` callback, called `next()` in the "nothing to do" branch
 * without returning, and then never called it in the branch that did the
 * work. Because the function is `async`, Mongoose waits on the returned
 * promise regardless — so the fall-through was not merely untidy, it was
 * live. Every `save()` of an existing user re-hashed the stored digest and
 * locked the account out. See #295.
 *
 * Two changes make that shape impossible to reintroduce:
 *
 *   1. No `next` parameter. The hook is a promise; there is exactly one way
 *      to leave it, and `return` genuinely returns.
 *   2. `isHashed` is checked as well as `isModified`. Even if some future
 *      caller assigns an already-hashed value to `password`, it is stored as
 *      it is rather than hashed a second time.
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  if (isHashed(this.password)) {
    return;
  }

  this.password = await hashPassword(this.password);
});

/**
 * `findOneAndUpdate` and friends bypass document middleware entirely, so a
 * password set through an update query would be written in plaintext.
 * Nothing in the codebase does that today; this is here so that the first
 * person who tries does not have to discover it in production.
 */
userSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();

  if (!update) {
    return;
  }

  const nextPassword = update.password ?? update.$set?.password;

  if (typeof nextPassword !== 'string' || isHashed(nextPassword)) {
    return;
  }

  const hashed = await hashPassword(nextPassword);

  if (update.$set?.password !== undefined) {
    update.$set.password = hashed;
  } else {
    update.password = hashed;
  }

  this.setUpdate(update);
});

const User = mongoose.model('User', userSchema);

export default User;
