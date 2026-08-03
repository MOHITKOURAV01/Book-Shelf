# 📚 BookShelf – Open Source Book E-Commerce Platform

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933)
![Express](https://img.shields.io/badge/Framework-Express-black)
![Open Source](https://img.shields.io/badge/Open%20Source-Friendly-success)

---

# Table of Contents

- Overview
- Features
- Tech Stack
- Architecture
- Project Structure
- Installation
- Running the Project
- API Endpoints
- Frontend Pages
- Data Storage
- Future Enhancements
- Testing
- Contributing
- License

---

# Overview

BookShelf is an open-source full-stack book-selling e-commerce platform designed specifically for beginners and experienced contributors.

Unlike traditional e-commerce projects that require databases and cloud deployment, BookShelf stores all data in JSON files, making it extremely easy to set up and contribute.

The project follows a modular architecture where contributors can work independently on pages, UI components, APIs, or datasets with minimal merge conflicts.

---

# Features

## Frontend

- Responsive Home Page
- Genre-wise Book Listing
- Book Details Page
- Search Books
- Live Search Filtering
- Sort Books
- Filter Books
- Shopping Cart
- Wishlist
- Mock Checkout
- Dark Mode
- Loading Skeletons
- Empty States

---

## Backend

- REST APIs
- Book Catalog API
- Search API
- Filter API
- Cart Total Calculation
- Review Submission
- Recommendation API
- JSON-based Data Storage

---

# Tech Stack

## Frontend

- React
- Vite
- React Router
- CSS / Tailwind CSS
- React Context API

---

## Backend

- Node.js
- Express.js

---

## Storage

- JSON Files

No SQL or NoSQL database is required.

---

# Architecture

```
                 React Frontend

          ↓ HTTP Requests (REST)

            Express.js Backend

          ↓ Read / Write JSON Files

              books.json
             reviews.json
```

---

# Project Structure

## Frontend

```
bookshelf-frontend/

src/
│
├── components/
│   ├── Navbar/
│   ├── Footer/
│   ├── Filters/
│   ├── CartDrawer/
│   ├── BookCard/
│
├── pages/
│   ├── Home/
│   ├── GenrePage/
│   ├── BookDetail/
│   ├── Cart/
│   └── Checkout/
│
├── context/
│   └── CartContext.jsx
│
├── services/
│   └── api.js
│
├── App.jsx
└── main.jsx
```

---

## Backend

```
bookshelf-backend/

data/
│
├── books.json
└── reviews.json

routes/
│
├── books.js
├── cart.js
└── reviews.js

controllers/
│
├── booksController.js
└── reviewsController.js

utils/
└── fileHandler.js

server.js
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/BookShelf.git
```

---

## Frontend Setup

```bash
cd bookshelf-frontend
npm install
npm run dev
```

Runs on:

```
http://localhost:5173
```

---

## Backend Setup

```bash
cd bookshelf-backend
npm install
npm start
```

Runs on:

```
http://localhost:5000
```

---

# Running the Project

Start the backend first.

```bash
npm start
```

Then start the frontend.

```bash
npm run dev
```

Visit

```
http://localhost:5173
```

---

# API Endpoints

## Get All Books

```
GET /api/books
```

---

## Search Books

```
GET /api/books/search?q=harry
```

---

## Filter Books

```
GET /api/books?genre=Fantasy
```

---

## Sort Books

```
GET /api/books?sort=price
```

---

## Recommendations

```
GET /api/books/recommend/:id
```

---

## Submit Review

```
POST /api/reviews
```

Example Body

```json
{
  "bookId": 1,
  "rating": 5,
  "review": "Amazing book!"
}
```

---

## Cart Total

```
POST /api/cart/total
```

---

# Frontend Pages

### Home

- Featured Books
- Trending Books
- Categories

### Genre Page

- Books by Genre

### Book Detail

- Book Information
- Reviews
- Recommendations

### Cart

- Quantity Update
- Remove Items

### Checkout

- Order Summary
- Mock Payment

---

# Data Storage

The project uses JSON files instead of a database.

```
data/books.json
```

Contains

- Title
- Author
- Genre
- Price
- Rating
- Description

```
data/reviews.json
```

Contains

- Book ID
- Username
- Rating
- Review

---

# Future Enhancements

- User Authentication
- Admin Dashboard
- Payment Gateway
- Order History
- Inventory Management
- Book Recommendations using AI
- Email Notifications
- Multi-language Support
- Progressive Web App (PWA)

---

# Testing

Frontend

```bash
npm test
```

Backend

```bash
npm test
```

---

# Contributing

We welcome contributions from developers of all experience levels.

You can contribute by:

- Adding new genres
- Improving UI components
- Writing APIs
- Fixing bugs
- Updating documentation
- Adding animations
- Improving accessibility
- Adding book datasets

Please read the **CONTRIBUTING.md** before submitting a Pull Request.

---

# License

This project is licensed under the MIT License.

See the LICENSE file for more information.

---

# Acknowledgements

- React
- Node.js
- Express.js
- Vite
- Tailwind CSS
- Open Library API
- Google Books API
- Open Source Community

---

## Project Vision

BookShelf aims to become one of the best beginner-friendly open-source e-commerce projects by providing a real-world development experience without the complexity of database setup. Contributors can learn modern web development, collaborate effectively, and build meaningful features while helping grow the open-source community.