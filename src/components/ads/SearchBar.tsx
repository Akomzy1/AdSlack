"use client";

import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SUGGESTIONS = [
  "vitamin C serum", "dog food", "collagen", "sleep formula",
  "home gym", "AI bookkeeping", "sculpting jeans", "travel insurance",
  "language learning", "web dev bootcamp",
];

export function SearchBar({
  value,
  onChange,
  placeholder = "Search by hook text, brand, or product…",
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedValue = useDebounce(inputValue, 300);

  // Propagate debounced value up
  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  // Sync if external value changes (e.g., "Clear All")
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredSuggestions =
    inputValue.length > 0
      ? SUGGESTIONS.filter((s) =>
          s.toLowerCase().includes(inputValue.toLowerCase())
        ).slice(0, 5)
      : SUGGESTIONS.slice(0, 6);

  function handleSelect(suggestion: string) {
    setInputValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  }

  function handleClear() {
    setInputValue("");
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <div
        className={[
          "flex items-center gap-3 rounded-xl border bg-surface-2 px-4 py-2.5 transition-all duration-150",
          focused
            ? "border-accent shadow-[0_0_0_3px_rgba(249,115,22,0.1)]"
            : "border-border hover:border-border-hover",
        ].join(" ")}
      >
        {/* Search icon */}
        <svg
          className={`h-4 w-4 shrink-0 transition-colors ${focused ? "text-accent" : "text-muted"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />

        {/* Clear button */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-muted transition-colors hover:bg-border hover:text-foreground"
          >
            <span className="text-[10px] leading-none">✕</span>
          </button>
        )}

        {/* Keyboard shortcut hint */}
        {!inputValue && !focused && (
          <kbd className="hidden rounded border border-border bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
            /
          </kbd>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              {inputValue ? "Suggestions" : "Popular searches"}
            </p>
          </div>
          {filteredSuggestions.length > 0 ? (
            <ul>
              {filteredSuggestions.map((s) => (
                <li key={s}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(s);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground-2 transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span>
                      {inputValue ? (
                        <HighlightMatch text={s} query={inputValue} />
                      ) : (
                        s
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-xs text-muted">No suggestions found</p>
          )}
          <div className="border-t border-border px-4 py-2">
            <p className="text-[10px] text-muted">
              Press <kbd className="font-mono">Enter</kbd> to search
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/25 text-foreground">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
