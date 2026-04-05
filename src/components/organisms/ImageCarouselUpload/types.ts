import { ImageItem } from "@/features/properties/types/media";

export interface ImageCarouselUploadProps {
  items: ImageItem[];
  onChangeCaption?: (index: number, text: string) => void;
  onRemoveImage?: (index: number) => void;

  useLocalCaptionFallback?: boolean;
  onOpenPicker?: () => void;

  /** ✅ 콜백 ref 제거, 객체 ref만 허용 */
  inputRef?: React.Ref<HTMLInputElement> | null;
  onChangeFiles?: (files: FileList | null) => void;
  maxCount?: number;
  layout?: "wide" | "tall";
  wideAspectClass?: string;
  tallHeightClass?: string;
  objectFit?: "cover" | "contain";
  /** ✅ 순서 변경 모달 열기 */
  onOpenReorder?: () => void;
}
