# 🏗️ Project Architecture

BookShelf follows a simple three-layer architecture consisting of the React frontend, Express backend, and JSON-based data storage. This design keeps the project lightweight, easy to understand, and beginner-friendly while maintaining a clear separation of concerns.

---

## High-Level Architecture

```text
                   ┌──────────────────────────┐
                   │      User (Browser)      │
                   └────────────┬─────────────┘
                                │
                                │ HTTP Requests
                                ▼
                   ┌──────────────────────────┐
                   │    React Frontend        │
                   │ (Vite + React Router)    │
                   └────────────┬─────────────┘
                                │
                                │ REST API Calls
                                ▼
                   ┌──────────────────────────┐
                   │ Express.js Backend API   │
                   │      (Node.js)           │
                   └────────────┬─────────────┘
                                │
               ┌────────────────┴────────────────┐
               │                                 │
               ▼                                 ▼
      books.json                         reviews.json
      Book Catalog                       User Reviews

(Optional)
               │
               ▼
      Open Library API / Google Books API
```

---

## Architecture Layers

### 1. Presentation Layer (Frontend)

The frontend is built using **React** and **Vite** and provides an interactive, responsive user interface.

Responsibilities include:

- Displaying books
- Managing routing
- Search and filtering
- Cart and wishlist management
- Checkout flow
- Dark mode
- API communication

---

### 2. Application Layer (Backend)

The backend is built with **Node.js** and **Express.js**.

Responsibilities include:

- Serving REST APIs
- Reading JSON data
- Writing reviews
- Processing search requests
- Filtering and sorting books
- Calculating cart totals
- Generating book recommendations

---

### 3. Data Layer

Instead of a database, BookShelf stores data in JSON files.

```
data/
├── books.json
└── reviews.json
```

Advantages:

- No database installation
- Easy setup
- Beginner-friendly
- Easy to edit and understand

---

## Request Flow

```text
User
   │
   ▼
React UI
   │
   ▼
API Request
   │
   ▼
Express Route
   │
   ▼
Controller
   │
   ▼
JSON File
   │
   ▼
Controller
   │
   ▼
API Response
   │
   ▼
React UI Updates
```

---

## Component Interaction

```text
Home Page
    │
    ├── Navbar
    ├── Search Bar
    ├── Filters
    ├── Book Cards
    └── Footer

Book Card
    │
    ├── Book Details
    ├── Add to Cart
    └── Wishlist

Cart
    │
    ├── Quantity Update
    ├── Remove Item
    └── Checkout
```

---

## Backend Module Structure

```text
server.js
    │
    ├── Routes
    │      │
    │      ├── books.js
    │      ├── cart.js
    │      └── reviews.js
    │
    ▼
Controllers
    │
    ├── booksController.js
    └── reviewsController.js
    │
    ▼
Utilities
    │
    └── fileHandler.js
    │
    ▼
JSON Data Files
```

---

## Design Principles

- Modular architecture
- Separation of concerns
- RESTful API design
- Beginner-friendly project structure
- Independent feature development
- Minimal merge conflicts
- Easy scalability for future enhancements

---

## Future Architecture Enhancements

- Database integration (MongoDB/PostgreSQL)
- User authentication (JWT/OAuth)
- Admin dashboard
- Payment gateway integration
- Cloud storage for book images
- Docker containerization
- CI/CD pipeline
- Automated testing
- Caching with Redis
- Microservices architecture (future)