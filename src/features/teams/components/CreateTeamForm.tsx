"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
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
import { useCreateTeam } from "../hooks/useTeams";

const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, "팀 이름은 최소 2글자 이상이어야 합니다")
    .max(100, "팀 이름은 최대 100글자까지 가능합니다"),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

interface CreateTeamFormProps {
  onTeamCreated?: () => void;
}

export function CreateTeamForm({ onTeamCreated }: CreateTeamFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createTeamMutation = useCreateTeam();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
  });

  const onSubmit = async (data: CreateTeamFormData) => {
    try {
      await createTeamMutation.mutateAsync({
        name: data.name,
        code: data.name.replace(/\s+/g, "").toLowerCase(),
        isActive: true,
      });

      toast({
        title: "팀 생성 완료",
        description: `"${data.name}" 팀이 성공적으로 생성되었습니다.`,
      });

      reset();
      setOpen(false);
      onTeamCreated?.();
    } catch (error: any) {
      console.error("팀 생성 실패:", error);
      toast({
        title: "팀 생성 실패",
        description: "팀 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
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
          <Plus className="h-4 w-4" />새 팀 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 팀 생성</DialogTitle>
          <DialogDescription className="sr-only">
            새로운 팀을 생성하기 위한 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">팀 이름</Label>
            <Input
              id="name"
              placeholder="예: 개발팀, 마케팅팀"
              {...register("name")}
              disabled={createTeamMutation.isPending}
            />
            <FormError message={errors.name?.message} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createTeamMutation.isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={createTeamMutation.isPending}>
              {createTeamMutation.isPending ? "생성 중..." : "팀 생성"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
