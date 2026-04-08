"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, X, Image as ImageIcon, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { Card, CardContent, CardHeader } from "@/components/atoms/Card/Card";
import { uploadOnePhoto } from "@/shared/api/photos/photoUpload";
import { useToast } from "@/hooks/use-toast";

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  uploading?: boolean;
}

interface ContractImageSectionProps {
  initialImages?: ImageItem[];
  onImagesChange?: (images: ImageItem[]) => void;
  readOnly?: boolean;
}

export function ContractImageSection({
  initialImages,
  onImagesChange,
  readOnly = false,
}: ContractImageSectionProps) {
  const [images, setImages] = useState<ImageItem[]>(initialImages ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // initialImages를 문자열로 변환하여 비교 (의존성 배열 최적화)
  const initialImagesKey = useMemo(() => {
    if (!initialImages) return "";
    return JSON.stringify(
      initialImages.map((img) => ({ id: img.id, preview: img.preview }))
    );
  }, [initialImages]);

  // 초기 이미지가 변경되면 업데이트
  useEffect(() => {
    console.log(
      "ContractImageSection initialImages 변경:",
      initialImages,
      "key:",
      initialImagesKey
    );
    // initialImages가 undefined가 아닐 때만 업데이트 (빈 배열도 허용)
    if (initialImages !== undefined) {
      setImages(initialImages);
    }
  }, [initialImagesKey, initialImages]);

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: ImageItem[] = [];

    // 먼저 임시 이미지 항목 생성 (업로드 중 표시용)
    Array.from(files).forEach((file) => {
      // 이미지 파일인지 확인
      if (!file.type.startsWith("image/")) {
        toast({
          title: "파일 형식 오류",
          description: "이미지 파일만 선택할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);

      newImages.push({
        id,
        file,
        preview,
        uploading: true,
      });
    });

    // 임시 이미지 추가 (업로드 중 표시)
    const tempImages = [...images, ...newImages];
    setImages(tempImages);
    onImagesChange?.(tempImages);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // 각 파일을 업로드하고 URL로 교체
    for (let i = 0; i < newImages.length; i++) {
      const item = newImages[i];
      try {
        const meta = await uploadOnePhoto(item.file, { domain: "contracts" });
        if (!meta?.url) {
          throw new Error("업로드 응답에 URL이 없습니다.");
        }

        // 업로드된 URL로 교체
        URL.revokeObjectURL(item.preview); // blob URL 정리
        const updatedItem = {
          ...item,
          preview: meta.url,
          uploading: false,
        };

        // 해당 항목 업데이트
        const updatedImages = tempImages.map((img) =>
          img.id === item.id ? updatedItem : img
        );
        setImages(updatedImages);
        onImagesChange?.(updatedImages);
      } catch (err: any) {
        console.error("이미지 업로드 실패:", err);
        toast({
          title: "이미지 업로드 실패",
          description: err?.message ?? "이미지 업로드 중 오류가 발생했습니다.",
          variant: "destructive",
        });

        // 실패한 항목 제거
        const updatedImages = tempImages.filter((img) => img.id !== item.id);
        setImages(updatedImages);
        onImagesChange?.(updatedImages);
        URL.revokeObjectURL(item.preview); // blob URL 정리
      }
    }
  };

  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const rotate = () => setRotation((r) => (r + 90) % 360);

  useEffect(() => {
    if (viewerImage) {
      setRotation(0);
    }
  }, [viewerImage]);

  const handleDeleteImage = (id: string) => {
    const imageToDelete = images.find((img) => img.id === id);
    if (imageToDelete) {
      // blob URL인 경우에만 revokeObjectURL 호출
      if (imageToDelete.preview.startsWith("blob:")) {
        URL.revokeObjectURL(imageToDelete.preview);
      }
    }

    const updatedImages = images.filter((img) => img.id !== id);
    setImages(updatedImages);
    onImagesChange?.(updatedImages);
  };

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-base text-gray-700 pb-4">
            계약 이미지
          </span>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddImage}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-2">
          {images.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">이미지를 추가해주세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group aspect-square bg-gray-100 rounded-md overflow-hidden cursor-pointer shadow-sm border border-gray-100 hover:border-blue-200 transition-colors"
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={() => !image.uploading && setViewerImage(image.preview)}
                >
                  {image.uploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : image.preview &&
                    (image.preview.startsWith("http://") ||
                      image.preview.startsWith("https://") ||
                      image.preview.startsWith("blob:")) ? (
                    <img
                      src={image.preview}
                      alt={image.file?.name || "contract image"}
                      className="w-full h-full object-cover select-none"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      onError={(e) => {
                        console.error(
                          "계약 이미지 로드 실패:",
                          image.preview,
                          "id:",
                          image.id
                        );
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xs text-center p-2">
                      {image.preview ? (
                        <div>
                          <p>이미지 접근 불가</p>
                        </div>
                      ) : (
                        <p>이미지 없음</p>
                      )}
                    </div>
                  )}
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.id);
                      }}
                      disabled={image.uploading}
                      className="absolute top-1 right-1 h-5 w-5 p-0 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-10"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {!image.uploading && image.file?.name && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {image.file.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* 이미지 뷰어 모달 */}
      {viewerImage && (
        <div 
          className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out p-4 md:p-10 select-none animate-in fade-in duration-200"
          onClick={() => setViewerImage(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div 
            className="relative max-w-full max-h-full flex items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewerImage}
              alt="계약서 원본"
              className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm animate-in zoom-in-95 duration-300 transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg)` }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
            <div className="absolute -top-12 sm:-top-4 sm:-right-12 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={rotate}
                title="이미지 회전"
              >
                <RotateCw className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={() => setViewerImage(null)}
                title="닫기"
              >
                <X className="h-8 w-8" />
              </Button>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium bg-black/40 px-3 py-1.5 rounded-full pointer-events-none">
            바깥 영역을 클릭하면 닫힙니다
          </div>
        </div>
      )}
    </Card>
  );
}
