import { EventEmitter } from "events";

export type NewPhotoPayload = { slug: string; photoId: string };
export type NewCommentPayload = {
  slug: string;
  photoId: string;
  commentId: string;
  authorName: string;
  body: string;
};

export type BusEvent =
  | { type: "new_photo"; payload: NewPhotoPayload }
  | { type: "new_comment"; payload: NewCommentPayload };

class EventBus extends EventEmitter {
  emitEvent(e: BusEvent) {
    this.emit(e.type, e.payload);
  }
}

const g = globalThis as unknown as { __linseBus?: EventBus };
export const eventBus: EventBus = g.__linseBus ?? new EventBus();
eventBus.setMaxListeners(0); // one listener per active SSE connection
if (process.env.NODE_ENV !== "production") g.__linseBus = eventBus;
