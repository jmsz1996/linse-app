"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";

export default function NewEventPage() {
  const router = useRouter();

  return (
    <main className="flex flex-1 flex-col p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to dashboard
        </Link>
        <h1 className="text-xl font-semibold mt-2">New event</h1>
      </div>
      <EventForm onSuccess={(event) => router.push(`/admin/events/${event.id}`)} />
    </main>
  );
}
