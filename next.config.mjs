if (
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
) {
  throw new Error("Missing NEXT_PUBLIC_KAKAO_MAP_KEY at build time");
}

// ✅ .env.local 의 NEXT_PUBLIC_API_BASE 사용
const API_ORIGIN = process.env.NEXT_PUBLIC_IS_DEV === "true" ? "http://localhost:3050" : process.env.NEXT_PUBLIC_API_BASE;

// ✅ remotePatterns 구성 (placehold.co + 필요 시 API_ORIGIN)
const remotePatterns = [
  { protocol: "https", hostname: "placehold.co", pathname: "/**" },
];

try {
  const u = new URL(API_ORIGIN);
  if (u.hostname) {
    const proto = u.protocol.replace(":", ""); // 'http' | 'https'
    const hostPattern = {
      protocol: proto,
      hostname: u.hostname,
      pathname: "/**",
    };
    if (u.port) hostPattern.port = u.port; // 포트 있으면 추가
    remotePatterns.push(hostPattern);
  }
} catch {
  /* 무시 */
}

const nextConfig = {
  //   eslint: { ignoreDuringBuilds: true }, // ⛔️ Deprecated warning fix
  images: { remotePatterns }, // ⛔️ domains 대신 remotePatterns
  async rewrites() {
    return [
      // { source: "/api/:path*", destination: `${API_ORIGIN}/:path*` },
      { source: "/pins", destination: `${API_ORIGIN}/pins` },
      { source: "/pins/:path*", destination: `${API_ORIGIN}/pins/:path*` },
      { source: "/contracts", destination: `${API_ORIGIN}/contracts` },
      {
        source: "/contracts/:path*",
        destination: `${API_ORIGIN}/contracts/:path*`,
      },
    ];
  },
};

export default nextConfig; // ✅ ESM 방식
