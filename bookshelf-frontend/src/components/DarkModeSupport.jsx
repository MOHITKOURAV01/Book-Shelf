import React,{useEffect,useState} from 'react';
import './DarkModeSupport.css';

export default function DarkModeSupport({
  defaultTheme='light',
  storageKey='theme',
  onThemeChange=()=>{}
}){
  const [theme,setTheme]=useState(()=>{
    return localStorage.getItem(storageKey)||defaultTheme;
  });

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme',theme);
    localStorage.setItem(storageKey,theme);
    onThemeChange(theme);
  },[theme,storageKey,onThemeChange]);

  return(
    <div className="dark-mode-support">
      <span className="dark-mode-support__label">
        {theme==='dark'?'🌙 Dark Mode':'☀️ Light Mode'}
      </span>
      <button
        className="dark-mode-support__button"
        onClick={()=>setTheme(theme==='dark'?'light':'dark')}
      >
        Switch Theme
      </button>
    </div>
  );
}
