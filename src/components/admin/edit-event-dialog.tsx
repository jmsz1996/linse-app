"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EventForm } from "@/components/admin/event-form";

interface EditEventDialogProps {
  event: {
    id: string;
    name: string;
    slug: string;
    startsAt: string | null;
    endsAt: string | null;
    storageLimitMb?: number;
    allowVideos?: boolean;
    commentLimitPerHour?: number;
    description?: string | null;
    footer?: string | null;
    accessPassword?: string | null;
  };
}

export function EditEventDialog({ event }: EditEventDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit event</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <EventForm
            initialValues={event}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
