import React, { useMemo, useState } from "react";
import "./FavoriteBooks.css";

export default function FavoriteBooks({

    books = [],

    loading = false,

    onSelect = () => {},

    onRemove = () => {},

    onShare = () => {},

    onAddToCart = () => {},

    onToggleFavorite = () => {}

}) {

    const [search, setSearch] = useState("");

    const [sort, setSort] = useState("asc");

    const filteredBooks = useMemo(() => {

        let list = books.filter(book =>

            book.title.toLowerCase().includes(search.toLowerCase()) ||

            book.author.toLowerCase().includes(search.toLowerCase())

        );

        list.sort((a,b)=>{

            if(sort==="asc"){

                return a.title.localeCompare(b.title);

            }

            return b.title.localeCompare(a.title);

        });

        return list;

    },[books,search,sort]);

    if(loading){

        return(

            <div className="favorite-books__loading">

                Loading favorite books...

            </div>

        );

    }

    if(filteredBooks.length===0){

        return(

            <div className="favorite-books__empty">

                ❤️ No favorite books found.

            </div>

        );

    }

    return(

        <section className="favorite-books">

            <div className="favorite-books__toolbar">

                <input

                    type="text"

                    placeholder="Search favorites..."

                    value={search}

                    onChange={(e)=>setSearch(e.target.value)}

                />

                <select

                    value={sort}

                    onChange={(e)=>setSort(e.target.value)}

                >

                    <option value="asc">

                        A - Z

                    </option>

                    <option value="desc">

                        Z - A

                    </option>

                </select>

            </div>

            <p className="favorite-books__count">

                {filteredBooks.length} Favorite Books

            </p>

            {filteredBooks.map(book=>(

                <article

                    className="favorite-book"

                    key={book.id}

                >

                    <div

                        className="favorite-book__cover"

                        style={{

                            background:

                            book.cover ||

                            "#2563eb"

                        }}

                    >

                        {book.title.charAt(0)}

                    </div>

                    <div className="favorite-book__content">

                        <h3>

                            {book.title}

                        </h3>

                        <p>

                            {book.author}

                        </p>

                        <span className="favorite-book__genre">

                            {book.genre || "General"}

                        </span>

                        <div className="favorite-book__meta">

                            <span>

                                ⭐ {book.rating || 0}

                            </span>

                            <span>

                                ₹{book.price || 0}

                            </span>

                            <span>

                                📅 {book.year || "N/A"}

                            </span>

                        </div>

                        <span

                            className={`favorite-book__stock ${
                                book.inStock

                                ? "in-stock"

                                : "out-stock"

                            }`}

                        >

                            {

                                book.inStock

                                ? "In Stock"

                                : "Out of Stock"

                            }

                        </span>

                    </div>

                    <div className="favorite-book__actions">

                        <button

                            onClick={()=>onSelect(book)}

                        >

                            👀 View

                        </button>

                        <button

                            onClick={()=>

                                onAddToCart(book)

                            }

                        >

                            🛒 Cart

                        </button>

                        <button

                            onClick={()=>onShare(book)}

                        >

                            📤 Share

                        </button>

                        <button

                            onClick={()=>

                                onToggleFavorite(book)

                            }

                        >

                            ❤️

                        </button>

                        <button

                            onClick={()=>

                                onRemove(book.id)

                            }

                        >

                            🗑 Remove

                        </button>

                    </div>

                </article>

            ))}

        </section>

    );

}