import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin");
  const userId = (session.user as { id: string }).id;

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/admin" });
  }

  const events = await prisma.event.findMany({
    where: { hostUserId: userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tags: true } } },
  });

  return (
    <main className="flex flex-1 flex-col p-8 max-w-3xl mx-auto w-full">
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-semibold">linse admin</h1>
          <p className="text-sm text-zinc-500">Signed in as {session.user.email}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Events</h2>
          <Button asChild size="sm">
            <Link href="/admin/events/new">New event</Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No events yet.{" "}
            <Link href="/admin/events/new" className="underline underline-offset-2">
              Create your first one.
            </Link>
          </p>
        ) : (
          <div className="grid gap-3">
            {events.map((event) => (
              <Link key={event.id} href={`/admin/events/${event.id}`}>
                <Card className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium">{event.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {event._count.tags} {event._count.tags === 1 ? "tag" : "tags"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground font-mono">/e/{event.slug}</p>
                    {(event.startsAt || event.endsAt) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.startsAt
                          ? new Date(event.startsAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                        {event.endsAt && event.startsAt && " → "}
                        {event.endsAt &&
                          new Date(event.endsAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
