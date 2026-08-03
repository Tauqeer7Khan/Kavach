/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization for external avatars
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
  },
  
  // Suppress optional BullMQ warnings (Redis alternative not needed)
  webpack: (config) => {
    config.externals = config.externals || []
    config.externals.push({
      '@valkey/valkey-glide': 'commonjs @valkey/valkey-glide',
    })
    return config
  },
  
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
}

export default nextConfig
