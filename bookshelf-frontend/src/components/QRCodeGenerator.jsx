import React from "react";
import QRCode from "react-qr-code";
import "./QRCodeGenerator.css";

export default function QRCodeGenerator({
  value="https://example.com",
  title="Scan QR Code",
  size=160,
  downloadName="qrcode"
}){
  const downloadQR=()=>{
    const svg=document.querySelector(".qr-generator svg");
    if(!svg) return;
    const data=new XMLSerializer().serializeToString(svg);
    const blob=new Blob([data],{type:"image/svg+xml"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`${downloadName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return(
    <div className="qr-generator">
      <h3>{title}</h3>
      <QRCode value={value} size={size}/>
      <p>{value}</p>
      <button onClick={downloadQR}>Download QR</button>
    </div>
  );
}
