import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      // ✅ Enable Fast Refresh for better development experience
      fastRefresh: true,
    }),
  ],
  server: {
    host: "localhost",
    port: 5173,
    watch: {
      usePolling: true, // Keep for macOS compatibility
      interval: 1000, // ✅ Less aggressive polling (was 100ms)
      ignored: ["**/node_modules/**", "**/.git/**"], // ✅ Ignore unnecessary files
    },
    hmr: {
      overlay: true,
      port: 5173, // ✅ Explicit HMR port
    },
    cors: true, // ✅ Enable CORS for API calls
    open: false, // ✅ Don't auto-open browser
  },

  // ✅ Optimized dependency pre-bundling
  optimizeDeps: {
    force: false, // ✅ Only rebuild when needed (was true)
    include: [
      // ✅ Pre-bundle heavy dependencies
      "react",
      "react-dom",
      "react-bootstrap",
      "bootstrap",
      "@fortawesome/react-fontawesome",
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/free-brands-svg-icons",
      "@fortawesome/fontawesome-svg-core",
      "axios",
      "socket.io-client",
      "react-chartjs-2",
      "chart.js",
      "date-fns",
      "@szhsin/react-menu",
      "react-router-dom",
      "react-toastify",
      "react-to-print",
    ],
    exclude: ["react-refresh"], // ✅ Exclude dev-only dependencies
  },

  // ✅ Production build optimization
  build: {
    sourcemap: true, // ✅ Enable source maps for debugging
    target: "es2020", // ✅ Modern browser support
    minify: "esbuild", // ✅ Fast minification
    chunkSizeWarningLimit: 1000, // ✅ Warn for large chunks
    rollupOptions: {
      output: {
        // ✅ Better chunk splitting for caching
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": ["react-bootstrap", "bootstrap"],
          "icon-vendor": [
            "@fortawesome/react-fontawesome",
            "@fortawesome/free-solid-svg-icons",
            "@fortawesome/free-brands-svg-icons",
          ],
          "chart-vendor": ["react-chartjs-2", "chart.js"],
          "utils-vendor": ["axios", "socket.io-client", "date-fns"],
        },
        // ✅ Better file naming
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
  },

  // ✅ Path aliases for cleaner imports
  resolve: {
    alias: {
      "@": "/src",
      "@components": "/src/components",
      "@context": "/src/context",
      "@utils": "/src/utils",
      "@assets": "/src/assets",
    },
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
  },

  // ✅ Environment variables
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development"
    ),
  },

  // ✅ CSS optimization
  css: {
    devSourcemap: true, // ✅ CSS source maps in development
  },

  // ✅ Preview server configuration
  preview: {
    port: 4173,
    host: "localhost",
    cors: true,
  },
});
