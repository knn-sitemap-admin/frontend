"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/atoms/Form/Form";
import { useState, useEffect } from "react";
import { formatPhone } from "@/lib/formatPhone";
import { getTeams } from "@/features/teams";
import {
  getCredentialDetail,
  createEmployeeInfo,
} from "@/features/users/api/account";
import { useToast } from "@/hooks/use-toast";
import { uploadOnePhoto, UploadDomain } from "@/shared/api/photos/photoUpload";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/Popover/Popover";
import { Calendar } from "@/components/atoms/Calendar/Calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";

const phoneRegex = /^[0-9\-+() ]{9,20}$/;

const birthdaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "형식은 YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "유효한 날짜를 입력하세요.");

const UpdateUserSchema = z
  .object({
    name: z.string().min(1, "이름을 입력하세요.").max(100),
    positionRank: z.enum(
      [
        "ASSISTANT_MANAGER",
        "MANAGER",
        "DEPUTY_GENERAL",
        "GENERAL_MANAGER",
        "TEAM_LEADER",
        "DIRECTOR",
      ],
      {
        required_error: "직급을 선택하세요.",
      }
    ),
    phone: z
      .string()
      .regex(phoneRegex, "연락처 형식이 올바르지 않습니다.")
      .max(20),
    birthday: z
      .union([birthdaySchema, z.literal("")])
      .transform((v) => (v === "" ? undefined : v)),
    emergency_contact: z
      .string()
      .regex(phoneRegex, "연락처 형식이 올바르지 않습니다.")
      .max(20),
    address: z.string().min(1, "주소를 입력하세요.").max(200),
    salary_bank_name: z.string().min(1, "은행명을 입력하세요.").max(50),
    salary_account: z.string().min(1, "계좌번호를 입력하세요.").max(50),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .optional()
      .or(z.literal("")),
    password_confirm: z.string().optional(),
    photo_url: z
      .string()
      .url("URL 형식이 올바르지 않습니다.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    id_photo_url: z
      .string()
      .url("URL 형식이 올바르지 않습니다.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    resident_register_url: z
      .string()
      .url("URL 형식이 올바르지 않습니다.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    resident_extract_url: z
      .string()
      .url("URL 형식이 올바르지 않습니다.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    family_relation_url: z
      .string()
      .url("URL 형식이 올바르지 않습니다.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine(
    (data) => {
      // 비밀번호가 입력되지 않았으면 검증 통과
      if (!data.password || data.password === "") return true;
      // 비밀번호가 입력되었으면 확인도 일치해야 함
      return data.password === data.password_confirm;
    },
    {
      message: "비밀번호가 일치하지 않습니다.",
      path: ["password_confirm"],
    }
  );

type UpdateUserValues = z.infer<typeof UpdateUserSchema>;

type UploadField =
  | "photo_url"
  | "id_photo_url"
  | "resident_register_url"
  | "resident_extract_url"
  | "family_relation_url";

interface AccountEditFormModalProps {
  open: boolean;
  credentialId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AccountEditFormModal({
  open,
  credentialId,
  onClose,
  onSuccess,
}: AccountEditFormModalProps) {
  if (!open) return null;

  return (
    <AccountEditFormModalBody
      credentialId={credentialId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function AccountEditFormModalBody({
  credentialId,
  onClose,
  onSuccess,
}: {
  credentialId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const form = useForm<UpdateUserValues>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: {
      name: "",
      positionRank: "ASSISTANT_MANAGER",
      phone: "",
      birthday: "",
      emergency_contact: "",
      address: "",
      salary_bank_name: "",
      salary_account: "",
      password: "",
      password_confirm: "",
      photo_url: "",
      id_photo_url: "",
      resident_register_url: "",
      resident_extract_url: "",
      family_relation_url: "",
    },
    mode: "onChange",
  });

  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [uploadErrors, setUploadErrors] = useState<
    Partial<Record<UploadField, string>>
  >({});
  const [isBirthdayOpen, setIsBirthdayOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // 계정 상세 정보 로드
  useEffect(() => {
    if (!credentialId) return;

    const loadAccountDetail = async () => {
      setIsLoading(true);
      try {
        const detail = await getCredentialDetail(credentialId);
        const account = detail.account;

        if (account) {
          form.reset({
            name: account.name || "",
            positionRank: (account as any).positionRank || "ASSISTANT_MANAGER",
            phone: account.phone || "",
            birthday: (account as any).birthday || "",
            emergency_contact: account.emergencyContact || "",
            address: account.address || "",
            salary_bank_name: account.salaryBankName || "",
            salary_account: account.salaryAccount || "",
            password: "",
            password_confirm: "",
            photo_url: account.profileUrl || "",
            id_photo_url: (account as any).docUrlIdCard || "",
            resident_register_url:
              (account as any).docUrlResidentRegistration || "",
            resident_extract_url: (account as any).docUrlResidentAbstract || "",
            family_relation_url: (account as any).docUrlFamilyRelation || "",
          });
        }
      } catch (error: any) {
        console.error("계정 상세 정보 로드 실패:", error);
        toast({
          title: "계정 정보 로드 실패",
          description: "계정 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountDetail();
  }, [credentialId, form, toast]);

  const setFieldError = (field: UploadField, msg: string | null) =>
    setUploadErrors((prev) => ({ ...prev, [field]: msg || undefined }));

  const handleSubmit = async (v: UpdateUserValues) => {
    if (uploading || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const employeeData = {
        name: v.name,
        phone: v.phone,
        emergencyContact: v.emergency_contact,
        addressLine: v.address,
        salaryBankName: v.salary_bank_name,
        salaryAccount: v.salary_account,
        positionRank: v.positionRank,
        profileUrl: v.photo_url,
        docUrlIdCard: v.id_photo_url,
        docUrlResidentRegistration: v.resident_register_url,
        docUrlResidentAbstract: v.resident_extract_url,
        docUrlFamilyRelation: v.family_relation_url,
      };

      await createEmployeeInfo(credentialId, employeeData);

      // 비밀번호 변경이 필요한 경우 별도 처리 (백엔드 API 확인 필요)
      if (v.password && v.password.length >= 8) {
        // TODO: 비밀번호 변경 API 호출
        console.log("비밀번호 변경 필요:", v.password);
      }

      toast({
        title: "계정 수정 완료",
        description: "계정 정보가 성공적으로 수정되었습니다.",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("계정 수정 실패:", error);

      const errorMessages = error?.response?.data?.messages || [];
      const errorMessage =
        errorMessages.length > 0
          ? errorMessages.join(", ")
          : "계정 수정 중 오류가 발생했습니다.";

      toast({
        title: "계정 수정 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadDomainMap: Record<UploadField, UploadDomain> = {
    photo_url: "profile",
    id_photo_url: "profile",
    resident_register_url: "etc",
    resident_extract_url: "etc",
    family_relation_url: "etc",
  };

  const handleFileChange =
    (field: UploadField): React.ChangeEventHandler<HTMLInputElement> =>
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFieldError(field, null);

      if (file.size > 5 * 1024 * 1024) {
        setFieldError(field, "파일이 너무 큽니다. 최대 5MB 까지 가능합니다.");
        if (e.currentTarget) {
          e.currentTarget.value = "";
        }
        return;
      }

      setUploading(field);
      try {
        const domain = uploadDomainMap[field] ?? "etc";
        const meta = await uploadOnePhoto(file, { domain });
        if (!meta?.url) {
          throw new Error("업로드 응답에 URL이 없습니다.");
        }

        form.setValue(field, meta.url, { shouldValidate: true });
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
        if (e.currentTarget) {
          e.currentTarget.value = "";
        }
      }
    };

  const clearFile = (field: UploadField) => {
    form.setValue(field, "", { shouldValidate: true });
    setFieldError(field, null);
  };

  const isImageUrl = (url?: string) =>
    !!url && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url.split("?")[0] || "");

  const photoUrl = form.watch("photo_url");
  const idPhotoUrl = form.watch("id_photo_url");
  const regUrl = form.watch("resident_register_url");
  const extUrl = form.watch("resident_extract_url");
  const famUrl = form.watch("family_relation_url");

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute left-1/2 top-1/2 w-[860px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-xl p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">계정 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[860px] max-w-[95vw] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-xl overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-6 py-3 flex-shrink-0">
          <div className="text-sm font-semibold">계정 수정</div>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent"
            onClick={onClose}
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 - 스크롤 가능 */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="grid grid-cols-1 gap-6"
            >
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 이름 */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름 *</FormLabel>
                      <FormControl>
                        <Input placeholder="홍길동" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 직급 */}
                <FormField
                  control={form.control}
                  name="positionRank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>직급 *</FormLabel>
                      <FormControl>
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="ASSISTANT_MANAGER">대리</option>
                          <option value="MANAGER">과장</option>
                          <option value="DEPUTY_GENERAL">차장</option>
                          <option value="GENERAL_MANAGER">부장</option>
                          <option value="TEAM_LEADER">팀장</option>
                          <option value="DIRECTOR">실장</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 생년월일 */}
                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => {
                    const selectedDate = field.value
                      ? new Date(field.value)
                      : undefined;
                    return (
                      <FormItem className="flex flex-col gap-2">
                        <FormLabel>생년월일</FormLabel>
                        <Popover
                          open={isBirthdayOpen}
                          onOpenChange={setIsBirthdayOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`flex w-full items-center justify-between text-left font-normal ${
                                !selectedDate ? "text-muted-foreground" : ""
                              }`}
                            >
                              {selectedDate ? (
                                format(selectedDate, "PPP", { locale: ko })
                              ) : (
                                <span>생년월일을 선택하세요</span>
                              )}
                              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              locale={ko}
                              i18nLocale="ko-KR"
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                field.onChange(
                                  date ? format(date, "yyyy-MM-dd") : ""
                                );
                                setIsBirthdayOpen(false);
                              }}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                {/* 비밀번호 (선택) */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 (변경 시에만 입력)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="8자 이상"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password_confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="비밀번호 다시 입력"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 연락처 */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>연락처 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="010-1234-5678"
                          {...field}
                          onChange={(e) =>
                            field.onChange(formatPhone(e.target.value))
                          }
                          inputMode="tel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 비상 연락처 */}
                <FormField
                  control={form.control}
                  name="emergency_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비상 연락처 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="010-0000-0000"
                          {...field}
                          onChange={(e) =>
                            field.onChange(formatPhone(e.target.value))
                          }
                          inputMode="tel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 주소 */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>주소 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="서울특별시 ○○구 ○○로 12, 101호"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 은행명 */}
                <FormField
                  control={form.control}
                  name="salary_bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>은행명 *</FormLabel>
                      <FormControl>
                        <Input placeholder="국민은행" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 급여계좌 */}
                <FormField
                  control={form.control}
                  name="salary_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>급여계좌 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="계좌번호를 입력해주세요"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 추가 정보 (파일 업로드) */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  추가 정보 (선택사항 - 이미지/문서 업로드)
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <UploadRow
                    label="증명사진"
                    value={photoUrl}
                    error={uploadErrors.photo_url}
                    loading={uploading === "photo_url"}
                    onChange={handleFileChange("photo_url")}
                    onClear={() => clearFile("photo_url")}
                    isImage
                  />
                  <UploadRow
                    label="신분증 사진"
                    value={idPhotoUrl}
                    error={uploadErrors.id_photo_url}
                    loading={uploading === "id_photo_url"}
                    onChange={handleFileChange("id_photo_url")}
                    onClear={() => clearFile("id_photo_url")}
                    isImage
                  />
                  <UploadRow
                    label="등본"
                    value={regUrl}
                    error={uploadErrors.resident_register_url}
                    loading={uploading === "resident_register_url"}
                    onChange={handleFileChange("resident_register_url")}
                    onClear={() => clearFile("resident_register_url")}
                    isImage={isImageUrl(regUrl)}
                  />
                  <UploadRow
                    label="초본"
                    value={extUrl}
                    error={uploadErrors.resident_extract_url}
                    loading={uploading === "resident_extract_url"}
                    onChange={handleFileChange("resident_extract_url")}
                    onClear={() => clearFile("resident_extract_url")}
                    isImage={isImageUrl(extUrl)}
                  />
                  <UploadRow
                    label="가족관계증명서"
                    value={famUrl}
                    error={uploadErrors.family_relation_url}
                    loading={uploading === "family_relation_url"}
                    onChange={handleFileChange("family_relation_url")}
                    onClear={() => clearFile("family_relation_url")}
                    isImage={isImageUrl(famUrl)}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-3 flex-shrink-0">
          <Button variant="outline" type="button" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={!!uploading || isSubmitting}
          >
            {isSubmitting ? "수정 중..." : uploading ? "업로드 대기…" : "수정"}
          </Button>
        </div>
      </div>
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
          className="text-xs"
        />
        {value && (
          <button
            type="button"
            className="text-xs hover:bg-accent disabled:opacity-50 text-red-600 font-bold px-2 py-1 rounded"
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
