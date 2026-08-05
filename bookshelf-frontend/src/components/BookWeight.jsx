import React from 'react';
import './BookWeight.css';
export default function BookWeight({weight='450 g',unit='Weight',icon='⚖️',variant='primary',showIcon=true,className=''}) {
return (
<div className={`book-weight book-weight--${variant} ${className}`}>
{showIcon && <span className='book-weight__icon'>{icon}</span>}
<div className='book-weight__content'>
<span className='book-weight__label'>{unit}</span>
<strong className='book-weight__value'>{weight}</strong>
</div>
</div>);
}