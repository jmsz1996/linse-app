"use client";

import { useEffect } from "react";
import { localStorageKey } from "@/lib/guest-constants";

export function RecoveryStasher({ slug }: { slug: string }) {
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[#&]rt=([0-9a-f]{64})/);
    if (!match) return;
    const token = match[1];
    localStorage.setItem(localStorageKey(slug), token);
    // Remove the hash so the token doesn't linger in browser history
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [slug]);

  return null;
}
