import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cacheManager from '../utils/cacheManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const booksFilePath = path.join(__dirname, '../data/books.json');

export const getBooks = () => {
    // 1. Check Cache
    const cachedBooks = cacheManager.get('books');
    if (cachedBooks) {
        return cachedBooks;
    }

    // 2. Cache Miss: Read from Disk
    try {
        const data = fs.readFileSync(booksFilePath, 'utf8');
        const books = JSON.parse(data);
        
        // 3. Store in Cache
        cacheManager.set('books', books);
        return books;
    } catch (error) {
        console.error('Error reading books data:', error);
        return [];
    }
};

export const getBookById = (id) => {
    const books = getBooks();
    return books.find(book => book.id === id);
};

export const updateInventoryWithOCC = (itemsToUpdate) => {
    // itemsToUpdate is an array of { bookId, quantity, expectedVersion }
    try {
        const data = fs.readFileSync(booksFilePath, 'utf8');
        const books = JSON.parse(data);
        
        // 1. Validation phase (Verify all items before any mutation)
        const bookIndices = [];
        for (const item of itemsToUpdate) {
            const bookIndex = books.findIndex(b => b.id === item.bookId);
            if (bookIndex === -1) {
                const error = new Error(`Book not found: ${item.bookId}`);
                error.status = 404;
                throw error;
            }

            const book = books[bookIndex];

            // Version Check (Optimistic Concurrency Control)
            if (book.__v !== item.expectedVersion) {
                const error = new Error(`Version mismatch for book ${item.bookId}: Another transaction updated this book.`);
                error.status = 409;
                throw error;
            }

            // Quantity check.
            //
            // The inventory check below is `book.inventory < item.quantity`,
            // which a negative quantity passes trivially — `8 < -5` is false.
            // The mutation phase then ran `inventory -= -5` and *added* five
            // units to the catalogue on disk. The controller validates its
            // input now, but a repository that can be talked into minting
            // stock should not be one refactor away from being reachable
            // again. See #297.
            if (!Number.isInteger(item.quantity) || item.quantity < 1) {
                const error = new Error(
                    `Quantity for book ${item.bookId} must be a positive integer, received ${item.quantity}.`
                );
                error.status = 400;
                throw error;
            }

            // Inventory Check
            if (book.inventory < item.quantity) {
                const error = new Error(`Insufficient inventory for book ${item.bookId}.`);
                error.status = 409;
                throw error;
            }

            bookIndices.push({ index: bookIndex, quantity: item.quantity });
        }

        // 2. Mutation phase
        for (const { index, quantity } of bookIndices) {
            books[index].inventory -= quantity;
            books[index].__v += 1;
        }

        // 3. Write back synchronously
        fs.writeFileSync(booksFilePath, JSON.stringify(books, null, 2), 'utf8');

        // 4. Invalidate Cache after modification
        cacheManager.del('books');

        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * Put reserved stock back.
 *
 * Inventory is taken before the payment intent exists, because the alternative
 * is overselling between the two steps. The consequence is that every failure
 * after the reservation has to hand the units back, or a failed checkout
 * silently destroys stock — with inventories of 8 to 10, a handful of Stripe
 * errors took the shop to zero. See #297.
 *
 * Deliberately *not* version-checked. This is a compensating action for a
 * reservation that already happened; refusing to run because someone else
 * bought a copy in between would leave the units lost, which is the outcome
 * it exists to prevent. Unknown ids are skipped rather than thrown on, for
 * the same reason.
 *
 * Never throws. Callers reach this from an error path and must not lose the
 * original error to a secondary failure — the return value says what
 * happened instead.
 */
export const restoreInventory = (itemsToRestore) => {
    if (!Array.isArray(itemsToRestore) || itemsToRestore.length === 0) {
        return { restored: [], failed: [] };
    }

    try {
        const data = fs.readFileSync(booksFilePath, 'utf8');
        const books = JSON.parse(data);

        const restored = [];
        const failed = [];

        for (const item of itemsToRestore) {
            if (!Number.isInteger(item.quantity) || item.quantity < 1) {
                failed.push({ bookId: item.bookId, reason: 'invalid quantity' });
                continue;
            }

            const bookIndex = books.findIndex((b) => b.id === item.bookId);

            if (bookIndex === -1) {
                failed.push({ bookId: item.bookId, reason: 'book not found' });
                continue;
            }

            books[bookIndex].inventory += item.quantity;
            books[bookIndex].__v += 1;
            restored.push({ bookId: item.bookId, quantity: item.quantity });
        }

        if (restored.length > 0) {
            fs.writeFileSync(booksFilePath, JSON.stringify(books, null, 2), 'utf8');
            cacheManager.del('books');
        }

        return { restored, failed };
    } catch (error) {
        // Losing stock is bad; losing the error that explains why the
        // checkout failed in the first place is worse.
        console.error('Failed to restore reserved inventory:', error);
        return {
            restored: [],
            failed: itemsToRestore.map((item) => ({
                bookId: item.bookId,
                reason: error.message,
            })),
        };
    }
};
