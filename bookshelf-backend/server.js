const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const books = [
  { id: 'b1', title: 'The Quiet Ones', author: 'M. Arora', genre: 'Fiction', price: 349, rating: 4.5, cover: '#7A2E2E' },
  { id: 'b2', title: 'Field Notes', author: 'D. Kapoor', genre: 'Self-Help', price: 299, rating: 4.2, cover: '#1F4B43' },
  { id: 'b3', title: 'Half Moon Bay', author: 'S. Rhee', genre: 'Mystery', price: 399, rating: 4.7, cover: '#B85C2C' },
  { id: 'b4', title: 'Static', author: 'A. Voss', genre: 'Sci-Fi', price: 449, rating: 4.3, cover: '#3A3F63' },
  { id: 'b5', title: 'Low Tide', author: 'R. Menon', genre: 'Poetry', price: 249, rating: 4.6, cover: '#5F7A61' },
  { id: 'b6', title: 'The Long Corridor', author: 'K. Iyer', genre: 'Mystery', price: 379, rating: 4.1, cover: '#93461F' },
  { id: 'b7', title: 'Paper Moths', author: 'L. Fischer', genre: 'Fiction', price: 329, rating: 4.4, cover: '#2E4057' },
  { id: 'b8', title: 'Ordinary Weather', author: 'N. Basu', genre: 'Self-Help', price: 279, rating: 4.0, cover: '#7A5C2E' },
];

app.get("/", (req, res) => {
    res.send("Hello BookShelf API");
});

app.get("/api/books", (req, res) => {
    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    let genre = req.query.genre;
    let search = req.query.search;
    
    let filteredBooks = books;
    
    if (genre && genre !== 'All') {
        filteredBooks = filteredBooks.filter(b => b.genre === genre);
    }
    
    if (search) {
        const query = search.toLowerCase();
        filteredBooks = filteredBooks.filter(b => 
            b.title.toLowerCase().includes(query) || 
            b.author.toLowerCase().includes(query)
        );
    }
    
    // If pagination is not requested, return all books
    if (isNaN(page) || isNaN(limit)) {
        return res.json({
            books: filteredBooks,
            currentPage: 1,
            totalPages: 1,
            totalBooks: filteredBooks.length,
            limit: filteredBooks.length
        });
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
    
    res.json({
        books: paginatedBooks,
        currentPage: page,
        totalPages: Math.ceil(filteredBooks.length / limit),
        totalBooks: filteredBooks.length,
        limit: limit
    });
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
