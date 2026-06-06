import { notFound, redirect } from "next/navigation";
import { Aperture, Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { getGuestFromCookie, isGuestBlockedByCookie } from "@/lib/guest-session";
import { isGatePassed } from "@/lib/event-gate";
import { RegisterForm } from "@/components/guest/register-form";
import { PasswordGate } from "@/components/guest/password-gate";
import { LanguageSwitcher } from "@/components/guest/language-switcher";
import { getDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EventEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ recovered?: string }>;
}) {
  const { slug } = await params;
  const { recovered } = await searchParams;

  const event = await prisma.event.findFirst({
    where: { slug },
    select: { id: true, name: true, description: true, accessPassword: true },
  });
  if (!event) notFound();

  const [guest, isBlocked, gatePassed, t] = await Promise.all([
    getGuestFromCookie(slug),
    isGuestBlockedByCookie(slug),
    event.accessPassword ? isGatePassed(slug, event.id) : Promise.resolve(true),
    getDict(),
  ]);
  if (guest) redirect(`/e/${slug}/feed`);

  // Password-gated and not yet unlocked → reveal nothing about the event.
  const locked = !!event.accessPassword && !gatePassed;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Aperture
        aria-hidden
        strokeWidth={0.5}
        className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 text-foreground/[0.04]"
      />

      <div className="absolute right-5 top-5 z-10">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-12 flex items-center gap-2 text-muted-foreground animate-rise">
          <Aperture className="h-[18px] w-[18px]" />
          <span className="eyebrow">linse</span>
        </div>

        {locked ? (
          <>
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 text-muted-foreground animate-rise"
                style={{ animationDelay: "40ms" }}
              >
                <Lock className="h-[18px] w-[18px]" />
                <span className="eyebrow">{t.entry.lockEyebrow}</span>
              </div>
              <h1
                className="font-display text-[2.75rem] leading-[1.04] animate-rise"
                style={{ animationDelay: "80ms" }}
              >
                {t.entry.lockTitle}
              </h1>
              <p
                className="text-[15px] leading-relaxed text-muted-foreground animate-rise"
                style={{ animationDelay: "120ms" }}
              >
                {t.entry.lockPrompt}
              </p>
            </div>
            <div className="mt-9 animate-rise" style={{ animationDelay: "160ms" }}>
              <PasswordGate slug={slug} />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <p className="eyebrow animate-rise" style={{ animationDelay: "40ms" }}>
                {t.entry.invited}
              </p>
              <h1
                className="font-display text-[2.75rem] leading-[1.04] animate-rise"
                style={{ animationDelay: "80ms" }}
              >
                {event.name}
              </h1>
              {event.description && (
                <p
                  className="text-[15px] leading-relaxed text-muted-foreground animate-rise"
                  style={{ animationDelay: "120ms" }}
                >
                  {event.description}
                </p>
              )}
            </div>

            {isBlocked ? (
              <div
                className="mt-9 rounded-2xl border border-destructive/25 bg-destructive/8 px-5 py-6 animate-rise"
                style={{ animationDelay: "160ms" }}
              >
                <p className="font-medium text-destructive">{t.entry.blockedTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.entry.blockedBody}</p>
              </div>
            ) : (
              <div className="mt-9 animate-rise" style={{ animationDelay: "160ms" }}>
                {recovered === "0" && (
                  <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                    {t.entry.recoveryNotRecognized}
                  </div>
                )}
                <RegisterForm slug={slug} />
                <p className="mt-4 px-1 text-xs text-muted-foreground/80">{t.entry.noAccount}</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
