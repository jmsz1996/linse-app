"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy } from "lucide-react";
import { localStorageKey } from "@/lib/guest-constants";
import { useT } from "@/components/guest/locale-provider";

interface RecoverySectionProps {
  slug: string;
  origin: string;
}

export function RecoverySection({ slug, origin }: RecoverySectionProps) {
  const t = useT();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);
  const [noToken, setNoToken] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const token = localStorage.getItem(localStorageKey(slug));
      if (!token) {
        setNoToken(true);
        return;
      }
      const url = `${origin}/api/e/${slug}/recover?t=${token}`;
      setRecoveryUrl(url);
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          width: 320,
          margin: 1,
          color: { dark: "#2b251f", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [slug, origin]);

  async function handleCopy() {
    if (!recoveryUrl) return;
    try {
      await navigator.clipboard.writeText(recoveryUrl);
    } catch {
      // Clipboard API requires HTTPS; fall back for plain HTTP (dev over LAN/VPN)
      const el = document.createElement("textarea");
      el.value = recoveryUrl;
      el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (noToken) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">{t.recovery.noToken}</p>
    );
  }

  if (!qrDataUrl) {
    return <div className="mx-auto aspect-square w-full max-w-[260px] animate-pulse rounded-2xl bg-muted" />;
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto w-fit rounded-2xl border border-border bg-white p-3 shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={t.recovery.qrAlt} width={232} height={232} className="rounded-lg" />
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-foreground/20"
      >
        <span className="truncate font-mono text-xs text-muted-foreground">{recoveryUrl}</span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground">
          {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
          {copied ? t.recovery.copied : t.recovery.copy}
        </span>
      </button>
    </div>
  );
}
