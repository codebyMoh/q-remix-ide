const path = require('path')

module.exports = {
  webpack: (config, { isServer }) => {
    // Add SVG loader configuration
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Add fallbacks for browser APIs in non-server environment
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false
      }
    }
    
    return config;
  },
};