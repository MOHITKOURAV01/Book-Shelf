import React from "react";
import "./BookMetadata.css";

export default function BookMetadata({title="Book Metadata",metadata={},variant="primary",className=""}){
  return (
    <div className={`book-metadata book-metadata--${variant} ${className}`}>
      <h2 className="book-metadata__title">{title}</h2>
      <div className="book-metadata__grid">
        {Object.entries(metadata).map(([k,v])=>(
          <div className="book-metadata__row" key={k}>
            <span className="book-metadata__label">{k}</span>
            <span className="book-metadata__value">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
