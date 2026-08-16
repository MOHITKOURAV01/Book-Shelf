import User from '../models/User.js';

class UserRepository {
  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findByIdWithoutPassword(id) {
    return await User.findById(id).select('-password');
  }

  async create(userData) {
    return await User.create(userData);
  }

  async matchPassword(user, password) {
    return await user.matchPassword(password);
  }

  /**
   * Replace a user's wishlist.
   *
   * Uses a targeted update rather than load-mutate-save. Two reasons:
   *
   *   - `save()` runs every document hook and rewrites every path, so an
   *     unrelated write like this one dragged the password through the
   *     pre-save hook. That is what made #295 reachable from a wishlist
   *     click. The hook is fixed, but a write that only names the field it
   *     is changing cannot resurrect the problem.
   *   - It is one round trip instead of two, and it does not read the
   *     password hash into process memory to change a list of book ids.
   *
   * `runValidators` keeps the schema's array-of-strings constraint enforced,
   * which `save()` was giving us for free. Returns null for an unknown id,
   * as before.
   */
  async updateWishlist(userId, newWishlist) {
    return await User.findByIdAndUpdate(
      userId,
      { $set: { wishlist: newWishlist } },
      { new: true, runValidators: true }
    ).select('-password');
  }
}

export default new UserRepository();
