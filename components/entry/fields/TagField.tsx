"use client";

import { useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/shared/Icon";
import type { TemplateField } from "@/lib/types";
import { useTagHue } from "../TagHues";

/** Tags as the API stores them: lowercase, no #, single spaces. */
function normalize(tag: string) {
  return tag.trim().replace(/^#+/, "").replace(/\s+/g, " ").toLowerCase().slice(0, 40);
}

export function TagField({
  field,
  value,
  onChange,
  readOnly,
  id,
}: {
  field: TemplateField;
  value: string[];
  onChange: (v: string[]) => void;
  readOnly?: boolean;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const hueOf = useTagHue();
  const allowed = (field.config?.allowedTags as string[] | undefined) ?? [];
  const list = value ?? [];

  function add(tag: string) {
    const t = normalize(tag);
    setDraft("");
    if (!t || list.includes(t)) return;
    onChange([...list, t]);
  }
  function remove(tag: string) {
    onChange(list.filter((t) => t !== tag));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && list.length) {
      remove(list[list.length - 1]);
    }
  }

  if (readOnly) {
    return list.length ? (
      <ul className="flex flex-wrap gap-2">
        {list.map((t) => (
          <li key={t} data-hue={hueOf(t)} className="tag max-w-full">
            <span className="truncate">#{t}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-[0.9375rem] text-ink/65">No tags</p>
    );
  }

  const suggestions = allowed.map(normalize).filter((t) => t && !list.includes(t));

  return (
    <div className="space-y-3">
      <div className="control flex cursor-text flex-wrap items-center gap-2 !py-2 focus-within:shadow-[4px_4px_0_var(--accent)]">
        {list.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => remove(tag)}
            aria-label={`Remove #${tag}`}
            className="chip chip-sm !min-h-9 !gap-1.5 !pl-2.5 !pr-2 max-sm:!min-h-11"
          >
            <span aria-hidden data-hue={hueOf(tag)} className="h-2.5 w-2.5 rounded-full border-[1.5px] border-edge bg-hue" />
            #{tag}
            <Icon name="close" className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
          </button>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          placeholder={list.length ? "Add another" : "Type a tag and press Enter"}
          enterKeyHint="done"
          autoCapitalize="none"
          autoComplete="off"
          className="h-11 min-w-[10rem] flex-1 bg-transparent px-1 text-[0.9375rem] text-ink placeholder:text-ink/50 focus:outline-none"
        />
      </div>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Suggested tags" role="group">
          {suggestions.map((t) => (
            <button key={t} type="button" onClick={() => add(t)} className="chip chip-sm max-sm:!min-h-11">
              <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2} />
              {t}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
