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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/Select/Select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/atoms/Form/Form";
import { Plus, ChevronDownIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { formatPhone } from "@/lib/formatPhone";
import { useRouter } from "next/navigation";
import { getTeams } from "@/features/teams";
import {
  createEmployee,
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

/** ========== 타입 ========== */
export type CreateAccountPayload = {
  // 기본
  email: string;
  password: string;
  name: string;
  positionRank:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR";
  phone: string;
  birthday: string; // YYYY-MM-DD (빈값 허용 시 "")
  emergency_contact: string;
  address: string;
  salary_bank_name: string; // 은행명
  salary_account: string; // 계좌번호

  // 팀 정보 (선택 - 팀장이면 불필요)
  team?: {
    teamId: string;
    isPrimary?: boolean;
    joinedAt?: string; // YYYY-MM-DD
  };
  // 팀 이름 (팀장 직급일 때만 사용)
  teamName?: string;

  // 추가정보(선택)
  photo_url?: string;
  id_photo_url?: string;
  resident_register_url?: string; // 등본
  resident_extract_url?: string; // 초본
  family_relation_url?: string; // 가족관계증명서
};

const phoneRegex = /^[0-9\-+() ]{9,20}$/;

const birthdaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "형식은 YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "유효한 날짜를 입력하세요.");

/** ========== 검증 스키마 ========== */
const CreateUserSchema = z
  .object({
    email: z.string().email("이메일 형식이 올바르지 않습니다."),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    password_confirm: z
      .string()
      .min(8, "비밀번호 확인도 8자 이상이어야 합니다."),
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
    teamName: z.string().optional(),
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
  .refine((data) => data.password === data.password_confirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["password_confirm"], // 에러를 확인 필드에 표시
  })
  .refine(
    (data) => {
      // manager/TEAM_LEADER는 팀 배정 불가
      const isManagerOrTeamLeader =
        data.positionRank === "TEAM_LEADER" || data.positionRank === "DIRECTOR";
      if (isManagerOrTeamLeader && data.team) {
        return false; // manager/TEAM_LEADER는 팀 배정 불가
      }
      return true;
    },
    {
      message: "팀장/실장 직급은 팀 배정이 불가능합니다.",
      path: ["team"],
    }
  )
  .refine(
    (data) => {
      // 팀장 직급이면 팀 이름 필수
      if (data.positionRank === "TEAM_LEADER") {
        return !!data.teamName?.trim();
      }
      return true;
    },
    {
      message: "팀 이름을 입력하세요.",
      path: ["teamName"],
    }
  );
type CreateUserValues = z.infer<typeof CreateUserSchema>;

type UploadField =
  | "photo_url"
  | "id_photo_url"
  | "resident_register_url"
  | "resident_extract_url"
  | "family_relation_url";

export default function AccountCreatePage({
  onCreate,
  maxUploadBytes = 5 * 1024 * 1024,
}: {
  onCreate: (payload: CreateAccountPayload) => void | Promise<void>;
  maxUploadBytes?: number;
}) {
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      email: "",
      password: "",
      password_confirm: "",
      name: "",
      positionRank: "ASSISTANT_MANAGER",
      phone: "",
      birthday: "",
      emergency_contact: "",
      address: "",
      salary_bank_name: "",
      salary_account: "",
      team: undefined,
      teamName: "",
      photo_url: "",
      id_photo_url: "",
      resident_register_url: "",
      resident_extract_url: "",
      family_relation_url: "",
    },
    mode: "onChange",
  });

  /** 업로드 상태 & 에러를 필드별로 관리 */
  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [uploadErrors, setUploadErrors] = useState<
    Partial<Record<UploadField, string>>
  >({});
  const [isBirthdayOpen, setIsBirthdayOpen] = useState(false);

  /** 팀 목록 관리 */
  const [teams, setTeams] = useState<
    Array<{ id: number | string; name: string; teamLeaderName: string | null }>
  >([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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

  const setFieldError = (field: UploadField, msg: string | null) =>
    setUploadErrors((prev) => ({ ...prev, [field]: msg || undefined }));

  /** 제출 */
  const handleSubmit = async (v: CreateUserValues) => {
    console.log("handleSubmit 호출됨", { v, uploading, isSubmitting });
    
    if (uploading || isSubmitting) {
      console.log("제출 차단: uploading 또는 isSubmitting이 true");
      return;
    }

    setIsSubmitting(true);
    console.log("계정 생성 시작");

    try {
      const isTeamLeaderRank = v.positionRank === "TEAM_LEADER";

      // 팀장/실장은 팀 배정 불가
      const isManagerRank =
        v.positionRank === "TEAM_LEADER" || v.positionRank === "DIRECTOR";
      if (isManagerRank && v.team?.teamId) {
        toast({
          title: "입력 오류",
          description: "팀장/실장 직급은 팀 배정이 불가능합니다.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // 팀장 직급일 때는 팀 이름이 필수
      if (isTeamLeaderRank && !v.teamName?.trim()) {
        toast({
          title: "입력 오류",
          description: "팀 이름을 입력하세요.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // 새로운 통합 API 호출 (계정 + 직원 정보 한 번에)
      const createData = {
        email: v.email,
        password: v.password,
        isDisabled: false,
        // 팀장이 아닌 경우에만 team 포함
        ...(isTeamLeaderRank
          ? {}
          : v.team?.teamId
          ? {
              team: {
                teamId: v.team.teamId,
                isPrimary: v.team.isPrimary ?? true,
                ...(v.team.joinedAt && v.team.joinedAt !== ""
                  ? { joinedAt: v.team.joinedAt }
                  : {}),
              },
            }
          : {}),
        // 팀장인 경우 teamName 포함
        ...(isTeamLeaderRank && v.teamName?.trim()
          ? { teamName: v.teamName.trim() }
          : {}),
        // 직원 정보
        info: {
          name: v.name || null,
          phone: v.phone || null,
          emergencyContact: v.emergency_contact || null,
          addressLine: v.address || null,
          salaryBankName: v.salary_bank_name || null,
          salaryAccount: v.salary_account || null,
          profileUrl: v.photo_url || null,
          positionRank: v.positionRank,
          docUrlResidentRegistration: v.resident_register_url || null,
          docUrlResidentAbstract: v.resident_extract_url || null,
          docUrlIdCard: v.id_photo_url || null,
          docUrlFamilyRelation: v.family_relation_url || null,
        },
      };

      console.log("사원 계정 생성 API 호출", createData);
      const result = await createEmployee(createData);
      console.log("사원 계정 생성 완료", result);

      await onCreate({
        email: v.email,
        password: v.password,
        name: v.name,
        positionRank: v.positionRank,
        phone: v.phone,
        birthday: v.birthday ?? "",
        emergency_contact: v.emergency_contact,
        address: v.address,
        salary_bank_name: v.salary_bank_name,
        salary_account: v.salary_account,
        team: v.team
          ? {
              teamId: v.team.teamId,
              isPrimary: v.team.isPrimary ?? true,
              joinedAt:
                v.team.joinedAt && v.team.joinedAt !== ""
                  ? v.team.joinedAt
                  : undefined,
            }
          : undefined,
        teamName: v.teamName || undefined,
        photo_url: v.photo_url || undefined,
        id_photo_url: v.id_photo_url || undefined,
        resident_register_url: v.resident_register_url || undefined,
        resident_extract_url: v.resident_extract_url || undefined,
        family_relation_url: v.family_relation_url || undefined,
      });

      // 성공 토스트
      toast({
        title: "계정 생성 완료",
        description: `${v.name}님의 계정이 성공적으로 생성되었습니다.`,
      });

      // 관리자 페이지로 이동
      router.push("/admin");
    } catch (error: any) {
      console.error("계정 생성 실패:", error);

      // 에러 메시지 추출
      const errorMessages = error?.response?.data?.messages || [];
      const errorMessage =
        errorMessages.length > 0
          ? errorMessages.join(", ")
          : "계정 생성 중 오류가 발생했습니다.";

      // 에러 토스트
      toast({
        title: "계정 생성 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 업로드 도메인 매핑 */
  const uploadDomainMap: Record<UploadField, UploadDomain> = {
    photo_url: "profile",
    id_photo_url: "profile",
    resident_register_url: "etc",
    resident_extract_url: "etc",
    family_relation_url: "etc",
  };

  /** 공용 업로드 핸들러: 성공 시 해당 필드에 url 세팅 */
  const handleFileChange =
    (field: UploadField): React.ChangeEventHandler<HTMLInputElement> =>
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFieldError(field, null);

      if (file.size > maxUploadBytes) {
        setFieldError(
          field,
          `파일이 너무 큽니다. 최대 ${(maxUploadBytes / (1024 * 1024)).toFixed(
            1
          )}MB 까지 가능합니다.`
        );
        // 파일 입력이 여전히 존재하는지 확인
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
        // 파일 입력이 여전히 존재하는지 확인
        if (e.currentTarget) {
          e.currentTarget.value = "";
        }
      }
    };

  const clearFile = (field: UploadField) => {
    form.setValue(field, "", { shouldValidate: true });
    setFieldError(field, null);
  };

  /** 프리뷰 유틸 */
  const isImageUrl = (url?: string) =>
    !!url && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url.split("?")[0] || "");

  /** watch 값 */
  const photoUrl = form.watch("photo_url");
  const idPhotoUrl = form.watch("id_photo_url");
  const regUrl = form.watch("resident_register_url");
  const extUrl = form.watch("resident_extract_url");
  const famUrl = form.watch("family_relation_url");

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> 새 계정 생성
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, (errors) => {
              console.log("Validation 에러:", errors);
              // 첫 번째 에러 필드로 스크롤
              const firstErrorField = Object.keys(errors)[0];
              if (firstErrorField) {
                const element = document.querySelector(
                  `[name="${firstErrorField}"]`
                );
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }
            })}
            className="grid grid-cols-1 gap-6"
          >
            {/* ===== 기본 정보 ===== */}

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
              {/* 이메일 */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일 *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...field}
                      />
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
                              date > new Date() || date < new Date("1900-01-01")
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
              {/* 비밀번호 */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호 *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
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
                    <FormLabel>비밀번호 확인 *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
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
              />{" "}
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
                      <Input placeholder="계좌번호를 입력해주세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* staff 직급일 때만 팀 선택 표시 (선택사항) */}
              {form.watch("positionRank") !== "TEAM_LEADER" &&
                form.watch("positionRank") !== "DIRECTOR" && (
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
                                  // 빈 문자열이면 team을 undefined로 설정
                                  field.onChange(undefined);
                                } else {
                                  // 값이 있으면 team 객체 설정
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
                                <option key={team.id} value={team.id.toString()}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            팀장/실장 직급은 팀 배정이 불가능합니다.
                          </p>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              {/* 팀장 직급일 때 팀 이름 입력 필드 표시 */}
              {form.watch("positionRank") === "TEAM_LEADER" && (
                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>팀 이름 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="팀 이름을 입력하세요"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        팀장 직급으로 설정하면 자동으로 팀이 생성됩니다.
                      </p>
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* ===== 추가 정보 (파일 업로드) ===== */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">
                추가 정보 (선택사항 - 이미지/문서 업로드)
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 증명사진 */}
                <UploadRow
                  label="증명사진"
                  value={photoUrl}
                  error={uploadErrors.photo_url}
                  loading={uploading === "photo_url"}
                  onChange={handleFileChange("photo_url")}
                  onClear={() => clearFile("photo_url")}
                  isImage
                />

                {/* 신분증 사진 */}
                <UploadRow
                  label="신분증 사진"
                  value={idPhotoUrl}
                  error={uploadErrors.id_photo_url}
                  loading={uploading === "id_photo_url"}
                  onChange={handleFileChange("id_photo_url")}
                  onClear={() => clearFile("id_photo_url")}
                  isImage
                />

                {/* 등본 */}
                <UploadRow
                  label="등본"
                  value={regUrl}
                  error={uploadErrors.resident_register_url}
                  loading={uploading === "resident_register_url"}
                  onChange={handleFileChange("resident_register_url")}
                  onClear={() => clearFile("resident_register_url")}
                  isImage={isImageUrl(regUrl)}
                />

                {/* 초본 */}
                <UploadRow
                  label="초본"
                  value={extUrl}
                  error={uploadErrors.resident_extract_url}
                  loading={uploading === "resident_extract_url"}
                  onChange={handleFileChange("resident_extract_url")}
                  onClear={() => clearFile("resident_extract_url")}
                  isImage={isImageUrl(extUrl)}
                />

                {/* 가족관계증명서 */}
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

            {/* 액션 */}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    email: "",
                    password: "",
                    name: "",
                    positionRank: "ASSISTANT_MANAGER",
                    phone: "",
                    birthday: "",
                    emergency_contact: "",
                    address: "",
                    salary_bank_name: "",
                    salary_account: "",
                    team: {
                      teamId: "",
                      isPrimary: true,
                      joinedAt: "",
                    },
                    photo_url: "",
                    id_photo_url: "",
                    resident_register_url: "",
                    resident_extract_url: "",
                    family_relation_url: "",
                  });
                  setUploadErrors({});
                  setUploading(null);
                }}
              >
                초기화
              </Button>
              <Button type="submit" disabled={!!uploading || isSubmitting}>
                {isSubmitting
                  ? "계정 생성 중..."
                  : uploading
                  ? "업로드 대기…"
                  : "계정 생성"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/** 파일 업로드 공용 UI 블록 */
function UploadRow({
  label,
  value,
  error,
  loading,
  onChange,
  onClear,
  isImage,
}: {
  label: string;
  value?: string;
  error?: string;
  loading?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onClear: () => void;
  isImage?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*,.pdf"
          onChange={onChange}
          disabled={loading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          disabled={!value || loading}
        >
          제거
        </Button>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground">업로드 중입니다…</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {value && (
        <div className="flex items-center gap-3">
          {isImage ? (
            // 이미지 미리보기
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

/** 유틸 */
function fileNameFromUrl(u: string) {
  try {
    const url = new URL(u);
    return decodeURIComponent(url.pathname.split("/").pop() || "");
  } catch {
    return u.split("?")[0].split("#")[0].split("/").pop() || u;
  }
}
