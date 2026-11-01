export function normalizeVerificationNumber(value: string) {
  const normalized = value.trim().toUpperCase()
  if (!/^JAS-\d{4}-\d{4,10}$/.test(normalized)) throw new Error('VERIFY_INVALID_NUMBER')
  return normalized
}
export function verificationErrorText(language: 'en' | 'ur' | 'sd', message: string) {
  const copy = {
    en: ['Invalid membership number. Use JAS-YYYY-0001 format.', 'Too many verification requests. Please wait one minute and try again.', 'Verification is temporarily unavailable. Please try again shortly.'],
    ur: ['رکنیت نمبر درست نہیں۔ JAS-YYYY-0001 کی شکل استعمال کریں۔', 'تصدیق کی درخواستیں زیادہ ہیں۔ ایک منٹ بعد دوبارہ کوشش کریں۔', 'تصدیق عارضی طور پر دستیاب نہیں۔ کچھ دیر بعد دوبارہ کوشش کریں۔'],
    sd: ['ميمبرشپ نمبر درست ناهي. JAS-YYYY-0001 جي صورت استعمال ڪريو.', 'تصديق جون درخواستون گهڻيون آهن. هڪ منٽ کان پوءِ ٻيهر ڪوشش ڪريو.', 'تصديق عارضي طور دستياب ناهي. ٿوري دير کان پوءِ ٻيهر ڪوشش ڪريو.'],
  }
  return copy[language][message.includes('VERIFY_RATE_LIMITED') ? 1 : message.includes('VERIFY_INVALID_NUMBER') ? 0 : 2]
}
