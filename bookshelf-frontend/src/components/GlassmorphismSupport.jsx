import React from "react";
import "./GlassmorphismSupport.css";

export default function GlassmorphismSupport({
  title="Glass Card",
  subtitle="Beautiful frosted glass effect",
  blur=16,
  opacity=0.2,
  rounded="md",
  shadow="md",
  children,
  className=""
}){
  return (
    <div
      className={`glass-card glass-card--rounded-${rounded} glass-card--shadow-${shadow} ${className}`}
      style={{
        backdropFilter:`blur(${blur}px)`,
        WebkitBackdropFilter:`blur(${blur}px)`,
        background:`rgba(255,255,255,${opacity})`
      }}
    >
      <h2 className="glass-card__title">{title}</h2>
      <p className="glass-card__subtitle">{subtitle}</p>
      <div className="glass-card__content">
        {children || "Place any React content here."}
      </div>
    </div>
  );
}
