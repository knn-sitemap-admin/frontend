import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    // 파일 크기 제한 (30MB)
    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `파일 크기가 너무 큽니다. 최대 ${
            maxSize / (1024 * 1024)
          }MB까지 가능합니다.`,
        },
        { status: 400 }
      );
    }

    // 허용된 파일 타입
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다." },
        { status: 400 }
      );
    }

    // 실제 환경에서는 여기서 파일을 클라우드 스토리지나 로컬 파일 시스템에 저장
    // 지금은 임시로 가짜 URL을 반환
    const fakeUrl = `https://example.com/uploads/${Date.now()}-${file.name}`;

    return NextResponse.json({
      url: fakeUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("파일 업로드 에러:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
