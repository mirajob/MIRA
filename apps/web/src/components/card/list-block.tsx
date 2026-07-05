"use client";

import { useState } from "react";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import type { CardBlockStatus, CardBlockType } from "@mira/types";

export interface ListFieldConfig<T> {
  key: keyof T;
  label: string;
  type?: "text" | "textarea" | "select";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
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
}: ListBlockProps<T>) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

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
      <CardBlockHeader title={title} status={status} blockType={blockType as CardBlockType} />
      <div className="p-5 space-y-4">
        {items.length === 0 && <p className="text-body-sm text-ink-secondary">{emptyLabel}</p>}
        {items.map((item, index) => (
          <div key={item.id} className="rounded-md border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              {item.verified && (
                <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">Verificata</span>
              )}
              {!readOnly && (
                <button
                  onClick={() => removeItem(index)}
                  className="text-xs text-ink-tertiary hover:text-error transition-colors ml-auto"
                >
                  Rimuovi
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map(({ key, label, type, placeholder, options }) => (
                <div key={String(key)} className={type === "textarea" ? "sm:col-span-2" : ""}>
                  <label className="text-ink-tertiary text-body-sm">{label}</label>
                  {readOnly ? (
                    <p className="mt-1 text-body-sm text-ink">{String((item as Record<string, unknown>)[key as string] ?? "—")}</p>
                  ) : type === "textarea" ? (
                    <textarea
                      value={String((item as Record<string, unknown>)[key as string] ?? "")}
                      placeholder={placeholder}
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
                      onChange={(e) => updateItem(index, key, e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button
              onClick={addItem}
              className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
            >
              + Aggiungi
            </button>
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-body-sm font-medium text-white bg-petrol rounded-md px-4 py-2 hover:bg-petrol-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
