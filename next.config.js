/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['ssh2', 'node-ssh', 'ssh2-promise'],
    },
    output: 'standalone',
}

module.exports = nextConfig
