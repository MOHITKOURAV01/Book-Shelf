import "./HoverActiveAnimations.css";

export default function HoverActiveAnimations({ children, className="" }) {
  return (
    <div className={`hover-active ${className}`}>
      {children}
    </div>
  );
}
