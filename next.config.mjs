/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 is a native addon — its `bindings` package locates the
  // compiled .node file relative to its own module path, which breaks once
  // webpack bundles/wraps it for the server build. Excluding it (and its
  // Prisma adapter) from bundling keeps it a plain require() at runtime.
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3'],
  },
};

export default nextConfig;
