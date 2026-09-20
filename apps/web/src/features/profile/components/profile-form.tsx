"use client";

import { Camera, LoaderCircle, RefreshCw, Save, Trash2 } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { getProfile, updateProfile, uploadAvatar } from "../api/profile-client";
import type { Profile } from "../contracts";

type ProfileDraft = {
  fullName: string;
  phone: string;
};

function draftFromProfile(profile: Profile): ProfileDraft {
  return {
    fullName: profile.fullName,
    phone: profile.phone ?? "",
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

  return null;
}

function profileErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải hoặc cập nhật hồ sơ lúc này. Vui lòng thử lại.";
}

const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ProfileForm() {
  const { authorizedRequest, synchronizeCurrentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Reset input so same file can be re-selected
    event.target.value = "";

    if (file.size > AVATAR_MAX_SIZE) {
      setError("Ảnh đại diện không được vượt quá 2 MB.");
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const updated = await uploadAvatar(authorizedRequest, file);
      synchronizeCurrentUser(updated);
      setProfile(updated);
      setDraft(draftFromProfile(updated));
      setSuccess("Đã cập nhật ảnh đại diện.");
    } catch (caught) {
      setError(profileErrorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const updated = await updateProfile(authorizedRequest, {
        avatarUrl: null,
      });
      synchronizeCurrentUser(updated);
      setProfile(updated);
      setDraft(draftFromProfile(updated));
      setSuccess("Đã xóa ảnh đại diện.");
    } catch (caught) {
      setError(profileErrorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

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
    <div className="grid max-w-2xl gap-6">
      {/* Avatar section */}
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-surface-soft">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Ảnh đại diện"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-2xl font-semibold text-muted">
              {profile.fullName.charAt(0).toUpperCase()}
            </span>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <LoaderCircle className="size-6 animate-spin text-white" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            onChange={handleAvatarSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="size-4" aria-hidden="true" />
            Chọn ảnh
          </Button>
          {profile.avatarUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => void handleAvatarRemove()}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Xóa ảnh
            </Button>
          )}
          <p className="text-xs text-muted">JPG, PNG, WEBP hoặc GIF. Tối đa 2 MB.</p>
        </div>
      </div>

      {/* Profile form */}
      <form className="grid gap-5 sm:grid-cols-2" noValidate onSubmit={submit}>
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
    </div>
  );
}
