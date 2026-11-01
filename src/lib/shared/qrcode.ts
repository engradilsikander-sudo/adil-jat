type QrDataUrlOptions = {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  color?: {
    dark?: string
    light?: string
  }
}

export async function generateQrDataUrl(
  value: string,
  options?: QrDataUrlOptions,
) {
  const { default: QRCode } = await import('qrcode')

  return QRCode.toDataURL(value, options)
}
