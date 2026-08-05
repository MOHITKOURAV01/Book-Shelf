import React from 'react';
import './BookDimensions.css';

export default function BookDimensions({
  width='15 cm',
  height='23 cm',
  thickness='2.5 cm',
  unit='Dimensions',
  icon='📐',
  variant='primary',
  className=''
}){
  return (
    <div className={`book-dimensions book-dimensions--${variant} ${className}`}>
      <div className="book-dimensions__header">
        <span className="book-dimensions__icon">{icon}</span>
        <h3>{unit}</h3>
      </div>
      <div className="book-dimensions__grid">
        <div><span>Width</span><strong>{width}</strong></div>
        <div><span>Height</span><strong>{height}</strong></div>
        <div><span>Thickness</span><strong>{thickness}</strong></div>
      </div>
    </div>
  );
}
