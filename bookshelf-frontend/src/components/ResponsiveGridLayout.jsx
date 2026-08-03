import "./ResponsiveGridLayout.css";

export default function ResponsiveGridLayout({ children }) {
  return (
    <div className="responsive-grid">
      {children}
    </div>
  );
}
