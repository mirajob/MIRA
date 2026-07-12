"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions/locale";

/**
 * Selettore lingua inline: va posizionato dal layout che lo ospita (sidebar, drawer,
 * header pubblici) — non più un elemento flottante fisso, che su mobile copriva
 * contenuti e bottom sheet.
 */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: "it" | "en") {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border border-border bg-white px-1.5 py-1 ${className}`}
      aria-label={t("label")}
    >
      {(["it", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          disabled={isPending}
          onClick={() => handleChange(option)}
          className={`rounded px-1.5 py-0.5 text-xs uppercase transition-colors duration-100 ${
            locale === option ? "bg-navy text-white" : "text-ink-secondary hover:text-navy"
          }`}
          aria-pressed={locale === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
