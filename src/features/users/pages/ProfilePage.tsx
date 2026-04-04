"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/atoms/Card/Card";
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
import { Plus, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProfile,
  updateMyProfile,
  patchAccountPassword,
  type UpdateMyProfileRequest,
} from "@/features/users/api/account";
import { useToast } from "@/hooks/use-toast";
import { uploadOnePhoto, uploadPhotos, UploadDomain } from "@/shared/api/photos/photoUpload";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/atoms/Avatar/Avatar";
import { isImageUrl, isAccessibleUrl, getAccessibleUrl } from "@/shared/utils/file";

const phoneRegex = /^[0-9\-+() ]{9,20}$/;

/** ========== 검증 스키마 ========== */
const ProfileSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  phone: z
    .string()
    .min(1, "연락처를 입력해주세요.")
    .regex(phoneRegex, "올바른 연락처 형식이 아닙니다."),
  emergencyContact: z.string().min(1, "비상 연락처를 입력해주세요."),
  addressLine: z.string().min(1, "주소를 입력해주세요."),
  salaryBankName: z.string().min(1, "은행명을 입력해주세요."),
  salaryAccount: z.string().min(1, "계좌번호를 입력해주세요."),
  profileUrl: z.string().optional(),
  docUrlResidentRegistration: z.array(z.string()).optional().default([]),
  docUrlResidentAbstract: z.array(z.string()).optional().default([]),
  docUrlIdCard: z.array(z.string()).optional().default([]),
  docUrlFamilyRelation: z.array(z.string()).optional().default([]),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .optional()
    .or(z.literal("")),
  password_confirm: z.string().optional(),
}).refine(
  (data) => {
    if (!data.password || data.password === "") return true;
    return data.password === data.password_confirm;
  },
  {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["password_confirm"],
  }
);

type ProfileFormValues = z.infer<typeof ProfileSchema>;

type UploadField =
  | "profileUrl"
  | "docUrlResidentRegistration"
  | "docUrlResidentAbstract"
  | "docUrlIdCard"
  | "docUrlFamilyRelation";

const uploadFieldLabels: Record<UploadField, string> = {
  profileUrl: "프로필 사진",
  docUrlResidentRegistration: "주민등록등본",
  docUrlResidentAbstract: "주민등록초본",
  docUrlIdCard: "신분증",
  docUrlFamilyRelation: "가족관계증명서",
};

const uploadDomainMap: Record<UploadField, UploadDomain> = {
  profileUrl: "profile",
  docUrlResidentRegistration: "etc",
  docUrlResidentAbstract: "etc",
  docUrlIdCard: "etc",
  docUrlFamilyRelation: "etc",
};

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [uploadErrors, setUploadErrors] = useState<
    Partial<Record<UploadField, string>>
  >({});

  // 프로필 조회
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000, // 10분
  });

  // 프로필 수정 Mutation
  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "프로필 수정 완료",
        description: "프로필이 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "프로필 수정 실패",
        description:
          error?.response?.data?.message ||
          "프로필 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: "",
      phone: "",
      emergencyContact: "",
      addressLine: "",
      salaryBankName: "",
      salaryAccount: "",
      profileUrl: "",
      docUrlResidentRegistration: [],
      docUrlResidentAbstract: [],
      docUrlIdCard: [],
      docUrlFamilyRelation: [],
      password: "",
      password_confirm: "",
    },
    mode: "onChange",
  });

  // 프로필 데이터 로드 시 폼에 채우기
  useEffect(() => {
    if (profile?.account) {
      const account = profile.account;
      form.reset({
        name: account.name || "",
        phone: account.phone || "",
        emergencyContact: account.emergencyContact || "",
        addressLine: account.addressLine || "",
        salaryBankName: account.bankName || "",
        salaryAccount: account.bankAccountNo || "",
        profileUrl: account.photoUrl || "",
        docUrlResidentRegistration: account.docUrlResidentRegistration || [],
        docUrlResidentAbstract: account.docUrlResidentAbstract || [],
        docUrlIdCard: account.docUrlIdCard || [],
        docUrlFamilyRelation: account.docUrlFamilyRelation || [],
      });
    }
  }, [profile, form]);

  /** 공용 업로드 핸들러 */
  const handleFileChange =
    (field: UploadField): React.ChangeEventHandler<HTMLInputElement> =>
    async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploadErrors((prev) => ({ ...prev, [field]: undefined }));

      const maxUploadBytes = 5 * 1024 * 1024; // 5MB
      
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxUploadBytes) {
          setUploadErrors((prev) => ({
            ...prev,
            [field]: `파일이 너무 큽니다. 최대 ${(
              maxUploadBytes /
              (1024 * 1024)
            ).toFixed(1)}MB 까지 가능합니다.`,
          }));
          if (e.currentTarget) e.currentTarget.value = "";
          return;
        }
      }

      setUploading(field);
      try {
        const domain = uploadDomainMap[field] ?? "etc";
        
        if (field === "profileUrl") {
          const meta = await uploadOnePhoto(files[0], { domain });
          const urlToUse = meta?.url || meta?.key || null;
          if (!urlToUse) throw new Error("업로드 응답에 URL이 없습니다.");
          form.setValue(field, urlToUse, { shouldValidate: true });
        } else {
          // 최대 5장 제한
          const currentUrls = (form.getValues(field) as string[]) || [];
          if (currentUrls.length + files.length > 5) {
            setUploadErrors((prev) => ({ ...prev, [field]: "최대 5장까지만 등록 가능합니다." }));
            return;
          }

          const metas = await uploadPhotos(Array.from(files), { domain });
          const newUrls = metas.map(m => m.url).filter(Boolean) as string[];
          form.setValue(field, [...currentUrls, ...newUrls], { shouldValidate: true });
        }
        
        setUploadErrors((prev) => ({ ...prev, [field]: undefined }));
      } catch (err: any) {
        const serverMessage =
          err?.response?.data?.message ??
          err?.message ??
          "업로드 중 오류가 발생했습니다.";
        setUploadErrors((prev) => ({
          ...prev, [field]: serverMessage
        }));
      } finally {
        setUploading(null);
        if (e.currentTarget) e.currentTarget.value = "";
      }
    };

  const removeFileAt = (field: UploadField, index: number) => {
    const current = (form.getValues(field) as string[]) || [];
    const next = [...current];
    next.splice(index, 1);
    form.setValue(field, next, { shouldValidate: true });
  };

  const clearFile = (field: UploadField) => {
    if (field === "profileUrl") {
      form.setValue(field, "", { shouldValidate: true });
    } else {
      form.setValue(field, [], { shouldValidate: true });
    }
    setUploadErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (values: ProfileFormValues) => {
    const payload: UpdateMyProfileRequest = {
      name: values.name || null,
      phone: values.phone || null,
      emergencyContact: values.emergencyContact || null,
      addressLine: values.addressLine || null,
      salaryBankName: values.salaryBankName || null,
      salaryAccount: values.salaryAccount || null,
      profileUrl: values.profileUrl || null,
      docUrlResidentRegistration: values.docUrlResidentRegistration || null,
      docUrlResidentAbstract: values.docUrlResidentAbstract || null,
      docUrlIdCard: values.docUrlIdCard || null,
      docUrlFamilyRelation: values.docUrlFamilyRelation || null,
    };

    try {
      // 본인 정보 수정
      await updateMutation.mutateAsync(payload);

      // 관리자이면서 비밀번호를 입력한 경우 비밀번호 변경 API 호출
      if (profile?.role === "admin" && values.password && values.password.length >= 8) {
        await patchAccountPassword(profile.credentialId, values.password);
        toast({
          title: "비밀번호 변경 완료",
          description: "보안을 위해 다시 로그인해주세요. 2초 후 로그인 페이지로 이동합니다.",
        });
        
        // 세션이 무효화되었으므로 로그인 페이지로 리다이렉트
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      // 에러 처리는 mutateAsync 내부 또는 toast에서 이미 처리됨
    }
  };

  const photoUrl = form.watch("profileUrl");
  const accessiblePhotoUrl = getAccessibleUrl(photoUrl);

  // 디버깅: 프로필 이미지 URL 확인
  useEffect(() => {
    console.log("=== 프로필 이미지 URL 상태 ===");
    console.log("photoUrl (원본):", photoUrl);
    console.log("accessiblePhotoUrl:", accessiblePhotoUrl);
    console.log("isAccessibleUrl(photoUrl):", isAccessibleUrl(photoUrl));
  }, [photoUrl, accessiblePhotoUrl]);

  if (isProfileLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              프로필을 불러오는 중...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        <div className="text-center py-12">
          <p className="text-lg font-semibold mb-2">
            프로필을 불러올 수 없습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">내 프로필</h1>
        <p className="text-sm text-muted-foreground mt-2">
          내 정보를 조회하고 수정할 수 있습니다.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 프로필 사진 */}
              <FormField
                control={form.control}
                name="profileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>프로필 사진</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 ring-2 ring-border">
                          <AvatarImage
                            src={accessiblePhotoUrl || undefined}
                            alt="프로필 사진"
                            onError={(e) => {
                              console.error(
                                "프로필 이미지 로드 실패:",
                                accessiblePhotoUrl
                              );
                              console.error("에러 이벤트:", e);
                            }}
                            onLoad={() => {
                              console.log(
                                "프로필 이미지 로드 성공:",
                                accessiblePhotoUrl
                              );
                            }}
                          />
                          <AvatarFallback className="text-xl font-semibold">
                            {form.watch("name")?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <label
                                htmlFor="profile-upload"
                                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                            >
                              {uploading === "profileUrl" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              {photoUrl ? "변경" : "업로드"}
                            </label>
                            <input
                              id="profile-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileChange("profileUrl")}
                              disabled={uploading === "profileUrl"}
                            />
                            {photoUrl && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => clearFile("profileUrl")}
                                disabled={uploading === "profileUrl"}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {uploadErrors.profileUrl && (
                            <p className="text-sm text-destructive">
                              {uploadErrors.profileUrl}
                            </p>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="이름을 입력하세요" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="010-1234-5678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비상 연락처</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="010-9999-0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="서울시 어딘가" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 비밀번호 변경 - 관리자만 노출 */}
          {profile?.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>비밀번호 변경 (관리자 전용)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>새 비밀번호</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="변경할 비밀번호를 입력하세요 (최소 8자)"
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
                          {...field}
                          type="password"
                          placeholder="비밀번호를 다시 한 번 입력하세요"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* 급여 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>급여 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="salaryBankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>은행명</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="국민은행" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salaryAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>계좌번호</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="계좌번호를 입력해주세요" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 서류 */}
          <Card>
            <CardHeader>
              <CardTitle>서류</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  "docUrlResidentRegistration",
                  "docUrlResidentAbstract",
                  "docUrlIdCard",
                  "docUrlFamilyRelation",
                ] as UploadField[]
              ).map((field) => {
                const urls = form.watch(field) as string[];
                return (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field}
                    render={() => (
                      <FormItem>
                        <MultipleUploadRow
                          label={uploadFieldLabels[field]}
                          values={urls}
                          error={uploadErrors[field]}
                          loading={uploading === field}
                          onChange={handleFileChange(field)}
                          onRemove={(idx) => removeFileAt(field, idx)}
                          maxCount={5}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}
            </CardContent>
          </Card>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              disabled={updateMutation.isPending || uploading !== null}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
/** 여러 장 파일 업로드 공용 UI 블록 */
function MultipleUploadRow({
  label,
  values = [],
  error,
  loading,
  onChange,
  onRemove,
  maxCount = 5,
}: {
  label: string;
  values?: string[];
  error?: string;
  loading?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onRemove: (index: number) => void;
  maxCount?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{values.length} / {maxCount}</div>
      </div>
      
      <div className="flex flex-col gap-2">
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground justify-center">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          파일 추가
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={onChange}
            disabled={loading || values.length >= maxCount}
            multiple
          />
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {values.map((v, idx) => (
            <div key={idx} className="group relative aspect-square">
              <div className="h-full w-full overflow-hidden rounded-md border bg-muted/20">
                {isImageUrl(v) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v}
                    alt={`${label}-${idx}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground overflow-hidden px-1">
                    파일
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm hover:bg-destructive/80 group-hover:flex"
              >
                <span className="text-xs">×</span>
              </button>
              <a
                href={v}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-x-0 bottom-0 flex h-4 items-center justify-center bg-black/40 text-[8px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                원본
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
