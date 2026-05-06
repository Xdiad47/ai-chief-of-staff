/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Firebase Hosting
  output: 'export',

  // Skip type/lint checks during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
