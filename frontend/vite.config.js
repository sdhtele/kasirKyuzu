import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
    plugins: [
        react(),
        basicSsl()  // Auto-generate SSL certificate
    ],
    server: {
        host: true,  // Allow network access
        port: 5556,  // Frontend port
        https: true, // Enable HTTPS
        proxy: {
            '/api': {
                target: 'http://localhost:8888',  // Backend port
                changeOrigin: true,
                secure: false
            },
            '/uploads': {
                target: 'http://localhost:8888',  // Backend port for images
                changeOrigin: true,
                secure: false
            }
        }
    }
})
