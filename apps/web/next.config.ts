import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:8000'}/api/v1/:path*`,
      },
      {
        source: '/health',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:8000'}/health`,
      },
    ]
  },
}

export default nextConfig
