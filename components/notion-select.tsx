"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

const defaultColors = [
  "bg-blue-500/20 text-blue-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-purple-500/20 text-purple-400",
  "bg-amber-500/20 text-amber-400",
  "bg-red-500/20 text-red-400",
  "bg-pink-500/20 text-pink-400",
  "bg-cyan-500/20 text-cyan-400",
];

function getOptionColor(index: number, custom?: string) {
  return custom || defaultColors[index % defaultColors.length];
}

interface NotionSingleSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function NotionSingleSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
}: NotionSingleSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const selectedIdx = options.findIndex((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/50 text-sm hover:bg-accent/50 transition-colors text-left min-h-[40px]"
      >
        {selected ? (
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              getOptionColor(selectedIdx, selected.color)
            )}
          >
            {selected.label}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full rounded-md border border-border bg-popover shadow-lg py-1 max-h-60 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-accent/50 transition-colors",
                value === opt.value && "bg-accent/30"
              )}
            >
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  getOptionColor(idx, opt.color)
                )}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface NotionMultiSelectProps {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function NotionMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
}: NotionMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 flex-wrap px-3 py-2 rounded-md border border-border bg-card/50 text-sm hover:bg-accent/50 transition-colors text-left min-h-[40px]"
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          value.map((v) => {
            const idx = options.findIndex((o) => o.value === v);
            const opt = options[idx];
            return (
              <span
                key={v}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  getOptionColor(idx, opt?.color)
                )}
              >
                {opt?.label || v}
              </span>
            );
          })
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full rounded-md border border-border bg-popover shadow-lg py-1 max-h-60 overflow-y-auto">
          {options.map((opt, idx) => {
            const isSelected = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-accent/50 transition-colors",
                  isSelected && "bg-accent/30"
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded border border-border flex items-center justify-center flex-shrink-0",
                    isSelected && "bg-primary border-primary"
                  )}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    getOptionColor(idx, opt.color)
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
