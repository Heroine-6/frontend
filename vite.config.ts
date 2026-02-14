import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mainServer = env.VITE_MAIN_SERVER || 'http://localhost:8080'
  const chatServer = env.VITE_CHAT_SERVER || 'http://localhost:8080'

  return {
    plugins: [
      vue(),
      {
        name: 'kakao-oauth-redirect',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/login/oauth2/code/kakao')) {
              const query = req.url.split('?')[1] || ''
              res.writeHead(302, { Location: `/signin.html${query ? '?' + query : ''}` })
              res.end()
              return
            }
            next()
          })
        }
      }
    ],
    server: {
      proxy: {
        '/api/v2/chats': {
          target: chatServer,
          changeOrigin: true,
          secure: false
        },
        '/ws': {
          target: chatServer,
          changeOrigin: true,
          secure: false,
          ws: true
        },
        '/api': {
          target: mainServer,
          changeOrigin: true,
          secure: false
        },
        '/batch-api': {
          target: chatServer,
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
          'create-auction': resolve(__dirname, 'create-auction.html'),
          'kakao-complete': resolve(__dirname, 'kakao-complete.html'),
          'create-property': resolve(__dirname, 'create-property.html'),
          'payment-checkout': resolve(__dirname, 'payment-checkout.html'),
          'payment-success': resolve(__dirname, 'payment-success.html'),
          'payment-fail': resolve(__dirname, 'payment-fail.html'),
          chat: resolve(__dirname, 'chat.html'),
          'auction-detail': resolve(__dirname, 'auction-detail.html'),
          'auction-property-detail': resolve(__dirname, 'auction-property-detail.html'),
          'bid-register': resolve(__dirname, 'bid-register.html')
        }
      }
    }
  }
})
