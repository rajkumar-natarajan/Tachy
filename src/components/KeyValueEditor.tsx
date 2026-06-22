"use client";

import { newKeyValue, withTrailingRow } from "@/lib/factory";
import type { KeyValue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  allowSecret?: boolean;
  allowFileType?: boolean;
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  allowSecret = false,
  allowFileType = false,
}: Props) {
  const rows = withTrailingRow(items);

  function update(id: string, patch: Partial<KeyValue>) {
    onChange(withTrailingRow(rows.map((r) => (r.id === id ? { ...r, ...patch } : r))));
  }

  function remove(id: string) {
    const next = rows.filter((r) => r.id !== id);
    onChange(next.length ? next : [newKeyValue()]);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-elevated/50 text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="w-8" />
            <th className="font-medium px-2 py-1.5">{keyPlaceholder}</th>
            <th className="font-medium px-2 py-1.5">{valuePlaceholder}</th>
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            return (
              <Row
                key={row.id}
                row={row}
                isLast={isLast}
                allowSecret={allowSecret}
                allowFileType={allowFileType}
                keyPlaceholder={keyPlaceholder}
                valuePlaceholder={valuePlaceholder}
                onUpdate={update}
                onRemove={remove}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  isLast,
  allowSecret,
  allowFileType,
  keyPlaceholder,
  valuePlaceholder,
  onUpdate,
  onRemove,
}: {
  row: KeyValue;
  isLast: boolean;
  allowSecret: boolean;
  allowFileType: boolean;
  keyPlaceholder: string;
  valuePlaceholder: string;
  onUpdate: (id: string, patch: Partial<KeyValue>) => void;
  onRemove: (id: string) => void;
}) {
  const [reveal, setReveal] = useState(false);
  const masked = allowSecret && row.secret && !reveal;

  return (
    <tr className="group border-b border-border/50 last:border-0 hover:bg-elevated/30">
      <td className="px-1 text-center">
        {!isLast && (
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => onUpdate(row.id, { enabled: e.target.checked })}
            className="h-3.5 w-3.5 accent-cyan-500 cursor-pointer"
          />
        )}
      </td>
      <td className="px-1 py-0.5">
        <input
          value={row.key}
          placeholder={keyPlaceholder}
          onChange={(e) => onUpdate(row.id, { key: e.target.value })}
          className={cn(
            "w-full bg-transparent px-1.5 py-1.5 font-mono text-[13px] text-cyan-300/90 placeholder:text-muted/40 focus:outline-none",
            !row.enabled && "line-through opacity-40",
          )}
        />
      </td>
      <td className="px-1 py-0.5">
        <input
          value={row.value}
          placeholder={valuePlaceholder}
          type={masked ? "password" : "text"}
          onChange={(e) => onUpdate(row.id, { value: e.target.value })}
          className={cn(
            "w-full bg-transparent px-1.5 py-1.5 font-mono text-[13px] text-fg placeholder:text-muted/40 focus:outline-none",
            !row.enabled && "line-through opacity-40",
          )}
        />
      </td>
      <td className="px-1">
        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {allowFileType && !isLast && (
            <button
              onClick={() =>
                onUpdate(row.id, { type: row.type === "file" ? "text" : "file" })
              }
              title="Toggle file/text"
              className="rounded px-1 text-[10px] font-semibold text-muted hover:text-cyan-400"
            >
              {row.type === "file" ? "FILE" : "TEXT"}
            </button>
          )}
          {allowSecret && !isLast && (
            <button
              onClick={() => onUpdate(row.id, { secret: !row.secret })}
              title={row.secret ? "Secret" : "Mark as secret"}
              className="rounded p-1 text-muted hover:text-grape-400"
            >
              {row.secret ? (
                reveal ? (
                  <Eye size={13} onClick={(e) => { e.stopPropagation(); setReveal(false); }} />
                ) : (
                  <EyeOff size={13} onClick={(e) => { e.stopPropagation(); setReveal(true); }} />
                )
              ) : (
                <Eye size={13} className="opacity-40" />
              )}
            </button>
          )}
          {!isLast && (
            <button
              onClick={() => onRemove(row.id)}
              title="Remove"
              className="rounded p-1 text-muted hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          )}
          {isLast && <GripVertical size={13} className="opacity-0" />}
        </div>
      </td>
    </tr>
  );
}
