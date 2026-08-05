import React, { useState } from "react";
import "./ISBNCopy.css";

export default function ISBNCopy({
  isbn="978-1-23456-789-0",
  label="ISBN",
  onCopy=()=>{}
}){
  const [copied,setCopied]=useState(false);

  const copyISBN=async()=>{
    try{
      await navigator.clipboard.writeText(isbn);
      setCopied(true);
      onCopy(isbn);
      setTimeout(()=>setCopied(false),2000);
    }catch(err){
      console.error(err);
      alert("Failed to copy ISBN");
    }
  };

  return(
    <div className="isbn-copy">
      <div className="isbn-copy__content">
        <span className="isbn-copy__label">{label}</span>
        <span className="isbn-copy__value">{isbn}</span>
      </div>

      <button className="isbn-copy__button" onClick={copyISBN}>
        {copied ? "Copied!" : "Copy ISBN"}
      </button>
    </div>
  );
}
