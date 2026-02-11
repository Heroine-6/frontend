import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendHost = env.VITE_BACKEND_HOST || 'localhost'
  console.log('backendHost:', backendHost)

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false
        },
        '/batch-api': {
          target: 'http://localhost:8081',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          search: resolve(__dirname, 'search.html'),
          signin: resolve(__dirname, 'signin.html'),
          signup: resolve(__dirname, 'signup.html'),
          mypage: resolve(__dirname, 'mypage.html'),
          bids: resolve(__dirname, 'bids.html'),
          payments: resolve(__dirname, 'payments.html'),
          'market-prices': resolve(__dirname, 'market-prices.html'),
          'my-properties': resolve(__dirname, 'my-properties.html'),
          'create-auction': resolve(__dirname, 'create-auction.html')
        }
      }
    }
  }
})
