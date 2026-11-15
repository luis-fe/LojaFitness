/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gera um servidor enxuto em .next/standalone (usado pelo Dockerfile)
  output: 'standalone',
}

export default nextConfig
