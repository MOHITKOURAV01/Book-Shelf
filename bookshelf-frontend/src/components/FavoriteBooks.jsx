import React, { useMemo, useState } from "react";
import "./FavoriteBooksEmpty.css";

export default function FavoriteBooks({

    books = [],

    loading = false,

    onBrowse = () => {},

    onView = () => {},

    onRemove = () => {},

    onShare = () => {},

    onAddToCart = () => {}

}) {

    const [search,setSearch]=useState("");

    const filteredBooks=useMemo(()=>{

        return books.filter(book=>

            book.title
                .toLowerCase()
                .includes(search.toLowerCase())

            ||

            book.author
                .toLowerCase()
                .includes(search.toLowerCase())

        );

    },[books,search]);

    if(loading){

        return(

            <div className="favorite-empty">

                <div className="favorite-empty__spinner"/>

                <h2>Loading Favorites...</h2>

            </div>

        );

    }

    if(filteredBooks.length===0){

        return(

            <div className="favorite-empty">

                <div className="favorite-empty__icon">

                    ❤️

                </div>

                <h2 className="favorite-empty__title">

                    No Favorite Books Yet

                </h2>

                <p className="favorite-empty__description">

                    You haven't added any books to your favorites.

                    Browse the library and start building your

                    personal collection.

                </p>

                <button

                    className="favorite-empty__button"

                    onClick={onBrowse}

                >

                    Browse Books

                </button>

            </div>

        );

    }

    return(

        <section className="favorite-list">

            <div className="favorite-list__header">

                <h2>

                    Favorite Books

                </h2>

                <span>

                    {filteredBooks.length} Books

                </span>

            </div>

            <input

                className="favorite-list__search"

                type="text"

                placeholder="Search favorite books..."

                value={search}

                onChange={(e)=>

                    setSearch(e.target.value)

                }

            />

            {filteredBooks.map(book=>(

                <article

                    key={book.id}

                    className="favorite-card"

                >

                    <div

                        className="favorite-card__cover"

                        style={{

                            background:

                            book.cover ||

                            "#2563eb"

                        }}

                    >

                        {book.title.charAt(0)}

                    </div>

                    <div

                        className="favorite-card__content"

                    >

                        <h3>

                            {book.title}

                        </h3>

                        <p>

                            {book.author}

                        </p>

                        <div className="favorite-card__meta">

                            <span>

                                ⭐ {book.rating || 0}

                            </span>

                            <span>

                                ₹ {book.price || 0}

                            </span>

                            <span>

                                📅 {book.year || "N/A"}

                            </span>

                        </div>

                        <span className="favorite-card__genre">

                            {book.genre || "General"}

                        </span>

                        <span

                            className={`favorite-card__stock ${

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

                    <div className="favorite-card__actions">

                        <button

                            onClick={()=>onView(book)}

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

                                onRemove(book.id)

                            }

                        >

                            ❤️ Remove

                        </button>

                    </div>

                </article>

            ))}

        </section>

    );

}