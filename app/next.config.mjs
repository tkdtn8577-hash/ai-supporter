/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@xenova/transformers', 'pdf-parse', 'mammoth', 'xlsx'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'sharp$': false,
      'onnxruntime-node$': false,
    }
    return config
  },
}

export default nextConfig
