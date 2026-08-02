import React from "react";
import "./ReadingProgressBar.css";

export default function ReadingProgressBar({
  currentPage=45,
  totalPages=300,
  showLabel=true,
  color="#2563eb"
}){
  const progress=Math.min(100,Math.max(0,(currentPage/totalPages)*100));
  return(
    <div className="reading-progress">
      {showLabel && (
        <div className="reading-progress__header">
          <span>Reading Progress</span>
          <span>{currentPage}/{totalPages} pages ({Math.round(progress)}%)</span>
        </div>
      )}
      <div className="reading-progress__track">
        <div
          className="reading-progress__fill"
          style={{width:`${progress}%`,background:color}}
        />
      </div>
    </div>
  );
}
