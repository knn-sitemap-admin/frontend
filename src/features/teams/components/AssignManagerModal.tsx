"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/atoms/Dialog/Dialog";
import { Button } from "@/components/atoms/Button/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select";
import { Label } from "@/components/atoms/Label/Label";
import { TeamMemberDetail } from "../api/teams";
import { useToast } from "@/hooks/use-toast";
import { useReplaceTeamManager } from "../hooks/useTeams";

interface AssignManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  members: TeamMemberDetail[];
  currentManagerId?: string;
  onSuccess?: () => void;
}

export function AssignManagerModal({
  open,
  onOpenChange,
  teamId,
  members,
  currentManagerId,
  onSuccess,
}: AssignManagerModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const { toast } = useToast();
  const replaceManagerMutation = useReplaceTeamManager();

  // 모달이 열릴 때마다 선택 초기화
  useEffect(() => {
    if (open) {
      setSelectedAccountId("");
    }
  }, [open]);

  const handleReplace = async () => {
    if (!selectedAccountId || selectedAccountId === "") {
      toast({
        title: "팀장 선택 필요",
        description: "팀장을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // members 목록에서 선택된 계정의 credentialId를 직접 가져옴
      const member = members.find((m) => m.accountId === selectedAccountId);
      const credentialId = member?.credentialId;

      if (!credentialId) {
        toast({
          title: "오류",
          description: "선택된 팀원의 계정 정보를 찾을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }

      await replaceManagerMutation.mutateAsync(
        { teamId, data: { newCredentialId: credentialId } },
        {
          onSuccess: () => {
            toast({
              title: "팀장 지정 완료",
              description: `팀장으로 ${
                members.find((m) => m.accountId === selectedAccountId)?.name ||
                "알 수 없는 사용자"
              }이(가) 지정되었습니다.`,
            });
            onOpenChange(false);
            onSuccess?.();
          },
          onError: (error: any) => {
            console.error("팀장 교체 실패:", error);
            toast({
              title: "팀장 교체 실패",
              description:
                error?.response?.data?.message ||
                "팀장 교체 중 오류가 발생했습니다.",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error: any) {
      console.error("credentialId 조회 실패:", error);
      toast({
        title: "오류",
        description: "팀원 계정 정보를 가져오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 현재 팀장을 제외한 멤버 목록
  const eligibleManagers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.accountId !== currentManagerId && member.name !== null
      ),
    [members, currentManagerId]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>팀장 지정/교체</DialogTitle>
          <DialogDescription>
            팀원 중에서 새로운 팀장을 선택하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="newManager" className="text-right">
              팀장
            </Label>
            <Select
              onValueChange={setSelectedAccountId}
              value={selectedAccountId === "" ? undefined : selectedAccountId}
              disabled={replaceManagerMutation.isPending}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="팀장을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="!z-[2200]">
                {eligibleManagers.length === 0 ? (
                  <SelectItem value="no-members" disabled>
                    지정 가능한 팀원이 없습니다.
                  </SelectItem>
                ) : (
                  eligibleManagers.map((member) => (
                    <SelectItem key={member.accountId} value={member.accountId}>
                      {member.name} ({member.teamRole === "manager" ? "현재 팀장" : "팀원"})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={replaceManagerMutation.isPending}
          >
            취소
          </Button>
          <Button
            onClick={handleReplace}
            disabled={replaceManagerMutation.isPending || !selectedAccountId || selectedAccountId === ""}
          >
            {replaceManagerMutation.isPending ? "지정 중..." : "팀장 지정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
