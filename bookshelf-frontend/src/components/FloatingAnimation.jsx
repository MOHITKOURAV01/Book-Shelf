import React from "react";
import "./FloatingAnimation.css";

export default function FloatingAnimation({
  children="Floating Element",
  duration=3,
  distance=8,
  paused=false,
  className=""
}){
  return (
    <div
      className={`floating-animation ${paused?"floating-animation--paused":""} ${className}`}
      style={{
        "--float-duration":`${duration}s`,
        "--float-distance":`${distance}px`
      }}
    >
      {children}
    </div>
  );
}
