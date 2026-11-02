"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanHandle } from "@/components/onboarding/script";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { FormAlert, TextField } from "@/components/shared/TextField";
import { useToast } from "@/components/shared/Toast";
import { HandleField, useHandleStatus } from "./HandleField";
import { PublicSwitch } from "./PublicSwitch";

export interface ProfileValues {
  name: string;
  handle: string | null;
  bio: string;
  isPublic: boolean;
}

type Errors = Partial<Record<"name" | "handle" | "isPublic" | "form", string>>;

const BIO_MAX = 160;

export function ProfileForm({
  initial,
  hue,
  suggestedHandle,
}: {
  initial: ProfileValues;
  hue: number;
  suggestedHandle: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const ids = useId();
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [bio, setBio] = useState(initial.bio);
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const status = useHandleStatus(handle, saved.handle);

  // "Choose a handle" in the account menu links here: land in the field, ready to type.
  useEffect(() => {
    if (window.location.hash === "#profile" && !initial.handle) {
      document.getElementById(`${ids}-handle`)?.focus({ preventScroll: true });
    }
  }, [ids, initial.handle]);

  const cleaned = cleanHandle(handle);
  const dirty =
    name.trim() !== saved.name ||
    cleaned !== (saved.handle ?? "") ||
    bio.trim() !== saved.bio ||
    isPublic !== saved.isPublic;

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = "Your name can’t be empty.";
    if (saved.handle && !cleaned) e.handle = "You can change your handle, but not remove it.";
    else if (status.state === "invalid" || status.state === "taken") e.handle = status.message;
    if (isPublic && !cleaned) e.isPublic = "A public profile needs a handle. Pick one above.";
    return e;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !dirty) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = errs.name ? "name" : errs.handle ? "handle" : "public";
      document.getElementById(`${ids}-${first}`)?.focus();
      return;
    }
    const body: Record<string, unknown> = {};
    if (name.trim() !== saved.name) body.name = name.trim();
    if (cleaned && cleaned !== saved.handle) body.handle = cleaned;
    if (bio.trim() !== saved.bio) body.bio = bio.trim();
    if (isPublic !== saved.isPublic) body.isPublic = isPublic;

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ProfileValues> & { error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Couldn’t save your profile. Try again.";
        if (res.status === 409 || /handle/i.test(msg)) setErrors(/public/i.test(msg) ? { isPublic: msg } : { handle: msg });
        else setErrors({ form: msg });
        return;
      }
      const next: ProfileValues = {
        name: data.name ?? name.trim(),
        handle: data.handle ?? null,
        bio: data.bio ?? "",
        isPublic: Boolean(data.isPublic),
      };
      setSaved(next);
      setName(next.name);
      setHandle(next.handle ?? "");
      setBio(next.bio);
      setIsPublic(next.isPublic);
      setErrors({});
      toast(body.handle ? `Saved. You’re @${next.handle} now.` : "Profile saved", "success");
      // The rail and the account menu show your name and handle.
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong. Try again in a moment." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6">
      <div className="flex items-center gap-4">
        <Avatar name={name || saved.name || "?"} hue={hue} size={60} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[1.6rem] leading-none">{name.trim() || saved.name}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/70">
            <span className="truncate">{saved.handle ? `@${saved.handle}` : "No handle yet"}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Icon name={saved.isPublic ? "globe" : "lock"} className="h-3.5 w-3.5" />
              {saved.isPublic ? "Public" : "Not listed"}
            </span>
          </p>
        </div>
        {saved.handle ? (
          <Link
            href={`/u/${saved.handle}`}
            className="link inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold max-xs:hidden"
          >
            View profile
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        {errors.form ? <FormAlert>{errors.form}</FormAlert> : null}
        <TextField
          id={`${ids}-name`}
          label="Name"
          autoComplete="name"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <div>
          <HandleField
            id={`${ids}-handle`}
            value={handle}
            onChange={(v) => {
              setHandle(v);
              setErrors((x) => ({ ...x, handle: undefined }));
            }}
            status={status}
            error={errors.handle}
            emptyHint="So friends can find and follow you. Letters, numbers and underscores."
          />
          {!saved.handle && suggestedHandle && cleaned !== suggestedHandle ? (
            <button type="button" className="chip mt-3 max-w-full" onClick={() => setHandle(suggestedHandle)}>
              <span className="truncate">Use @{suggestedHandle}</span>
            </button>
          ) : null}
        </div>
        <div>
          <label htmlFor={`${ids}-bio`} className="mb-2 block text-[0.9375rem] font-semibold">
            Bio
          </label>
          <textarea
            id={`${ids}-bio`}
            className="control block resize-none leading-snug"
            rows={3}
            maxLength={BIO_MAX}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A line about you, like what you’re building"
            aria-describedby={`${ids}-bio-count`}
          />
          <p id={`${ids}-bio-count`} className="mt-2 text-right text-sm tabular-nums text-ink/65">
            {bio.length} / {BIO_MAX}
          </p>
        </div>

        <PublicSwitch
          id={`${ids}-public`}
          label="Public profile"
          on={isPublic}
          onChange={(v) => {
            setIsPublic(v);
            setErrors((x) => ({ ...x, isPublic: undefined }));
          }}
          error={errors.isPublic}
        >
          <dl className="rule mt-4 grid grid-cols-1 gap-3 border-t-2 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-1.5 font-semibold">
                <Icon name="eye" className="h-4 w-4" />
                What others see
              </dt>
              <dd className="mt-1 text-ink/75">Your name, handle, bio and what fills your days, the moments you share, and threads you choose to show.</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 font-semibold">
                <Icon name="lock" className="h-4 w-4" />
                Never shown
              </dt>
              <dd className="mt-1 text-ink/75">Your pages, your email, and every thread you keep to yourself.</dd>
            </div>
          </dl>
        </PublicSwitch>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {dirty ? <p className="mr-auto text-sm text-ink/65">Unsaved changes</p> : null}
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

