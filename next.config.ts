import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable static export for Vercel
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Trailing slash for clean URLs
  trailingSlash: true,
}

export default nextConfig

