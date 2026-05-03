/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip type/lint checks during dev for faster reloads
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Proxy API calls to FastAPI backend — avoids CORS issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
