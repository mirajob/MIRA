"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions/locale";

export function LocaleSwitcher() {
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
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1.5 shadow-sm"
      aria-label={t("label")}
    >
      {(["it", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          disabled={isPending}
          onClick={() => handleChange(option)}
          className={`rounded-md px-2 py-1 text-label uppercase transition-colors duration-100 ${
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
