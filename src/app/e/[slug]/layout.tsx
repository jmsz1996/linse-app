import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EventFooter } from "@/components/guest/event-footer";
import { LocaleProvider } from "@/components/guest/locale-provider";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [event, locale] = await Promise.all([
    prisma.event.findFirst({ where: { slug }, select: { footer: true } }),
    getLocale(),
  ]);
  if (!event) notFound();

  return (
    <LocaleProvider initialLocale={locale}>
      <div lang={locale} className="flex min-h-full flex-1 flex-col bg-background">
        {children}
        {event.footer && <EventFooter text={event.footer} />}
      </div>
    </LocaleProvider>
  );
}
