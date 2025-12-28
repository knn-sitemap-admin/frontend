"use client";

import { X, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/atoms/Input/Input";
import type { RoleKey, UserRow } from "@/features/users/types";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/Select/Select";
import BirthdayPicker from "@/components/organisms/BirthdayPicker/BirthdayPicker";
import { Button } from "@/components/atoms/Button/Button";
import { useEffect, useState } from "react";
import { uploadOnePhoto, UploadDomain } from "@/shared/api/photos/photoUpload";

type Patch = Partial<UserRow> & {
  email?: string;
  role?: RoleKey;
  phone?: string;
  emergency_contact?: string;
  address?: string;
  salary_account?: string;
  password?: string; // 비밀번호는 새 값만 전달(공란이면 미포함)
  photo_url?: string;
  id_photo_url?: string;
  resident_register_url?: string;
  resident_extract_url?: string;
  family_relation_url?: string;
  birthday?: string;
};

type UploadField =
  | "photo_url"
  | "id_photo_url"
  | "resident_register_url"
  | "resident_extract_url"
  | "family_relation_url";

/** 래퍼: open이 false면 바디 자체를 렌더하지 않음(훅은 바디에서만 호출) */
export default function AccountEditModal(props: {
  open: boolean;
  user: UserRow;
  onClose: () => void;
  onSave: (patch: Patch) => void;
  maxUploadBytes?: number;
  addressLocked?: boolean;
}) {
  if (!props.open) return null;
  return <AccountEditModalBody {...props} />;
}

/** 모든 훅은 여기 최상단에서 “항상 같은 순서”로 호출 */
function AccountEditModalBody({
  user,
  onClose,
  onSave,
  maxUploadBytes = 5 * 1024 * 1024,
  addressLocked = false,
}: {
  open: boolean; // 래퍼에서만 사용하지만 props 스프레드로 들어오므로 타입 유지
  user: UserRow;
  onClose: () => void;
  onSave: (patch: Patch) => void;
  maxUploadBytes?: number;
  addressLocked?: boolean;
}) {
  // 기본 필드
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState<string>((user as any).phone ?? "");
  const [emergency, setEmergency] = useState<string>(
    (user as any).emergency_contact ?? ""
  );
  const [address, setAddress] = useState<string>(
    (user as any).address ??
      (user as any).addr ??
      (user as any).address_line ??
      ""
  );
  const [salary, setSalary] = useState<string>(
    (user as any).salary_account ?? ""
  );
  const [email, setEmail] = useState<string>(user.email ?? "");
  const [role, setRole] = useState<RoleKey>(user.role ?? "staff");
  const [birthday, setBirthday] = useState<string>(
    (user as any).birthday ?? ""
  );

  // 비밀번호(새 값만 입력, 공란이면 변경 없음)
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const pwMismatch = (pw || pw2) && pw !== pw2;
  const pwTooShort = pw.length > 0 && pw.length < 8;

  // 파일/문서 URL
  const [photoUrl, setPhotoUrl] = useState<string>(
    (user as any).photo_url ?? ""
  );
  const [idPhotoUrl, setIdPhotoUrl] = useState<string>(
    (user as any).id_photo_url ?? ""
  );
  const [residentRegUrl, setResidentRegUrl] = useState<string>(
    (user as any).resident_register_url ?? ""
  );
  const [residentExtUrl, setResidentExtUrl] = useState<string>(
    (user as any).resident_extract_url ?? ""
  );
  const [familyUrl, setFamilyUrl] = useState<string>(
    (user as any).family_relation_url ?? ""
  );

  // 업로드 상태
  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [uploadErrors, setUploadErrors] = useState<
    Partial<Record<UploadField, string>>
  >({});

  // user 바뀌면 폼 리셋 (훅은 조건 없이 선언, 값만 갱신)
  useEffect(() => {
    setName(user.name);
    setEmail(user.email ?? "");
    setRole(user.role ?? "staff");
    setPhone((user as any).phone ?? "");
    setEmergency((user as any).emergency_contact ?? "");
    setAddress(
      (user as any).address ??
        (user as any).addr ??
        (user as any).address_line ??
        ""
    );
    setSalary((user as any).salary_account ?? "");
    setPw("");
    setPw2("");
    setBirthday((user as any).birthday ?? "");
    setPhotoUrl((user as any).photo_url ?? "");
    setIdPhotoUrl((user as any).id_photo_url ?? "");
    setResidentRegUrl((user as any).resident_register_url ?? "");
    setResidentExtUrl((user as any).resident_extract_url ?? "");
    setFamilyUrl((user as any).family_relation_url ?? "");
    setUploading(null);
    setUploadErrors({});
  }, [user]);

  const setFieldError = (field: UploadField, msg: string | null) =>
    setUploadErrors((prev) => ({ ...prev, [field]: msg || undefined }));

  const uploadDomainMap: Record<UploadField, UploadDomain> = {
    photo_url: "profile",
    id_photo_url: "profile",
    resident_register_url: "etc",
    resident_extract_url: "etc",
    family_relation_url: "etc",
  };

  const handleFileChange =
    (field: UploadField, setter: (url: string) => void) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFieldError(field, null);

      if (file.size > maxUploadBytes) {
        setFieldError(
          field,
          `파일이 너무 큽니다. 최대 ${(maxUploadBytes / (1024 * 1024)).toFixed(
            1
          )}MB`
        );
        e.currentTarget.value = "";
        return;
      }

      setUploading(field);
      try {
        const domain = uploadDomainMap[field] ?? "etc";
        const meta = await uploadOnePhoto(file, { domain });
        if (!meta?.url) {
          throw new Error("업로드 응답에 URL이 없습니다.");
        }
        setter(meta.url);
      } catch (err: any) {
        const serverMessage =
          err?.response?.data?.message ??
          err?.response?.data?.messages ??
          err?.message ??
          "업로드 중 오류가 발생했습니다.";
        console.error("파일 업로드 실패:", err?.response ?? err);
        setFieldError(
          field,
          Array.isArray(serverMessage)
            ? serverMessage.join(", ")
            : serverMessage
        );
      } finally {
        setUploading(null);
        e.currentTarget.value = "";
      }
    };

  const clearUrl = (setter: (s: string) => void, field: UploadField) => {
    setter("");
    setFieldError(field, null);
  };

  const isImageUrl = (u?: string) =>
    !!u &&
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(
      (u.split("?")[0] || "").toLowerCase()
    );

  const disabledSave =
    !name.trim() ||
    !email.trim() ||
    pwMismatch ||
    pwTooShort ||
    uploading !== null;

  const submit = () => {
    const patch: Patch = {
      email: email.trim(),
      role,
      name: name.trim(),
      phone: phone.trim(),
      emergency_contact: emergency.trim(),
      address: address.trim(),
      salary_account: salary.trim(),
      birthday: birthday || undefined,
      photo_url: photoUrl || undefined,
      id_photo_url: idPhotoUrl || undefined,
      resident_register_url: residentRegUrl || undefined,
      resident_extract_url: residentExtUrl || undefined,
      family_relation_url: familyUrl || undefined,
    };
    if (!pwMismatch && !pwTooShort && pw) {
      patch.password = pw;
    }
    onSave(patch);
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[860px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <div className="text-sm font-semibold">계정 수정</div>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent"
            onClick={onClose}
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div>
            <div className="mb-3 text-sm font-semibold">기본 정보</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="이름">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              {/* 권한 */}
              <Field label="권한">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleKey)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="manager">관리자</option>
                  <option value="team_leader">팀장</option>
                  <option value="deputy_manager">과장</option>
                  <option value="general_manager">실장</option>
                  <option value="department_head">부장</option>
                  <option value="staff">사원</option>
                </select>
              </Field>
              {/* 이메일 */}
              <Field label="이메일">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="생년월일">
                <div className="w-full">
                  <BirthdayPicker
                    value={birthday ?? ""}
                    onChange={(v) => setBirthday(v)}
                    fromYear={1960}
                    toYear={new Date().getFullYear()}
                  />
                </div>
              </Field>
              {/* 비밀번호 */}
              <div className="sm:col-span-2">
                <div className="mb-1 text-[11px] text-muted-foreground">
                  새 비밀번호 (변경 시에만 입력)
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      placeholder="8자 이상"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border p-1 text-muted-foreground hover:bg-accent"
                      aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                    >
                      {showPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPw2 ? "text" : "password"}
                      placeholder="비밀번호 확인"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw2((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border p-1 text-muted-foreground hover:bg-accent"
                      aria-label={
                        showPw2 ? "비밀번호 확인 숨기기" : "비밀번호 확인 표시"
                      }
                    >
                      {showPw2 ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {pwTooShort && (
                  <p className="mt-2 text-xs text-destructive">
                    비밀번호는 8자 이상이어야 합니다.
                  </p>
                )}
                {pwMismatch && (
                  <p className="mt-1 text-xs text-destructive">
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>
              <Field label="연락처">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label="비상연락처">
                <Input
                  value={emergency}
                  onChange={(e) => setEmergency(e.target.value)}
                />
              </Field>
              <Field label="주소">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  readOnly={addressLocked}
                />
              </Field>
              <Field label="급여계좌">
                <Input
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* 추가 정보(파일) */}
          <section className="rounded-xl bg-muted/20 p-4 sm:p-5">
            <div className="mb-3 text-sm font-semibold">추가 정보</div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <UploadRow
                label="사진"
                value={photoUrl}
                onChange={handleFileChange("photo_url", setPhotoUrl)}
                onClear={() => clearUrl(setPhotoUrl, "photo_url")}
                loading={uploading === "photo_url"}
                error={uploadErrors.photo_url}
                isImage={isImageUrl(photoUrl)}
              />
              <UploadRow
                label="신분증사진"
                value={idPhotoUrl}
                onChange={handleFileChange("id_photo_url", setIdPhotoUrl)}
                onClear={() => clearUrl(setIdPhotoUrl, "id_photo_url")}
                loading={uploading === "id_photo_url"}
                error={uploadErrors.id_photo_url}
                isImage={isImageUrl(idPhotoUrl)}
              />
              <UploadRow
                label="등본"
                value={residentRegUrl}
                onChange={handleFileChange(
                  "resident_register_url",
                  setResidentRegUrl
                )}
                onClear={() =>
                  clearUrl(setResidentRegUrl, "resident_register_url")
                }
                loading={uploading === "resident_register_url"}
                error={uploadErrors.resident_register_url}
                isImage={isImageUrl(residentRegUrl)}
              />
              <UploadRow
                label="초본"
                value={residentExtUrl}
                onChange={handleFileChange(
                  "resident_extract_url",
                  setResidentExtUrl
                )}
                onClear={() =>
                  clearUrl(setResidentExtUrl, "resident_extract_url")
                }
                loading={uploading === "resident_extract_url"}
                error={uploadErrors.resident_extract_url}
                isImage={isImageUrl(residentExtUrl)}
              />
              <UploadRow
                label="가족관계증명서"
                value={familyUrl}
                onChange={handleFileChange("family_relation_url", setFamilyUrl)}
                onClear={() => clearUrl(setFamilyUrl, "family_relation_url")}
                loading={uploading === "family_relation_url"}
                error={uploadErrors.family_relation_url}
                isImage={isImageUrl(familyUrl)}
              />
            </div>
          </section>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
          <Button variant="outline" type="button" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={submit} disabled={disabledSave}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function UploadRow({
  label,
  value,
  onChange,
  onClear,
  loading,
  error,
  isImage,
}: {
  label: string;
  value?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onClear: () => void;
  loading?: boolean;
  error?: string;
  isImage?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="*/*"
          onChange={onChange}
          disabled={loading}
        />
        {value && (
          <button
            type="button"
            className="text-xs hover:bg-accent disabled:opacity-50 text-red-600 font-bold"
            onClick={onClear}
            disabled={!value || loading}
          >
            ×
          </button>
        )}
      </div>

      {loading && <p className="text-xs text-muted-foreground">업로드 중…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {value && (
        <div className="flex items-center gap-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={`${label} 미리보기`}
              className="h-20 w-20 rounded-md border object-cover"
            />
          ) : (
            <div className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
              {fileNameFromUrl(value)}
            </div>
          )}
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
          >
            원본 보기
          </a>
        </div>
      )}
    </div>
  );
}

function fileNameFromUrl(u?: string) {
  if (!u) return "";
  try {
    const url = new URL(u);
    return decodeURIComponent(url.pathname.split("/").pop() || "");
  } catch {
    return u.split("?")[0].split("#")[0].split("/").pop() || u;
  }
}
