import { BRAND, BRAND_METADATA } from '../lib/branding'
// src/routes/__root.tsx
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Header } from '../components/layout/Header'
import { NotFoundPage } from '../components/layout/NotFoundPage'
import { PwaBootstrap } from '../components/layout/PwaBootstrap'
import { ConnectionNotice } from '../components/layout/ConnectionNotice'
import { AppUpdateReset } from '../components/pwa/AppUpdateReset'
import { I18nProvider } from '../lib/i18n'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  notFoundComponent: RootNotFoundPage,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: BRAND_METADATA.title },
      {
        name: 'description',
        content:
          BRAND_METADATA.description,
      },
      { name: 'theme-color', content: '#142d4e' },
      { name: 'application-name', content: BRAND.shortName },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: BRAND.shortName },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'msapplication-TileColor', content: '#142d4e' },
      { name: 'format-detection', content: 'telephone=no' },
      {
        property: 'og:title',
        content: BRAND_METADATA.socialTitle,
      },
      {
        property: 'og:description',
        content:
          BRAND_METADATA.socialDescription,
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: BRAND.name },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: BRAND_METADATA.socialTitle },
      { name: 'twitter:description', content: BRAND_METADATA.socialDescription },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const isLandingPage = pathname === '/'
  const isPublicVerifyPage = pathname.startsWith('/verify/')
  const isCardPreviewPage =
    pathname === '/card' ||
    pathname.includes('/admin/members/') ||
    pathname.endsWith('/card')

  return (
    <RootDocument>
      <div className="jas-app">

        <PwaBootstrap />
        <ConnectionNotice />
        <AppUpdateReset />
        {!isPublicVerifyPage && !isLandingPage ? <Header compact={isCardPreviewPage} /> : null}

        <div className="animate-fade-up relative z-10">
          <Outlet />
        </div>
      </div>
    </RootDocument>
  )
}

function RootNotFoundPage() {
  return (
    <RootDocument>
      <NotFoundPage />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-emerald-900 focus:shadow-lg"
        >
          Skip to main content
        </a>

        <div id="main-content">
          <I18nProvider>{children}</I18nProvider>
        </div>

        <Scripts />
      </body>
    </html>
  )
}
