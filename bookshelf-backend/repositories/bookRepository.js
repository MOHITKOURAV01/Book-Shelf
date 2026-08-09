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

            // Inventory Check
            if (book.inventory < item.quantity) {
                const error = new Error(`Insufficient inventory for book ${item.bookId}.`);
                error.status = 400;
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
