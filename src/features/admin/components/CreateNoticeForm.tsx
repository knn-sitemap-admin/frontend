"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
import { Textarea } from "@/components/atoms/Textarea/Textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/atoms/Dialog/Dialog";
import { FormError } from "@/components/atoms/FormError/FormError";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createNotice } from "../api/notices";

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

interface CreateNoticeFormProps {
  onNoticeCreated?: () => void;
}

export function CreateNoticeForm({ onNoticeCreated }: CreateNoticeFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateNoticeFormData>({
    resolver: zodResolver(createNoticeSchema),
  });

  const onSubmit = async (data: CreateNoticeFormData) => {
    setIsLoading(true);
    try {
      const created = await createNotice(data);

      toast({
        title: "공지사항 생성 완료",
        description: `"${created.title}" 공지사항이 성공적으로 생성되었습니다.`,
      });

      reset();
      setOpen(false);
      onNoticeCreated?.();
    } catch (error: any) {
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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />새 공지사항
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 공지사항 작성</DialogTitle>
          <DialogDescription className="sr-only">
            모든 직원에게 표시될 새 공지사항 내용을 작성하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              rows={8}
              {...register("content")}
              disabled={isLoading}
            />
            <FormError message={errors.content?.message} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "생성 중..." : "공지사항 생성"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
