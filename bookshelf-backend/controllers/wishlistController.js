import userRepository from '../repositories/userRepository.js';

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const user = await userRepository.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Toggle book in wishlist
// @route   POST /api/wishlist
// @access  Private
export const toggleWishlist = async (req, res) => {
  try {
    const { bookId } = req.body;
    
    if (!bookId) {
      return res.status(400).json({ message: 'Book ID is required' });
    }

    const user = await userRepository.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let updatedWishlist = [...user.wishlist];
    const index = updatedWishlist.indexOf(bookId);
    if (index > -1) {
      updatedWishlist.splice(index, 1);
    } else {
      updatedWishlist.push(bookId);
    }

    await userRepository.updateWishlist(req.user._id, updatedWishlist);
    res.json(updatedWishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Merge local wishlist to user account
// @route   POST /api/wishlist/merge
// @access  Private
export const mergeWishlist = async (req, res) => {
  try {
    const { localWishlist } = req.body;
    
    if (!Array.isArray(localWishlist)) {
      return res.status(400).json({ message: 'localWishlist array is required' });
    }

    const user = await userRepository.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Merge unique values
    const merged = new Set([...user.wishlist, ...localWishlist]);
    const updatedWishlist = Array.from(merged);

    await userRepository.updateWishlist(req.user._id, updatedWishlist);
    res.json(updatedWishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
