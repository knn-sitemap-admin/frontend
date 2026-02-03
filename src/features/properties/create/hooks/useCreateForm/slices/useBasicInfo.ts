"use client";

import { BuildingGrade } from "@/features/properties/types/building-grade";
import { todayYmdKST } from "@/shared/date/todayYmdKST";
import { useEffect, useMemo, useState } from "react";

export function useBasicInfo({ initialAddress }: { initialAddress?: string }) {
  const [address, setAddress] = useState("");
  useEffect(() => {
    setAddress(initialAddress ?? "");
  }, [initialAddress]);

  const [officePhone, setOfficePhone] = useState("");
  const [officePhone2, setOfficePhone2] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [floor, setFloor] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [structure, setStructure] = useState("3룸");

  /** ✅ 건물유형(백엔드 enum: "APT" | "OP" | "주택" | "근생") */
  const [buildingType, setBuildingType] = useState<string | null>(null);
  /** ✅ 건물유형 다중 선택 — buildingTypes: ["APT", "OP"] */
  const [buildingTypes, setBuildingTypes] = useState<string[]>([]);

  /** ✅ 준공일 기본값: 오늘(KST, YYYY-MM-DD) — 비워두는 정책이 아니라면 유지 */
  const [completionDate, setCompletionDate] = useState<string>(todayYmdKST());

  /** ✅ 신축/구옥: 기본값 제거 → 처음엔 미선택(null) */
  const [buildingGrade, setBuildingGrade] = useState<BuildingGrade | null>(
    null
  );

  // 호환 플래그 (기존 isNew/isOld 사용코드 대응)
  const isNew = buildingGrade === "new";
  const isOld = buildingGrade === "old";

  const state = useMemo(
    () => ({
      address,
      officePhone,
      officePhone2,
      officeName,
      moveIn,
      floor,
      roomNo,
      structure,
      buildingType,
      buildingTypes,
      completionDate,

      // ⬇️ 추가
      buildingGrade,
      isNew,
      isOld,
    }),
    [
      address,
      officePhone,
      officePhone2,
      officeName,
      moveIn,
      floor,
      roomNo,
      structure,
      buildingType,
      buildingTypes,
      completionDate,
      buildingGrade,
      isNew,
      isOld,
    ]
  );

  const actions = useMemo(
    () => ({
      setAddress,
      setOfficePhone,
      setOfficePhone2,
      setOfficeName,
      setMoveIn,
      setFloor,
      setRoomNo,
      setStructure,
      setBuildingType,
      setBuildingTypes,
      setCompletionDate,
      setBuildingGrade,
    }),
    [
      setAddress,
      setOfficePhone,
      setOfficePhone2,
      setOfficeName,
      setMoveIn,
      setFloor,
      setRoomNo,
      setStructure,
      setBuildingType,
      setBuildingTypes,
      setCompletionDate,
      setBuildingGrade,
    ]
  );

  return useMemo(() => ({ state, actions }), [state, actions]);
}
