import React from "react";
import "./ResponsiveLayout.css";

export default function ResponsiveLayout({children,title="Responsive Layout Demo"}){
  return (
    <div className="layout">
      <header className="layout__header">
        <h1>{title}</h1>
      </header>

      <main className="layout__grid">
        <section className="layout__card">Card 1</section>
        <section className="layout__card">Card 2</section>
        <section className="layout__card">Card 3</section>
        <section className="layout__card">Card 4</section>
      </main>

      <section className="layout__content">
        {children || <p>This responsive layout automatically adapts to desktop, tablet, and mobile screens.</p>}
      </section>
    </div>
  );
}
