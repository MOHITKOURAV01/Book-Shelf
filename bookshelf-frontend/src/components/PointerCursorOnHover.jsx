import "./PointerCursorOnHover.css";

export default function PointerCursorOnHover({
  children,
  className = "",
}) {
  return (
    <div className={`pointer-hover ${className}`}>
      {children}
    </div>
  );
}
