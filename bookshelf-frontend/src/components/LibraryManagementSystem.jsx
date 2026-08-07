import React from 'react';
import './LibraryManagementSystem.css';
export default function LibraryManagementSystem({books=[],onBorrow=()=>{},onReturn=()=>{},title='Library Management System'}){
return <div className='library-system'><h2 className='library-system__title'>{title}</h2><div className='library-system__grid'>{books.length===0?<div className='library-system__empty'>No books available.</div>:books.map(book=><div className='library-card' key={book.id}><h3>{book.title}</h3><p><strong>Author:</strong> {book.author}</p><p><strong>Status:</strong> {book.available?'Available':'Borrowed'}</p>{book.available?<button onClick={()=>onBorrow(book)}>Borrow</button>:<button onClick={()=>onReturn(book)}>Return</button>}</div>)}</div></div>}
