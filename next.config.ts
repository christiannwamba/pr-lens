import type { NextConfig } from "next";

const requiredEnvVars = ["ANTHROPIC_API_KEY", "GITHUB_TOKEN"] as const;

const missingEnvVars = requiredEnvVars.filter((name) => {
  const value = process.env[name];
  return typeof value !== "string" || value.trim() === "";
});

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}.`
  );
}

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
