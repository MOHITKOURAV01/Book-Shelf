import React from "react";
import "./ReusableComponent.css";

export default function ReusableComponent({
  as: Component="div",
  title="Reusable Component",
  subtitle="Reusable React UI component",
  icon="📦",
  children,
  disabled=false,
  onClick=()=>{},
  className=""
}){
  return (
    <Component
      className={`reusable-card ${disabled?"reusable-card--disabled":""} ${className}`}
      onClick={disabled?undefined:onClick}
      aria-disabled={disabled}
      tabIndex={disabled?-1:0}
    >
      <div className="reusable-card__icon">{icon}</div>
      <div className="reusable-card__content">
        <h3>{title}</h3>
        <p>{subtitle}</p>
        {children}
      </div>
    </Component>
  );
}
