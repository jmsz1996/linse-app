"use client";

import { useLocale } from "@/components/guest/locale-provider";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

function FlagMX() {
  return (
    <svg viewBox="0 0 28 20" className="h-full w-full" aria-hidden>
      <rect width="9.34" height="20" fill="#006847" />
      <rect x="9.33" width="9.34" height="20" fill="#ffffff" />
      <rect x="18.66" width="9.34" height="20" fill="#ce1126" />
      {/* simplified emblem so it reads as Mexico (not Italy) */}
      <circle cx="14" cy="10" r="2.1" fill="none" stroke="#7d6a3a" strokeWidth="0.7" />
      <circle cx="14" cy="10" r="0.7" fill="#5a7d3a" />
    </svg>
  );
}

function FlagUS() {
  return (
    <svg viewBox="0 0 28 20" className="h-full w-full" aria-hidden>
      <rect width="28" height="20" fill="#b22234" />
      <g fill="#ffffff">
        <rect y="1.54" width="28" height="1.54" />
        <rect y="4.62" width="28" height="1.54" />
        <rect y="7.69" width="28" height="1.54" />
        <rect y="10.77" width="28" height="1.54" />
        <rect y="13.85" width="28" height="1.54" />
        <rect y="16.92" width="28" height="1.54" />
      </g>
      <rect width="11.2" height="10.77" fill="#3c3b6e" />
      <g fill="#ffffff">
        <circle cx="2" cy="2" r="0.7" /><circle cx="5.6" cy="2" r="0.7" /><circle cx="9.2" cy="2" r="0.7" />
        <circle cx="3.8" cy="4" r="0.7" /><circle cx="7.4" cy="4" r="0.7" />
        <circle cx="2" cy="6" r="0.7" /><circle cx="5.6" cy="6" r="0.7" /><circle cx="9.2" cy="6" r="0.7" />
        <circle cx="3.8" cy="8" r="0.7" /><circle cx="7.4" cy="8" r="0.7" />
      </g>
    </svg>
  );
}

const OPTIONS: { code: Locale; label: string; Flag: () => React.ReactElement }[] = [
  { code: "es", label: "Español", Flag: FlagMX },
  { code: "en", label: "English", Flag: FlagUS },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={cn("flex items-center gap-1.5", className)} role="group" aria-label="Language">
      {OPTIONS.map(({ code, label, Flag }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          title={label}
          aria-label={label}
          aria-pressed={locale === code}
          className={cn(
            "h-5 w-7 overflow-hidden rounded-[5px] shadow-sm transition-all",
            locale === code
              ? "opacity-100 ring-2 ring-brand"
              : "opacity-45 hover:opacity-85"
          )}
        >
          <Flag />
        </button>
      ))}
    </div>
  );
}
