import React, { useMemo, useState } from "react";
import "./BookChapterList.css";

export default function BookChapterList({
  chapters = [],
  currentChapter = 1,
  variant = "blue",
  title = "Chapters",
  showProgress = true,
  searchable = true,
  onChapterSelect
}) {
  const [query, setQuery] = useState("");

  const filteredChapters = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return chapters;
    return chapters.filter((chapter, index) => {
      const number = chapter.number ?? index + 1;
      const name = chapter.title ?? `Chapter ${number}`;
      return `${number} ${name}`.toLowerCase().includes(value);
    });
  }, [chapters, query]);

  const completedCount = chapters.filter(chapter => chapter.completed).length;
  const progress = chapters.length
    ? Math.round((completedCount / chapters.length) * 100)
    : 0;

  return (
    <section className={`book-chapter-list book-chapter-list--${variant}`}>
      <div className="book-chapter-list__header">
        <div>
          <p className="book-chapter-list__eyebrow">Reading plan</p>
          <h3 className="book-chapter-list__title">{title}</h3>
        </div>
        <span className="book-chapter-list__count">
          {completedCount}/{chapters.length}
        </span>
      </div>

      {showProgress && (
        <div className="book-chapter-list__progress-wrap">
          <div className="book-chapter-list__progress">
            <span style={{ "--chapter-progress": `${progress}%` }} />
          </div>
          <strong>{progress}% complete</strong>
        </div>
      )}

      {searchable && (
        <label className="book-chapter-list__search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search chapters..."
            aria-label="Search chapters"
          />
        </label>
      )}

      <div className="book-chapter-list__items">
        {filteredChapters.length ? (
          filteredChapters.map((chapter, index) => {
            const number = chapter.number ?? index + 1;
            const active = number === currentChapter;

            return (
              <button
                key={chapter.id ?? number}
                type="button"
                className={[
                  "book-chapter-list__chapter",
                  active && "book-chapter-list__chapter--active",
                  chapter.completed && "book-chapter-list__chapter--completed"
                ].filter(Boolean).join(" ")}
                onClick={() => onChapterSelect?.(chapter, number)}
                aria-current={active ? "step" : undefined}
              >
                <span className="book-chapter-list__number">
                  {chapter.completed ? "✓" : number}
                </span>

                <span className="book-chapter-list__details">
                  <strong>{chapter.title ?? `Chapter ${number}`}</strong>
                  {chapter.subtitle && <small>{chapter.subtitle}</small>}
                  {chapter.duration && (
                    <small>{chapter.duration}</small>
                  )}
                </span>

                <span className="book-chapter-list__arrow" aria-hidden="true">
                  →
                </span>
              </button>
            );
          })
        ) : (
          <div className="book-chapter-list__empty">
            No chapters found.
          </div>
        )}
      </div>
    </section>
  );
}
