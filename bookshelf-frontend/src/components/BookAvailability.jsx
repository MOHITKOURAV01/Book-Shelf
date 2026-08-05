import React from "react";
import "./BookAvailability.css";
export default function BookAvailability({status="In Stock",quantity=12,showQuantity=true,onNotify=()=>{}}){
const available=status.toLowerCase().includes("in");
return(<div className={`book-availability ${available?"available":"unavailable"}`}>
<span className="book-availability__dot"></span>
<div className="book-availability__content">
<h4>{status}</h4>
{showQuantity&&available&&<p>{quantity} copies available</p>}
{!available&&<button onClick={onNotify}>Notify Me</button>}
</div></div>);
}