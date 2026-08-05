import React from 'react';
import './ShadowUtility.css';

export default function ShadowUtility({
  shadow='md',
  hover=false,
  rounded='md',
  className='',
  children
}){
  return (
    <div className={`shadow-util shadow-util--${shadow} shadow-util--rounded-${rounded} ${hover?'shadow-util--hover':''} ${className}`}>
      {children}
    </div>
  );
}
