import React,{useState} from "react";
import "./TooltipSupport.css";

export default function TooltipSupport({
  text="Hover me",
  tooltip="Tooltip text",
  position="top",
  delay=200,
  className=""
}){
  const [visible,setVisible]=useState(false);
  let timer;

  const show=()=>{
    timer=setTimeout(()=>setVisible(true),delay);
  };

  const hide=()=>{
    clearTimeout(timer);
    setVisible(false);
  };

  return(
    <div
      className={`tooltip tooltip--${position} ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
    >
      <button className="tooltip__trigger">{text}</button>

      {visible && (
        <div className="tooltip__content" role="tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
}
