import React,{useState} from "react";
import "./BookSync.css";

export default function BookSync({
  lastSynced="Never",
  onSync=async()=>{}
}){
  const [loading,setLoading]=useState(false);
  const [syncedAt,setSyncedAt]=useState(lastSynced);

  const handleSync=async()=>{
    setLoading(true);
    try{
      await onSync();
      setSyncedAt(new Date().toLocaleString());
    }finally{
      setLoading(false);
    }
  };

  return(
    <div className="book-sync">
      <div className="book-sync__info">
        <h3>Book Sync</h3>
        <p>Last Synced: {syncedAt}</p>
      </div>
      <button
        className="book-sync__button"
        onClick={handleSync}
        disabled={loading}
      >
        {loading?"Syncing...":"Sync Now"}
      </button>
    </div>
  );
}
