"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Lock, Key, RefreshCcw, Plus, Loader2, Upload, ImageIcon, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";
import { Input } from "@/components/atoms/Input/Input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/atoms/Form/Form";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatPhone } from "@/lib/formatPhone";
import { getTeams } from "@/features/teams";
import {
  getCredentialDetail,
  createEmployeeInfo,
  patchAccountPassword,
  patchPositionRank,
  getProfile,
} from "@/features/users/api/account";
import { useToast } from "@/hooks/use-toast";
import { uploadOnePhoto, uploadPhotos, UploadDomain } from "@/shared/api/photos/photoUpload";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/Popover/Popover";
import { Calendar } from "@/components/atoms/Calendar/Calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import { isImageUrl, fileNameFromUrl } from "@/shared/utils/file";

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
        "CEO",
      ],
      {
        required_error: "직급을 선택하세요.",
      }
    ),
    phone: z
      .string()
      .regex(phoneRegex, "연락처 형식이 올바르지 않습니다.")
      .max(20)
      .optional()
      .or(z.literal("")),
    birthday: z
      .union([birthdaySchema, z.literal("")])
      .transform((v) => (v === "" ? undefined : v)),
    emergency_contact: z
      .string()
      .regex(phoneRegex, "연락처 형식이 올바르지 않습니다.")
      .max(20)
      .optional()
      .or(z.literal("")),
    address: z.string().max(200).optional().or(z.literal("")),
    salary_bank_name: z.string().max(50).optional().or(z.literal("")),
    salary_account: z.string().max(50).optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .optional()
      .or(z.literal("")),
    password_confirm: z.string().optional(),
    team: z
      .object({
        teamId: z.string(),
        isPrimary: z.boolean().optional(),
        joinedAt: z.string().optional(),
      })
      .optional()
      .transform((val) => {
        // teamId가 빈 문자열이거나 없으면 undefined로 변환
        if (!val || !val.teamId || val.teamId.trim() === "") {
          return undefined;
        }
        return val;
      }),
    photo_url: z
      .string()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    id_photo_urls: z.array(z.string()).optional().default([]),
    resident_register_urls: z.array(z.string()).optional().default([]),
    resident_extract_urls: z.array(z.string()).optional().default([]),
    family_relation_urls: z.array(z.string()).optional().default([]),
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
  )
  .refine(
    (data) => {
      // 팀장은 팀 배정 불가 (이미 transform에서 처리되지만 명시적으로 검증)
      if (data.positionRank === "TEAM_LEADER") {
        return !data.team;
      }
      return true;
    },
    {
      message: "팀장 직급은 팀 배정이 불가능합니다.",
      path: ["team"],
    }
  );

type UpdateUserValues = z.infer<typeof UpdateUserSchema>;

type UploadField =
  | "photo_url"
  | "id_photo_urls"
  | "resident_register_urls"
  | "resident_extract_urls"
  | "family_relation_urls";

interface AccountEditFormModalProps {
  open: boolean;
  credentialId: string;
  positionRank?: string | null; // 계정 리스트에서 전달받은 직급 (optional)
  onClose: () => void;
  onSuccess: () => void;
}

export default function AccountEditFormModal({
  open,
  credentialId,
  positionRank,
  onClose,
  onSuccess,
}: AccountEditFormModalProps) {
  if (!open) return null;

  return (
    <AccountEditFormModalBody
      credentialId={credentialId}
      positionRank={positionRank}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function AccountEditFormModalBody({
  credentialId,
  positionRank,
  onClose,
  onSuccess,
}: {
  credentialId: string;
  positionRank?: string | null; // 계정 리스트에서 전달받은 직급 (optional)
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
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
      team: undefined,
      photo_url: "",
      id_photo_urls: [],
      resident_register_urls: [],
      resident_extract_urls: [],
      family_relation_urls: [],
    },
    mode: "onChange",
  });

  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [uploadErrors, setUploadErrors] = useState<
    Partial<Record<UploadField, string>>
  >({});
  const [isBirthdayOpen, setIsBirthdayOpen] = useState(false);
  const [rotatingField, setRotatingField] = useState<UploadField | null>(null);
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null);

  const handleRotate = async (field: UploadField, index: number) => {
    const urls = form.getValues(field as any);
    let targetUrl = "";
    if (field === "photo_url") {
      targetUrl = urls as string;
    } else {
      targetUrl = (urls as string[])[index];
    }

    if (!targetUrl) return;

    setRotatingField(field);
    setRotatingIndex(index);
    setFieldError(field, null);

    try {
      const { rotateImage90 } = await import("@/shared/utils/file");
      const rotatedBlob = await rotateImage90(targetUrl);
      
      const fileName = targetUrl.split("/").pop()?.split("?")[0] || "rotated.jpg";
      const file = new File([rotatedBlob], fileName, { type: rotatedBlob.type });

      const domain = uploadDomainMap[field] ?? "etc";
      if (field === "photo_url") {
        const meta = await uploadOnePhoto(file, { domain });
        if (meta?.url) {
          form.setValue(field, meta.url, { shouldValidate: true, shouldDirty: true });
        }
      } else {
        const metas = await uploadPhotos([file], { domain });
        const newUrl = metas[0]?.url;
        if (!newUrl) throw new Error("업로드 응답에 URL이 없습니다.");
        
        const currentUrls = [...((urls as string[]) || [])];
        currentUrls[index] = newUrl;
        form.setValue(field as any, currentUrls, { shouldValidate: true, shouldDirty: true });
      }
      toast({
        title: "이미지 회전 완료",
        description: "이미지가 성공적으로 회전하여 재업로드되었습니다.",
      });
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ??
        err?.message ??
        "이미지 회전 중 오류가 발생했습니다.";
      setFieldError(field, serverMessage);
      toast({
        title: "이미지 회전 실패",
        description: serverMessage,
        variant: "destructive",
      });
    } finally {
      setRotatingField(null);
      setRotatingIndex(null);
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  /** 팀 목록 관리 */
  const [teams, setTeams] = useState<
    Array<{ id: number | string; name: string; teamLeaderName: string | null }>
  >([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // 팀 목록 로드
  const watchedPositionRank = form.watch("positionRank");

  // 팀장 직급일 경우 팀 정보 초기화 (검증 오류 방지)
  useEffect(() => {
    if (watchedPositionRank === "TEAM_LEADER") {
      form.setValue("team", undefined);
    }
  }, [watchedPositionRank, form]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teamData = await getTeams();
        setTeams(
          teamData.map((team) => ({
            id: team.id,
            name: team.name,
            teamLeaderName: team.teamLeaderName || null,
          }))
        );
      } catch (error: any) {
        console.error("팀 목록 로드 실패:", error);
        setTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    };
    loadTeams();
  }, []);

  // 계정 상세 정보 로드
  useEffect(() => {
    if (!credentialId) return;

    const loadAccountDetail = async () => {
      setIsLoading(true);
      try {
        const detail = await getCredentialDetail(credentialId);
        const account = detail.account;
        const team = detail.team;

        if (account) {
          // props로 전달받은 positionRank가 있으면 그것을 사용, 없으면 API 응답에서 가져옴
          const finalPositionRank = positionRank || (account as any).positionRank || "ASSISTANT_MANAGER";
          const isTeamLeader = finalPositionRank === "TEAM_LEADER";

          form.reset({
            name: account.name || "",
            positionRank: finalPositionRank,
            phone: account.phone || "",
            birthday: (account as any).birthday || "",
            emergency_contact: account.emergencyContact || "",
            address: account.address || "",
            salary_bank_name: account.salaryBankName || "",
            salary_account: account.salaryAccount || "",
            password: "",
            password_confirm: "",
            team:
              team && !isTeamLeader
                ? {
                    teamId: team.id,
                    isPrimary: team.isPrimary,
                    joinedAt: team.joinedAt || undefined,
                  }
                : undefined,
            photo_url: account.profileUrl || "",
            id_photo_urls: (account as any).docUrlIdCard || [],
            resident_register_urls:
              (account as any).docUrlResidentRegistration || [],
            resident_extract_urls: (account as any).docUrlResidentAbstract || [],
            family_relation_urls: (account as any).docUrlFamilyRelation || [],
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
  }, [credentialId, positionRank, form, toast]);

  const setFieldError = (field: UploadField, msg: string | null) =>
    setUploadErrors((prev) => ({ ...prev, [field]: msg || undefined }));

  const handleSubmit = async (v: UpdateUserValues) => {
    if (uploading || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. 다른 정보가 변경되었는지 확인 (단순화를 위해 비밀번호 외 필드 존재 여부 체크)
      // 실제로는 initial values와 비교하는 것이 좋지만, 
      // 사용자가 비밀번호 관리 섹션을 열고 입력했다는 점에 착안하여 처리
      
      const hasPassword = v.password && v.password.length >= 8;
      
      // 비밀번호 외에 이름, 연락처 등 다른 정보가 수정되었는지 여부
      // (여기서는 안전하게 하기 위해 항상 보낼 수도 있지만, 사용자의 요청에 따라 
      // 비밀번호만 있는 경우 정보 수정을 건너뛰는 옵션을 고려)
      
      // 사용자가 비밀번호만 변경하려고 하는지 판단 (isChangingPassword 상태 활용 가능)
      // 여기서는 더 확실하게, 다른 필드들이 기존값과 동일하다면 건너뛰는 로직을 적용할 수도 있으나
      // 우선 "비밀번호만 변경" 버튼의 의도에 맞게 처리합니다.

      const employeeData = {
        name: v.name || null,
        phone: v.phone || null,
        emergencyContact: v.emergency_contact || null,
        addressLine: v.address || null,
        salaryBankName: v.salary_bank_name || null,
        salaryAccount: v.salary_account || null,
        positionRank: v.positionRank,
        profileUrl: v.photo_url || null,
        docUrlIdCard: v.id_photo_urls && v.id_photo_urls.length > 0 ? v.id_photo_urls : null,
        docUrlResidentRegistration: v.resident_register_urls && v.resident_register_urls.length > 0 ? v.resident_register_urls : null,
        docUrlResidentAbstract: v.resident_extract_urls && v.resident_extract_urls.length > 0 ? v.resident_extract_urls : null,
        docUrlFamilyRelation: v.family_relation_urls && v.family_relation_urls.length > 0 ? v.family_relation_urls : null,
      };

      // 비밀번호 외에 다른 필드가 하나라도 수정되었는지 (dirty check)
      const isInfoDirty = form.formState.dirtyFields.name || 
                         form.formState.dirtyFields.phone || 
                         form.formState.dirtyFields.emergency_contact || 
                         form.formState.dirtyFields.address || 
                         form.formState.dirtyFields.salary_bank_name || 
                         form.formState.dirtyFields.salary_account ||
                         form.formState.dirtyFields.positionRank ||
                         form.formState.dirtyFields.photo_url ||
                         form.formState.dirtyFields.id_photo_urls ||
                         form.formState.dirtyFields.resident_register_urls ||
                         form.formState.dirtyFields.resident_extract_urls ||
                         form.formState.dirtyFields.family_relation_urls;

      // 다른 정보가 수정된 경우에만 직원 정보 API 호출
      if (isInfoDirty) {
        await createEmployeeInfo(credentialId, employeeData as any);
      }

      // 비밀번호 변경이 필요한 경우 별도 처리
      if (hasPassword) {
        await patchAccountPassword(credentialId, v.password!);
      }

      toast({
        title: "계정 수정 완료",
        description: hasPassword && !isInfoDirty 
          ? "비밀번호가 성공적으로 변경되었습니다." 
          : "계정 정보가 성공적으로 수정되었습니다.",
      });

      // 본인 비밀번호를 수정한 경우 로그아웃 및 리다이렉트
      if (hasPassword && profile?.credentialId === credentialId) {
        toast({
          title: "비밀번호 변경 완료",
          description: "보안을 위해 다시 로그인해주세요. 2초 후 로그인 페이지로 이동합니다.",
        });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
        return;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("계정 수정 실패:", error);

      const errorMessages = error?.response?.data?.messages || [];
      const errorMessage =
        Array.isArray(errorMessages) && errorMessages.length > 0
          ? errorMessages.join("\n")
          : error?.response?.data?.message || "계정 수정 중 오류가 발생했습니다.";

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
    id_photo_urls: "profile",
    resident_register_urls: "etc",
    resident_extract_urls: "etc",
    family_relation_urls: "etc",
  };

  const handleFileChange =
    (field: UploadField): React.ChangeEventHandler<HTMLInputElement> =>
    async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setFieldError(field, null);

      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 30 * 1024 * 1024) {
          setFieldError(field, "파일 중 하나가 너무 큽니다. 최대 30MB 까지 가능합니다.");
          if (e.currentTarget) e.currentTarget.value = "";
          return;
        }
      }

      setUploading(field);
      try {
        const domain = uploadDomainMap[field] ?? "etc";
        
        if (field === "photo_url") {
          const meta = await uploadOnePhoto(files[0], { domain });
          if (meta?.url) {
            form.setValue(field, meta.url, { shouldValidate: true, shouldDirty: true });
          }
        } else {
          const currentUrls = (form.getValues(field as any) as string[]) || [];
          if (currentUrls.length + files.length > 5) {
            setFieldError(field, "최대 5장까지만 등록 가능합니다.");
            return;
          }

          const metas = await uploadPhotos(Array.from(files), { domain });
          const newUrls = metas.map(m => m.url).filter(Boolean) as string[];
          form.setValue(field as any, [...currentUrls, ...newUrls], { shouldValidate: true, shouldDirty: true });
        }
      } catch (err: any) {
        const serverMessage =
          err?.response?.data?.message ??
          err?.message ??
          "업로드 중 오류가 발생했습니다.";
        setFieldError(field, serverMessage);
      } finally {
        setUploading(null);
        if (e.currentTarget) e.currentTarget.value = "";
      }
    };

  const removeFileAt = (field: UploadField, index: number) => {
    const current = (form.getValues(field as any) as string[]) || [];
    const next = [...current];
    next.splice(index, 1);
    form.setValue(field as any, next, { shouldValidate: true, shouldDirty: true });
  };

  const clearFile = (field: UploadField) => {
    if (field === "photo_url") {
      form.setValue(field, "", { shouldValidate: true, shouldDirty: true });
    } else {
      form.setValue(field as any, [], { shouldValidate: true, shouldDirty: true });
    }
    setFieldError(field, null);
  };

  const photoUrl = form.watch("photo_url");
  const idPhotoUrls = form.watch("id_photo_urls");
  const regUrls = form.watch("resident_register_urls");
  const extUrls = form.watch("resident_extract_urls");
  const famUrls = form.watch("family_relation_urls");

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
                          <option value="CEO">대표이사</option>
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
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              defaultMonth={selectedDate}
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
                {/* 비밀번호 관리 섹션 */}
                <div className="col-span-1 md:col-span-2 mt-4">
                  <div className="rounded-xl border bg-slate-50/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-white rounded-lg shadow-sm border">
                          <Lock className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">비밀번호 관리</h3>
                          <p className="text-xs text-slate-500">계정의 보안 설정을 관리합니다.</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={isChangingPassword ? "ghost" : "outline"}
                        size="sm"
                        onClick={() => {
                          const next = !isChangingPassword;
                          setIsChangingPassword(next);
                          if (!next) {
                            form.setValue("password", "");
                            form.setValue("password_confirm", "");
                          }
                        }}
                        className={isChangingPassword ? "text-slate-500" : "bg-white border-slate-200 text-slate-700 font-bold"}
                      >
                        {isChangingPassword ? "취소" : "비밀번호 변경하기"}
                      </Button>
                    </div>

                    {isChangingPassword && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold text-slate-700">새 비밀번호</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="password"
                                    placeholder="8자 이상 입력"
                                    className="bg-white"
                                    {...field}
                                  />
                                  <Key className="absolute right-3 top-2.5 w-4 h-4 text-slate-300" />
                                </div>
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
                              <FormLabel className="text-xs font-bold text-slate-700">비밀번호 확인</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="비밀번호 다시 입력"
                                  className="bg-white"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* 관리자 전용 퀵 리셋 버튼 */}
                        {profile?.role === "admin" && (
                          <div className="col-span-1 md:col-span-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                form.setValue("password", "00000000", { shouldValidate: true });
                                form.setValue("password_confirm", "00000000", { shouldValidate: true });
                                toast({
                                  title: "비밀번호 자동 입력",
                                  description: "비밀번호가 '00000000'으로 입력되었습니다. 저장 버튼을 눌러 확정하세요.",
                                });
                              }}
                              className="w-full border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 h-9"
                            >
                              <RefreshCcw className="w-3 h-3 mr-2" />
                              기본 비밀번호로 초기화 (00000000)
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
                {/* staff 직급일 때만 팀 선택 표시 (선택사항) */}
              {form.watch("positionRank") !== "TEAM_LEADER" && (
                  <>
                    <FormField
                      control={form.control}
                      name="team"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>팀 (선택사항)</FormLabel>
                          <FormControl>
                            <select
                              value={field.value?.teamId || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange(undefined);
                                } else {
                                  field.onChange({
                                    teamId: value,
                                    isPrimary: true,
                                  });
                                }
                              }}
                              disabled={teamsLoading}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">
                                {teamsLoading
                                  ? "팀 목록 로딩 중..."
                                  : "팀을 선택하세요 (선택사항)"}
                              </option>
                              {teams.map((team) => (
                                <option
                                  key={team.id}
                                  value={team.id.toString()}
                                >
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            팀장 직급은 팀 배정이 불가능합니다.
                          </p>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              {/* 추가 정보 (파일 업로드) */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  추가 정보 (선택사항 - 이미지/문서 업로드)
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <UploadRow
                    label="증명사진"
                    value={photoUrl}
                    error={uploadErrors.photo_url}
                    loading={uploading === "photo_url" || rotatingField === "photo_url"}
                    onChange={handleFileChange("photo_url")}
                    onClear={() => clearFile("photo_url")}
                    onRotate={() => handleRotate("photo_url", 0)}
                    isImage
                  />
                  
                  <MultipleUploadRow
                    label="신분증 사진"
                    values={idPhotoUrls}
                    error={uploadErrors.id_photo_urls}
                    loading={uploading === "id_photo_urls"}
                    onChange={handleFileChange("id_photo_urls")}
                    onRemove={(idx) => removeFileAt("id_photo_urls", idx)}
                    onRotate={(idx) => handleRotate("id_photo_urls", idx)}
                    rotatingIndex={rotatingField === "id_photo_urls" ? rotatingIndex : null}
                  />

                  <MultipleUploadRow
                    label="등본"
                    values={regUrls}
                    error={uploadErrors.resident_register_urls}
                    loading={uploading === "resident_register_urls"}
                    onChange={handleFileChange("resident_register_urls")}
                    onRemove={(idx) => removeFileAt("resident_register_urls", idx)}
                    onRotate={(idx) => handleRotate("resident_register_urls", idx)}
                    rotatingIndex={rotatingField === "resident_register_urls" ? rotatingIndex : null}
                  />

                  <MultipleUploadRow
                    label="초본"
                    values={extUrls}
                    error={uploadErrors.resident_extract_urls}
                    loading={uploading === "resident_extract_urls"}
                    onChange={handleFileChange("resident_extract_urls")}
                    onRemove={(idx) => removeFileAt("resident_extract_urls", idx)}
                    onRotate={(idx) => handleRotate("resident_extract_urls", idx)}
                    rotatingIndex={rotatingField === "resident_extract_urls" ? rotatingIndex : null}
                  />

                  <MultipleUploadRow
                    label="가족관계증명서"
                    values={famUrls}
                    error={uploadErrors.family_relation_urls}
                    loading={uploading === "family_relation_urls"}
                    onChange={handleFileChange("family_relation_urls")}
                    onRemove={(idx) => removeFileAt("family_relation_urls", idx)}
                    onRotate={(idx) => handleRotate("family_relation_urls", idx)}
                    rotatingIndex={rotatingField === "family_relation_urls" ? rotatingIndex : null}
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
            onClick={form.handleSubmit(handleSubmit, (errors) => {
              console.error("Validation Errors:", errors);
              
              // 첫 번째 에러 필드로 스크롤
              const firstErrorField = Object.keys(errors)[0];
              if (firstErrorField) {
                const element = document.querySelector(`[name="${firstErrorField}"]`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }

              toast({
                title: "입력 오류",
                description: "필수 입력 항목이 누락되었거나 형식이 올바르지 않습니다. 빨간색으로 표시된 항목을 확인해주세요.",
                variant: "destructive",
              });
            })}
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
  onRotate,
  loading,
  error,
  isImage,
}: {
  label: string;
  value?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onClear: () => void;
  onRotate?: () => void;
  loading?: boolean;
  error?: string;
  isImage?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setImageError(null);
  }, [value]);

  const showPreview = !!value && !imageError;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      inputRef.current.files = dt.files;
      inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>

      {/* 숨겨진 input */}
      <input
        ref={inputRef}
        type="file"
        accept="*/*"
        onChange={onChange}
        disabled={loading}
        className="hidden"
      />

      {/* 미리보기가 없을 때: 업로드 영역 */}
      {!showPreview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={loading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-all duration-200",
            isDragOver
              ? "border-blue-400 bg-blue-50/60"
              : "border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50",
            loading && "pointer-events-none opacity-50"
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Upload className="h-5 w-5 text-slate-400" />
            </div>
          )}
          <div className="text-center">
            <p className="text-xs font-medium text-slate-600">
              {loading ? "업로드 중…" : "클릭 또는 드래그하여 파일 선택"}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">이미지, PDF 등</p>
          </div>
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {imageError && <p className="text-xs text-destructive">{imageError}</p>}

      {/* 미리보기 카드 */}
      {showPreview && (
        <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-3 p-3">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt={`${label} 미리보기`}
                className="h-16 w-16 flex-shrink-0 rounded-lg border object-cover"
                onError={() =>
                  setImageError(
                    "이미지 다운로드 실패: 접근 권한이 없거나 URL이 올바르지 않습니다."
                  )
                }
              />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border bg-slate-50">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-slate-700">
                {fileNameFromUrl(value)}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {/* 교체 */}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  교체
                </button>
                {/* 회전 */}
                {isImage && onRotate && (
                  <button
                    type="button"
                    onClick={onRotate}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/60 px-2 py-1 text-[11px] font-medium text-blue-600 shadow-sm transition-colors hover:bg-blue-100 disabled:opacity-50"
                  >
                    <RefreshCcw className="h-3 w-3" />
                    회전
                  </button>
                )}
                {/* 원본 */}
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                >
                  원본
                </a>
              </div>
            </div>

            {/* 삭제 */}
            <button
              type="button"
              onClick={onClear}
              disabled={loading}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              title="삭제"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
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
  onRotate,
  rotatingIndex,
  maxCount = 5,
}: {
  label: string;
  values?: string[];
  error?: string;
  loading?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onRemove: (index: number) => void;
  onRotate?: (index: number) => void;
  rotatingIndex?: number | null;
  maxCount?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const isFull = values.length >= maxCount;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isFull) setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isFull || !e.dataTransfer.files?.length || !inputRef.current) return;
    const dt = new DataTransfer();
    Array.from(e.dataTransfer.files).forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
    inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        <div className={cn(
          "text-xs font-medium tabular-nums",
          isFull ? "text-amber-500" : "text-muted-foreground"
        )}>
          {values.length} / {maxCount}
        </div>
      </div>

      {/* 숨겨진 input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={onChange}
        disabled={loading || isFull}
        multiple
        className="hidden"
      />

      {/* 업로드 영역 */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={loading || isFull}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 transition-all duration-200",
          isFull
            ? "cursor-not-allowed border-slate-100 bg-slate-50/30 opacity-60"
            : isDragOver
            ? "border-blue-400 bg-blue-50/60"
            : "border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50",
          loading && "pointer-events-none opacity-50"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <Plus className="h-4 w-4 text-slate-400" />
        )}
        <span className="text-xs font-medium text-slate-500">
          {loading
            ? "업로드 중…"
            : isFull
            ? "최대 장수에 도달했습니다"
            : "클릭 또는 드래그하여 파일 추가"}
        </span>
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* 썸네일 그리드 */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {values.map((v, idx) => (
            <div key={idx} className="group relative aspect-square">
              <div className="h-full w-full overflow-hidden rounded-lg border bg-muted/20 shadow-sm">
                {isImageUrl(v) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v}
                    alt={`${label}-${idx}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <FileText className="h-5 w-5" />
                    <span className="text-[9px]">파일</span>
                  </div>
                )}
              </div>

              {/* 삭제 */}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow transition-transform hover:scale-110 hover:bg-red-600 group-hover:flex"
              >
                <X className="h-3 w-3" />
              </button>

              {/* 회전 */}
              {isImageUrl(v) && onRotate && (
                <button
                  type="button"
                  onClick={() => onRotate(idx)}
                  disabled={loading || rotatingIndex === idx}
                  className="absolute -left-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow transition-transform hover:scale-110 hover:bg-blue-600 group-hover:flex disabled:opacity-50"
                  title="시계방향 90도 회전"
                >
                  {rotatingIndex === idx ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-3 w-3" />
                  )}
                </button>
              )}

              {/* 원본 보기 오버레이 */}
              <a
                href={v}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-x-0 bottom-0 flex h-5 items-center justify-center rounded-b-lg bg-black/50 text-[9px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
              >
                원본 보기
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

