import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded at runtime from node_modules on the server only.
  serverExternalPackages: ["@cedar-policy/cedar-wasm", "@hyperledger/fabric-gateway", "@grpc/grpc-js"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
