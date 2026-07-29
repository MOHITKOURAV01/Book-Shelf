import { useMemo, useState } from 'react';


import ThemeToggle from './components/ThemeToggle.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import GenreFilter from './components/GenreFilter.jsx';
import BookCard from './components/BookCard.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import { books, genres } from './data/books.js';
import './App.css';

export default function App() {
  const [activeGenre, setActiveGenre] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const visibleBooks = useMemo(() => {
    if (activeGenre === 'All') return books;
    return books.filter((book) => book.genre === activeGenre);
  }, [activeGenre]);

  function handleAddToCart(book) {
    setCart((prev) => {
      const existingItem = prev.find(item => item.id === book.id);
      if (existingItem) {
        return prev.map(item => 
          item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...book, quantity: 1 }];
    });
    setIsCartOpen(true);
  }

  function handleUpdateQuantity(id, newQuantity) {
    if (newQuantity < 1) return;
    setCart((prev) => prev.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  }

  function handleRemoveItem(id) {
    setCart((prev) => prev.filter(item => item.id !== id));
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app">
      <ThemeToggle />
      <ScrollToTop />
      <CustomCursor />

      <Navbar cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />

      <div className="nav-spacer" />
      <Hero />

      <main className="catalog" id="catalog">
        <div className="catalog__inner">
          <div className="catalog__header">
            <h2 className="catalog__title">Browse the catalog</h2>
            <p className="catalog__count">{visibleBooks.length} titles</p>
          </div>

          <GenreFilter genres={genres} active={activeGenre} onSelect={setActiveGenre} />

          <div className="catalog__grid">
            {visibleBooks.map((book) => (
              <BookCard key={book.id} book={book} onAddToCart={handleAddToCart} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
