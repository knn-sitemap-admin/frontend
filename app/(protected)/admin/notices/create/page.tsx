"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
import { Textarea } from "@/components/atoms/Textarea/Textarea";
import { FormError } from "@/components/atoms/FormError/FormError";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  createNotice,
  CreateNoticeRequest,
} from "@/features/admin/api/notices";
import { AdminAuthGuard } from "@/components/auth-guard/AdminAuthGuard";

const createNoticeSchema = z.object({
  title: z
    .string()
    .min(1, "제목은 최소 1글자 이상이어야 합니다")
    .max(200, "제목은 최대 200글자까지 가능합니다"),
  content: z
    .string()
    .min(1, "내용은 최소 1글자 이상이어야 합니다")
    .max(5000, "내용은 최대 5000글자까지 가능합니다"),
});

type CreateNoticeFormData = z.infer<typeof createNoticeSchema>;

export default function CreateNoticePage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateNoticeFormData>({
    resolver: zodResolver(createNoticeSchema),
  });

  const onSubmit = async (data: CreateNoticeFormData) => {
    setIsLoading(true);
    try {
      const requestData: CreateNoticeRequest = {
        title: data.title,
        content: data.content,
      };

      await createNotice(requestData);

      toast({
        title: "공지사항 생성 완료",
        description: `"${data.title}" 공지사항이 성공적으로 생성되었습니다.`,
      });

      router.push("/admin/notices");
    } catch (error) {
      console.error("공지사항 생성 실패:", error);
      toast({
        title: "공지사항 생성 실패",
        description: "공지사항 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminAuthGuard>
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Link href="/admin/notices">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              목록으로
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">새 공지사항 작성</h1>
          <p className="text-sm text-muted-foreground">
            새로운 공지사항을 작성하고 관리자에게 공유하세요.
          </p>
        </div>

        {/* 작성 폼 */}
        <div className="bg-white rounded-lg border p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="공지사항 제목을 입력하세요"
                {...register("title")}
                disabled={isLoading}
              />
              <FormError message={errors.title?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                placeholder="공지사항 내용을 입력하세요"
                rows={12}
                {...register("content")}
                disabled={isLoading}
              />
              <FormError message={errors.content?.message} />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Link href="/admin/notices">
                <Button type="button" variant="outline" disabled={isLoading}>
                  취소
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? "생성 중..." : "공지사항 생성"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
