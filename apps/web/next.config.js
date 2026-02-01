/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@satcom/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
