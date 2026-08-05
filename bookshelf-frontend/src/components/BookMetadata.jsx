import React from "react";
import "./BookMetadata.css";

export default function BookMetadata({
  title="The Great Book",
  author="Unknown Author",
  publisher="Open Library",
  published="2025",
  language="English",
  genre="Fiction",
  pages=320,
  isbn="978-1-23456-789-0",
  rating=4.8,
  reviews=120,
  price="₹499",
  stock="In Stock",
  format="Paperback"
}){
  const rows=[
    ["Author",author],
    ["Publisher",publisher],
    ["Published",published],
    ["Language",language],
    ["Genre",genre],
    ["Pages",pages],
    ["ISBN",isbn],
    ["Format",format],
    ["Rating",`${rating} ⭐ (${reviews} reviews)`],
    ["Price",price],
    ["Stock",stock]
  ];
  return (
    <section className="book-metadata">
      <h2 className="book-metadata__title">{title}</h2>
      <div className="book-metadata__grid">
        {rows.map(([k,v])=>(
          <div className="book-metadata__row" key={k}>
            <span className="book-metadata__label">{k}</span>
            <span className="book-metadata__value">{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
