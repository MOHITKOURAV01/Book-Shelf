import React from "react";
import "./LanguageGenre.css";

export default function LanguageGenre({
  language="English",
  genre="Fiction",
  onLanguageClick=()=>{},
  onGenreClick=()=>{}
}){
  return (
    <div className="language-genre">
      <div
        className="language-genre__badge language"
        onClick={()=>onLanguageClick(language)}
        role="button"
        tabIndex={0}
      >
        🌍 {language}
      </div>

      <div
        className="language-genre__badge genre"
        onClick={()=>onGenreClick(genre)}
        role="button"
        tabIndex={0}
      >
        📚 {genre}
      </div>
    </div>
  );
}
