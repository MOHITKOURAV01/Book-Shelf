import React,{useRef,useState} from "react";
import "./BulkUpload.css";

export default function BulkUpload({
  accept=".csv,.json",
  multiple=false,
  onUpload=()=>{}
}){
  const inputRef=useRef(null);
  const [files,setFiles]=useState([]);

  const handleChange=(e)=>{
    const selected=[...e.target.files];
    setFiles(selected);
    onUpload(selected);
  };

  return(
    <div className="bulk-upload">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        hidden
      />

      <div className="bulk-upload__dropzone"
           onClick={()=>inputRef.current?.click()}>
        <div className="bulk-upload__icon">📂</div>
        <h3>Bulk Upload</h3>
        <p>Click to select CSV or JSON files</p>
      </div>

      {files.length>0 && (
        <ul className="bulk-upload__list">
          {files.map(file=>(
            <li key={file.name} className="bulk-upload__item">
              <span>{file.name}</span>
              <span>{(file.size/1024).toFixed(1)} KB</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}