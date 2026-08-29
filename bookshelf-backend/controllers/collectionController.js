import Collection from '../models/Collection.js';

// ── Get all collections for the current user ───────────────────────────────

export const getCollections = async (req, res, next) => {
  try {
    const collections = await Collection.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(collections.map((c) => ({ ...c, id: c._id.toString() })));
  } catch (error) {
    next(error);
  }
};

// ── Get a single collection by id ──────────────────────────────────────────

export const getCollection = async (req, res, next) => {
  try {
    const col = await Collection.findById(req.params.id).lean();
    if (!col) return res.status(404).json({ message: 'Collection not found' });
    if (col.userId.toString() !== req.user._id.toString() && !col.isPublic) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ ...col, id: col._id.toString() });
  } catch (error) {
    next(error);
  }
};

// ── Create a new collection ────────────────────────────────────────────────

export const createCollection = async (req, res, next) => {
  try {
    const { name, description, isPublic } = req.body;
    const col = await Collection.create({
      userId: req.user._id,
      name: name.trim(),
      description: description || '',
      isPublic: Boolean(isPublic),
    });
    res.status(201).json({ message: 'Collection created', collection: { ...col.toObject(), id: col._id.toString() } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A collection with that name already exists' });
    }
    next(error);
  }
};

// ── Update name / description / isPublic ───────────────────────────────────

export const updateCollection = async (req, res, next) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ message: 'Collection not found' });
    if (col.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { name, description, isPublic } = req.body;
    if (name !== undefined) col.name = name.trim();
    if (description !== undefined) col.description = description.trim();
    if (isPublic !== undefined) col.isPublic = Boolean(isPublic);
    const saved = await col.save();
    res.json({ message: 'Collection updated', collection: { ...saved.toObject(), id: saved._id.toString() } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A collection with that name already exists' });
    }
    next(error);
  }
};

// ── Delete a collection ────────────────────────────────────────────────────

export const deleteCollection = async (req, res, next) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ message: 'Collection not found' });
    if (col.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await col.deleteOne();
    res.json({ message: 'Collection deleted' });
  } catch (error) {
    next(error);
  }
};

// ── Add a book to a collection ─────────────────────────────────────────────

export const addBook = async (req, res, next) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ message: 'Collection not found' });
    if (col.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const bookId = String(req.body.bookId).trim();
    if (!bookId) return res.status(400).json({ message: 'bookId is required' });
    if (col.bookIds.includes(bookId)) {
      return res.status(409).json({ message: 'Book already in collection' });
    }
    col.bookIds.push(bookId);
    await col.save();
    res.json({ message: 'Book added', bookIds: col.bookIds });
  } catch (error) {
    next(error);
  }
};

// ── Remove a book from a collection ────────────────────────────────────────

export const removeBook = async (req, res, next) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ message: 'Collection not found' });
    if (col.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { bookId } = req.params;
    const idx = col.bookIds.indexOf(bookId);
    if (idx === -1) return res.status(404).json({ message: 'Book not in collection' });
    col.bookIds.splice(idx, 1);
    await col.save();
    res.json({ message: 'Book removed', bookIds: col.bookIds });
  } catch (error) {
    next(error);
  }
};
