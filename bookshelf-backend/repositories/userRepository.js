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

  /*
   * Wishlist writes below are single atomic updates rather than
   * read-modify-write.
   *
   * `updateWishlist` above overwrites the whole array with a snapshot the
   * controller computed from a read it did earlier — and then reads the
   * document a second time before saving. Two toggles in flight at once (two
   * tabs, a double click, phone and laptop) and the second write clobbers the
   * first, silently. Add book A and book B simultaneously and exactly one of
   * them survives.
   *
   * $addToSet and $pull do the membership test and the mutation in one
   * operation on the server, so there is no window to lose an update in. It is
   * kept above because nothing else has been migrated off it yet.
   */

  /** Only the wishlist, and never the password hash. */
  #wishlistProjection = { wishlist: 1 };

  async getWishlist(userId) {
    const user = await User.findById(userId).select('wishlist').lean();
    return user ? user.wishlist ?? [] : null;
  }

  /**
   * Remove a book if it is present.
   *
   * Returns the new wishlist, or null when the book was not there — which is
   * how the caller learns whether the toggle removed or needs to add, without
   * a separate read that another request could invalidate.
   */
  async removeFromWishlist(userId, bookId) {
    const user = await User.findOneAndUpdate(
      { _id: userId, wishlist: bookId },
      { $pull: { wishlist: bookId } },
      { new: true, projection: this.#wishlistProjection }
    );

    return user ? user.wishlist : null;
  }

  /**
   * Add a book, unless the list is already at `maxSize`.
   *
   * The size check is part of the query rather than something the caller does
   * beforehand, so two concurrent adds cannot both see room for one entry.
   * Returns null when the guard rejected — the caller distinguishes "user
   * missing" from "list full" by looking the user up only in that case, which
   * keeps the common path to one round trip.
   */
  async addToWishlist(userId, bookId, { maxSize } = {}) {
    const filter = { _id: userId };

    if (maxSize !== undefined) {
      filter.$expr = { $lt: [{ $size: { $ifNull: ['$wishlist', []] } }, maxSize] };
    }

    const user = await User.findOneAndUpdate(
      filter,
      { $addToSet: { wishlist: bookId } },
      { new: true, projection: this.#wishlistProjection }
    );

    return user ? user.wishlist : null;
  }

  /**
   * Add several books at once, ignoring the ones already present.
   *
   * $each with $addToSet is what makes the merge idempotent — logging in twice
   * with the same local wishlist is a no-op the second time.
   */
  async addManyToWishlist(userId, bookIds, { maxSize } = {}) {
    const filter = { _id: userId };

    if (maxSize !== undefined) {
      // Bound the result, not the input: a merge of 50 into a list of 480 is
      // rejected rather than silently truncated, because a wishlist that
      // quietly drops entries is worse than one that says it is full.
      filter.$expr = {
        $lte: [{ $size: { $ifNull: ['$wishlist', []] } }, Math.max(0, maxSize - bookIds.length)],
      };
    }

    const user = await User.findOneAndUpdate(
      filter,
      { $addToSet: { wishlist: { $each: bookIds } } },
      { new: true, projection: this.#wishlistProjection }
    );

    return user ? user.wishlist : null;
  }

  async exists(userId) {
    return Boolean(await User.exists({ _id: userId }));
  }
}

export default new UserRepository();
