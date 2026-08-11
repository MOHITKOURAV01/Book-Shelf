import React, { useState } from "react";
import "./FilterChips.css";

export default function FilterChips({
  options = [],
  value,
  defaultValue = [],
  multiple = true,
  onChange,
  clearable = true,
  showClearAll = true,
  className = ""
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selected = value ?? internalValue;

  const update = (next) => {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
  };

  const toggle = (option) => {
    if (option.disabled) return;

    const key = option.value ?? option.label;
    const next = multiple
      ? selected.includes(key)
        ? selected.filter((item) => item !== key)
        : [...selected, key]
      : selected.includes(key) ? [] : [key];

    update(next);
  };

  const clear = () => update([]);

  return (
    <div className={`filter-chips ${className}`}>
      <div className="filter-chips__list" role="group" aria-label="Filters">
        {options.map((option) => {
          const key = option.value ?? option.label;
          const active = selected.includes(key);

          return (
            <button
              key={key}
              type="button"
              className={`filter-chip ${active ? "filter-chip--active" : ""} ${
                option.disabled ? "filter-chip--disabled" : ""
              }`}
              disabled={option.disabled}
              aria-pressed={active}
              onClick={() => toggle(option)}
            >
              {option.icon && (
                <span className="filter-chip__icon" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>

              {active && clearable && (
                <span className="filter-chip__remove" aria-hidden="true">
                  ×
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showClearAll && selected.length > 0 && (
        <button
          type="button"
          className="filter-chips__clear"
          onClick={clear}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
