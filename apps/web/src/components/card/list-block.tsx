"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import type { CardBlockStatus, CardBlockType } from "@mira/types";

const COLLAPSE_THRESHOLD = 5;

export interface ListFieldConfig<T> {
  key: keyof T;
  label: string;
  type?: "text" | "textarea" | "select";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Limite one-page: la card documento ha spazio fisso, i testi devono restare sintetici. */
  maxLength?: number;
}

interface ListBlockProps<T extends { id: string; verified: boolean }> {
  blockType: Exclude<CardBlockType, "formazione"> | "formazione";
  title: string;
  items: T[];
  status: CardBlockStatus;
  fields: ListFieldConfig<T>[];
  emptyItem: () => T;
  emptyLabel: string;
  readOnly?: boolean;
  onApproved?: () => void;
  /** Riga extra in fondo a ogni item (es. "✦ Migliora con MIRA" sulle esperienze). */
  itemExtra?: (item: T, index: number, updateItem: (index: number, key: keyof T, value: unknown) => void) => React.ReactNode;
}

export function ListBlock<T extends { id: string; verified: boolean }>({
  blockType,
  title,
  items: initialItems,
  status,
  fields,
  emptyItem,
  emptyLabel,
  readOnly,
  onApproved,
  itemExtra,
}: ListBlockProps<T>) {
  const t = useTranslations("CardBlocks");
  const c = useTranslations("Common");
  const [items, setItems] = useState<T[]>(initialItems);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!dirty) setItems(initialItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems]);

  const visibleItems = readOnly && !expanded ? items.slice(0, COLLAPSE_THRESHOLD) : items;

  function updateItem(index: number, key: keyof T, value: unknown) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
    setDirty(true);
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
    setDirty(true);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await updateCardBlockProseContent(blockType as Exclude<CardBlockType, "formazione">, { items });
    setSaving(false);
    setDirty(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader
        title={title}
        status={status}
        blockType={blockType as CardBlockType}
        onBeforeApprove={readOnly ? undefined : handleSave}
        onApproved={onApproved}
      />
      <div className="p-5 space-y-4">
        {items.length === 0 && <p className="text-body-sm text-ink-secondary">{emptyLabel}</p>}
        {visibleItems.map((item, index) => (
          <div key={item.id} className="rounded-md border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              {item.verified && (
                <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">{t("verified")}</span>
              )}
              {!readOnly && (
                <button
                  onClick={() => removeItem(index)}
                  className="text-xs text-ink-tertiary hover:text-error transition-colors ml-auto"
                >
                  {t("remove")}
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map(({ key, label, type, placeholder, options, maxLength }) => (
                <div key={String(key)} className={type === "textarea" ? "sm:col-span-2" : ""}>
                  <label className="text-ink-tertiary text-body-sm">{label}</label>
                  {readOnly ? (
                    <p className="mt-1 text-body-sm text-ink">{String((item as Record<string, unknown>)[key as string] ?? "—")}</p>
                  ) : type === "textarea" ? (
                    <textarea
                      value={String((item as Record<string, unknown>)[key as string] ?? "")}
                      placeholder={placeholder}
                      maxLength={maxLength}
                      onChange={(e) => updateItem(index, key, e.target.value)}
                      rows={2}
                      className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
                    />
                  ) : type === "select" ? (
                    <select
                      value={String((item as Record<string, unknown>)[key as string] ?? "")}
                      onChange={(e) => updateItem(index, key, e.target.value || null)}
                      className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
                    >
                      <option value="">—</option>
                      {options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={String((item as Record<string, unknown>)[key as string] ?? "")}
                      placeholder={placeholder}
                      maxLength={maxLength}
                      onChange={(e) => updateItem(index, key, e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
                    />
                  )}
                </div>
              ))}
            </div>
            {!readOnly && itemExtra?.(item, index, updateItem)}
          </div>
        ))}
        {readOnly && items.length > COLLAPSE_THRESHOLD && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            {expanded ? t("showLess") : t("showAll", { count: items.length })}
          </button>
        )}
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button
              onClick={addItem}
              className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
            >
              {t("addItem")}
            </button>
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-body-sm font-medium text-white bg-petrol rounded-md px-4 py-2 hover:bg-petrol-700 transition-colors disabled:opacity-50"
              >
                {saving ? c("saving") : c("save")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Resa di sola lettura generica, riusata dal Profilo (default) e dalla vista associazione/azienda
 * per Esperienze/Competenze/Lingue — ognuna passa il proprio `renderItem` perché il layout
 * naturale di una riga cambia per tipo (non ha senso forzare la stessa griglia di campi del form).
 */
export function ListView<T extends { id: string }>({
  title,
  items,
  renderItem,
  emptyLabel,
  collapseAt = 5,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyLabel: string;
  collapseAt?: number;
}) {
  const t = useTranslations("CardBlocks");
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, collapseAt);

  return (
    <div className="p-4">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-body-sm text-ink-tertiary italic">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      )}
      {items.length > collapseAt && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
        >
          {expanded ? t("showLess") : t("showAll", { count: items.length })}
        </button>
      )}
    </div>
  );
}
