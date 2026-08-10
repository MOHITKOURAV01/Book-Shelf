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

  async updateWishlist(userId, newWishlist) {
    const user = await User.findById(userId);
    if (!user) return null;
    user.wishlist = newWishlist;
    await user.save();
    return user;
  }
}

export default new UserRepository();
