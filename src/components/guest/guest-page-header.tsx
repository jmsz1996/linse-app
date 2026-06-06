import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/guest/language-switcher";
import { getDict } from "@/lib/i18n/server";

interface GuestPageHeaderProps {
  backHref: string;
  backLabel?: string;
  title: string;
}

export async function GuestPageHeader({ backHref, backLabel, title }: GuestPageHeaderProps) {
  const t = await getDict();
  const label = backLabel ?? t.feed.backFeed;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-4 sm:px-6">
        <Link
          href={backHref}
          className="-ml-2 inline-flex items-center gap-1 rounded-full py-1.5 pl-2 pr-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {label}
        </Link>
        <span className="h-4 w-px bg-border" aria-hidden />
        <h1 className="font-display text-lg leading-none">{title}</h1>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
