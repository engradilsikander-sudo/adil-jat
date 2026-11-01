type ElementPngOptions = {
  pixelRatio?: number
  backgroundColor?: string
  cacheBust?: boolean
  fontEmbedCSS?: string
  width?: number
  height?: number
  canvasWidth?: number
  canvasHeight?: number
  style?: Partial<CSSStyleDeclaration>
}

async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'))

  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve()

      return new Promise<void>((resolve) => {
        const done = () => resolve()
        image.addEventListener('load', done, { once: true })
        image.addEventListener('error', done, { once: true })
      })
    }),
  )
}

export async function prepareCardElementForExport(element: HTMLElement) {
  await waitForImages(element)

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  await new Promise((resolve) => window.requestAnimationFrame(resolve))
}

export async function elementToPngDataUrl(
  element: HTMLElement,
  options?: ElementPngOptions,
) {
  const { toPng } = await import('html-to-image')

  await prepareCardElementForExport(element)

  return toPng(element, {
    cacheBust: options?.cacheBust ?? true,
    pixelRatio: options?.pixelRatio ?? 2.5,
    backgroundColor: options?.backgroundColor ?? '#ffffff',
    fontEmbedCSS: options?.fontEmbedCSS ?? '',
    width: options?.width,
    height: options?.height,
    canvasWidth: options?.canvasWidth,
    canvasHeight: options?.canvasHeight,
    style: {
      margin: '0',
      transform: 'none',
      ...options?.style,
    },
  })
}

export async function exportElementAsPng(
  element: HTMLElement,
  filename: string,
  options?: ElementPngOptions,
) {
  const dataUrl = await elementToPngDataUrl(element, options)
  downloadDataUrl(dataUrl, filename)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}
