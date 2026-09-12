"use client";

import { LoaderCircle, RefreshCw, Save } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { getProfile, updateProfile } from "../api/profile-client";
import type { Profile } from "../contracts";

type ProfileDraft = {
  fullName: string;
  phone: string;
  avatarUrl: string;
};

function draftFromProfile(profile: Profile): ProfileDraft {
  return {
    fullName: profile.fullName,
    phone: profile.phone ?? "",
    avatarUrl: profile.avatarUrl ?? "",
  };
}

function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!compact) {
    return null;
  }
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

function validateDraft(draft: ProfileDraft): string | null {
  const fullNameLength = [...draft.fullName.trim()].length;
  if (fullNameLength < 2 || fullNameLength > 150) {
    return "Họ và tên cần dài từ 2 đến 150 ký tự.";
  }

  const phone = normalizePhone(draft.phone);
  if (phone && !/^\+?[0-9]{8,15}$/.test(phone)) {
    return "Số điện thoại cần có từ 8 đến 15 chữ số và có thể bắt đầu bằng dấu +.";
  }

  const avatarUrl = draft.avatarUrl.trim();
  if (avatarUrl) {
    if (avatarUrl.length > 2048) {
      return "Đường dẫn ảnh đại diện không được vượt quá 2048 ký tự.";
    }
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "Ảnh đại diện phải là đường dẫn HTTP hoặc HTTPS hợp lệ.";
      }
    } catch {
      return "Ảnh đại diện phải là đường dẫn HTTP hoặc HTTPS hợp lệ.";
    }
  }

  return null;
}

function profileErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải hoặc cập nhật hồ sơ lúc này. Vui lòng thử lại.";
}

export function ProfileForm() {
  const { authorizedRequest, synchronizeCurrentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getProfile(authorizedRequest);
      setProfile(loaded);
      setDraft(draftFromProfile(loaded));
    } catch (caught) {
      setError(profileErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    let active = true;
    void getProfile(authorizedRequest).then(
      (loaded) => {
        if (!active) {
          return;
        }
        setProfile(loaded);
        setDraft(draftFromProfile(loaded));
        setLoading(false);
      },
      (caught: unknown) => {
        if (!active) {
          return;
        }
        setError(profileErrorMessage(caught));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || pending) {
      return;
    }

    const validationError = validateDraft(draft);
    if (validationError) {
      setSuccess(null);
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const updated = await updateProfile(authorizedRequest, {
        fullName: draft.fullName.trim(),
        phone: normalizePhone(draft.phone),
        avatarUrl: draft.avatarUrl.trim() || null,
      });
      synchronizeCurrentUser(updated);
      setProfile(updated);
      setDraft(draftFromProfile(updated));
      setSuccess("Đã cập nhật hồ sơ.");
    } catch (caught) {
      setError(profileErrorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải hồ sơ…
      </p>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm font-medium text-red-700">
          {error ?? "Không tìm thấy hồ sơ."}
        </p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <form className="grid max-w-2xl gap-5 sm:grid-cols-2" noValidate onSubmit={submit}>
      <label className="text-sm font-semibold sm:col-span-2">
        Họ và tên
        <Input
          className="mt-2"
          name="fullName"
          autoComplete="name"
          maxLength={150}
          required
          value={draft.fullName}
          onChange={(event) =>
            setDraft((current) =>
              current ? { ...current, fullName: event.target.value } : current,
            )
          }
        />
      </label>
      <label className="text-sm font-semibold">
        Email
        <Input
          className="mt-2 bg-surface-soft"
          type="email"
          value={profile.email}
          readOnly
        />
      </label>
      <label className="text-sm font-semibold">
        Số điện thoại
        <Input
          className="mt-2"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={20}
          value={draft.phone}
          onChange={(event) =>
            setDraft((current) =>
              current ? { ...current, phone: event.target.value } : current,
            )
          }
        />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Ảnh đại diện (URL)
        <Input
          className="mt-2"
          name="avatarUrl"
          type="url"
          inputMode="url"
          placeholder="https://example.com/avatar.jpg"
          maxLength={2048}
          value={draft.avatarUrl}
          onChange={(event) =>
            setDraft((current) =>
              current ? { ...current, avatarUrl: event.target.value } : current,
            )
          }
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700 sm:col-span-2">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="text-sm font-medium text-green-700 sm:col-span-2">
          {success}
        </p>
      ) : null}
      <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="size-4" aria-hidden="true" />
        )}
        {pending ? "Đang lưu…" : "Lưu thay đổi"}
      </Button>
    </form>
  );
}
