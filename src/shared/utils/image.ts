/**
 * 이미지를 WebP 형식으로 변환 및 압축합니다.
 * @param file 원본 이미지 파일
 * @param quality 압축 품질 (0~1)
 * @returns WebP로 변환된 File 객체
 */
export async function convertToWebP(file: File, quality = 0.8): Promise<File> {
  // 이미지 파일이 아니면 그대로 반환 (PDF 등)
  if (!file.type.startsWith("image/")) return file;
  // 이미 WebP라면 그대로 반환
  if (file.type === "image/webp") return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // 캔버스 실패 시 원본 반환
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // 변환 실패 시 원본 반환
              return;
            }
            
            // 새 파일명 생성 (.webp 확장자 강제)
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const newFile = new File([blob], newFileName, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            
            resolve(newFile);
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => resolve(file); // 이미지 로드 실패 시 원본 반환
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file); // 리더 실패 시 원본 반환
    reader.readAsDataURL(file);
  });
}
