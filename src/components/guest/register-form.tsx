"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { localStorageKey } from "@/lib/guest-constants";
import { useT } from "@/components/guest/locale-provider";

interface RegisterFormProps {
  slug: string;
}

export function RegisterForm({ slug }: RegisterFormProps) {
  const router = useRouter();
  const t = useT();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting || !displayName.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/e/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t.errors.generic);
        setIsSubmitting(false);
        return;
      }

      const data = (await res.json()) as { recoveryToken: string; guestId: string };
      localStorage.setItem(localStorageKey(slug), data.recoveryToken);
      router.push(`/e/${slug}/feed`);
    } catch {
      setError(t.errors.network);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder={t.register.namePlaceholder}
        aria-label={t.register.namePlaceholder}
        maxLength={50}
        required
        autoFocus
        className="h-14 w-full rounded-2xl border border-input bg-card px-5 text-[15px] shadow-soft outline-none transition placeholder:text-muted-foreground/55 focus:border-ring/40 focus:ring-2 focus:ring-ring/25"
      />
      {error && <p className="px-1 text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !displayName.trim()}
        className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-[15px] font-semibold text-background shadow-soft transition active:scale-[0.99] disabled:opacity-40"
      >
        {isSubmitting ? (
          t.register.joining
        ) : (
          <>
            {t.register.joinCta}
            <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
