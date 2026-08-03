import React from "react";
import "./VerifiedPurchaseBadge.css";
export default function VerifiedPurchaseBadge({verified=true,label="Verified Purchase",icon="✔️",variant="success",className=""}){
if(!verified) return null;
return(
<span className={`verified-badge verified-badge--${variant} ${className}`} role="status" aria-label={label}>
<span className="verified-badge__icon">{icon}</span>
<span className="verified-badge__text">{label}</span>
</span>
);
}