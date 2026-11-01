import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const srcPath = new URL('./src', import.meta.url).pathname

function manualChunks(id: string) {
  if (!id.includes('node_modules')) return undefined

  if (id.includes('/react/') || id.includes('/react-dom/')) {
    return 'vendor-react'
  }

  if (
    id.includes('/@tanstack/react-router') ||
    id.includes('/@tanstack/router-core') ||
    id.includes('/@tanstack/react-start') ||
    id.includes('/@tanstack/start-')
  ) {
    return 'vendor-tanstack-router'
  }

  if (
    id.includes('/@tanstack/react-query') ||
    id.includes('/@tanstack/query-core')
  ) {
    return 'vendor-tanstack-query'
  }

  if (id.includes('/@tanstack/')) {
    return 'vendor-tanstack'
  }

  if (id.includes('/@supabase/')) {
    return 'vendor-supabase'
  }

  if (id.includes('/lucide-react/')) {
    return 'vendor-icons'
  }

  if (id.includes('/qrcode/') || id.includes('/pngjs/')) {
    return 'vendor-qrcode'
  }

  if (id.includes('/html-to-image/')) {
    return 'vendor-card-export'
  }

  if (id.includes('/zod/')) {
    return 'vendor-zod'
  }

  return 'vendor'
}

const config = defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  return {
    resolve: {
      alias: {
        '#': srcPath,
        '@': srcPath,
      },
      dedupe: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@tanstack/react-router',
        '@tanstack/router-core',
      ],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        '@tanstack/react-router',
        '@tanstack/router-core',
        '@tanstack/router-core/isServer',
        '@tanstack/router-core/ssr/client',
        'seroval',
      ],
    },
    build: {
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
    plugins: [
      ...(isDev ? [devtools()] : []),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
      nitro(),
    ],
  }
})

export default config
