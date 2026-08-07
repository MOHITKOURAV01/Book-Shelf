import React from "react";
import "./MultipleColorVariants.css";

export default function MultipleColorVariants({
  text="Color Variant",
  variant="primary",
  rounded="md",
  outlined=false,
  onClick=()=>{},
  className=""
}){
  return (
    <button
      className={`color-variant color-variant--${variant} color-variant--rounded-${rounded} ${outlined?"color-variant--outlined":""} ${className}`}
      onClick={onClick}
    >
      {text}
    </button>
  );
}
