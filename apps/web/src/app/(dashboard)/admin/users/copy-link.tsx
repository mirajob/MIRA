"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-paper px-4 py-3">
      <code className="flex-1 text-body-sm text-ink font-mono truncate">{url}</code>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 text-body-sm font-medium text-petrol hover:text-petrol-700 transition-colors"
      >
        {copied ? "Copiato!" : "Copia"}
      </button>
    </div>
  );
}
