"use client";

import { useEffect, useRef, useState } from "react";
import { ITALIAN_UNIVERSITY_DOMAINS } from "@mira/domain";

const UNIVERSITIES = [...ITALIAN_UNIVERSITY_DOMAINS].sort((a, b) => a.name.localeCompare(b.name, "it"));

interface Props {
  value: string;
  onChange: (name: string) => void;
  inputClassName: string;
}

export function UniversityCombobox({ value, onChange, inputClassName }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const filtered = query.trim()
    ? UNIVERSITIES.filter((u) => u.name.toLowerCase().includes(query.trim().toLowerCase()))
    : UNIVERSITIES;

  function select(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <input
        type="text"
        required
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(""); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Cerca la tua università..."
        className={inputClassName}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-body-sm text-ink-tertiary">Nessuna università trovata.</p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.domain}
                type="button"
                onClick={() => select(u.name)}
                className="block w-full text-left px-4 py-2.5 text-body-sm text-ink hover:bg-navy-50 transition-colors duration-100"
              >
                {u.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
