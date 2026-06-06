"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ExportOriginalsSectionProps {
  eventId: string;
  eventName: string;
}

type Mode = "copy" | "move";

interface ExportResponse {
  mode: Mode;
  exported: number;
  skipped: number;
  deleted: number;
  folder: string;
}

export function ExportOriginalsSection({ eventId, eventName }: ExportOriginalsSectionProps) {
  const router = useRouter();
  const [running, setRunning] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResponse | null>(null);

  async function run(mode: Mode) {
    if (
      mode === "move" &&
      !window.confirm(
        `Move all originals from "${eventName}" to the export folder?\n\n` +
          "They're copied out and then removed from the app — guests will no longer " +
          "see them, and they'll be gone from the feed and ZIP download. This cannot be undone.",
      )
    ) {
      return;
    }

    setRunning(mode);
    setError(null);
    setResult(null);

    const res = await fetch(`/api/admin/events/${eventId}/export-originals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Export failed");
      setRunning(null);
      return;
    }

    const data = (await res.json()) as ExportResponse;
    setResult(data);
    setRunning(null);
    if (mode === "move") router.refresh(); // the moved photos are gone from the grid now
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={running !== null} onClick={() => run("copy")}>
          {running === "copy" ? "Copying…" : "Copy originals to folder"}
        </Button>
        <Button variant="destructive" disabled={running !== null} onClick={() => run("move")}>
          {running === "move" ? "Moving…" : "Move originals to folder"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <p className="text-sm text-muted-foreground">
          {result.mode === "move" ? "Moved" : "Copied"} {result.exported} file
          {result.exported === 1 ? "" : "s"} to{" "}
          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {result.folder}/
          </code>
          {result.deleted > 0 && ` · removed ${result.deleted} from the app`}
          {result.skipped > 0 && ` · ${result.skipped} skipped (file missing)`}
        </p>
      )}
    </div>
  );
}
