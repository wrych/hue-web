import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://localhost:3001',
                ws: true,
            },
        },
    },
    build: {
        target: 'esnext',
        minify: 'terser',
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('vue') || id.includes('pinia')) {
                            return 'vue-vendor';
                        }
                        if (id.includes('vuetify')) {
                            return 'vuetify-vendor';
                        }
                        return 'vendor';
                    }
                    if (id.includes('utils/')) {
                        return 'utils';
                    }
                    if (id.includes('components/')) {
                        return 'components';
                    }
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            },
        },
        chunkSizeWarningLimit: 600,
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
    },
}); 