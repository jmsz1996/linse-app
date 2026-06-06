import { redirect } from "next/navigation";
import { getGuestFromCookie } from "@/lib/guest-session";

export async function requireGuest(slug: string) {
  const guest = await getGuestFromCookie(slug);
  if (!guest) redirect(`/e/${slug}`);
  return guest!;
}
