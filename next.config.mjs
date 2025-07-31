/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignore build errors in production
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors in production
    ignoreDuringBuilds: true,
  },
  // Optimize for production
  swcMinify: true,
  // Configure headers for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

export default nextConfig;