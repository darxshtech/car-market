/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'static-cdn.cars24.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.cardekho.com',
      },
      {
        protocol: 'https',
        hostname: '**.carwale.com',
      },
      {
        protocol: 'https',
        hostname: '**.cars24.com',
      },
      {
        protocol: 'https',
        hostname: '**.gaadi.com',
      },
    ],
  },
}

module.exports = nextConfig
