import { cn } from "@/lib/utils";
import { DEFAULT_TAG_COLOR } from "@/lib/guest-constants";

interface TagDotProps {
  color?: string | null;
  className?: string;
}

export function TagDot({ color, className }: TagDotProps) {
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color ?? DEFAULT_TAG_COLOR }}
    />
  );
}
