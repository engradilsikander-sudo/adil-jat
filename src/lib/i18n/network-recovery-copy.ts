import type { AppLanguage } from './types'

type NetworkRecoveryStrings = {
  offline: string
  offlineDetail: string
  reconnected: string
  reconnectedDetail: string
  dismiss: string
  readFailed: string
  tryAgain: string
}

export const networkRecoveryCopy: Record<AppLanguage, NetworkRecoveryStrings> = {
  en: {
    offline: 'You appear to be offline',
    offlineDetail: 'Check your connection. Saved pages may still be visible, but new data and submissions may not work.',
    reconnected: 'Your device reports a connection',
    reconnectedDetail: 'Use Refresh or Retry on the page to get current data. Nothing was submitted automatically.',
    dismiss: 'Dismiss connection notice',
    readFailed: 'Could not load updates. Check the connection and try again.',
    tryAgain: 'Try loading again',
  },
  ur: {
    offline: 'آپ کا انٹرنیٹ منقطع معلوم ہوتا ہے',
    offlineDetail: 'کنکشن چیک کریں۔ محفوظ شدہ صفحات نظر آ سکتے ہیں، لیکن نیا ڈیٹا اور درخواستیں دستیاب نہیں ہو سکتیں۔',
    reconnected: 'آپ کے فون پر کنکشن بحال دکھائی دے رہا ہے',
    reconnectedDetail: 'تازہ ڈیٹا کے لیے صفحے پر ریفریش یا دوبارہ کوشش کریں۔ کوئی درخواست خودکار طور پر جمع نہیں ہوئی۔',
    dismiss: 'کنکشن کا پیغام بند کریں',
    readFailed: 'اطلاعات لوڈ نہیں ہو سکیں۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
    tryAgain: 'دوبارہ لوڈ کریں',
  },
  sd: {
    offline: 'لڳي ٿو انٽرنيٽ ڪنيڪشن بند آهي',
    offlineDetail: 'ڪنيڪشن چيڪ ڪريو. محفوظ ٿيل صفحا ڏسڻ ۾ اچي سگهن ٿا، پر نئون ڊيٽا ۽ درخواستون ڪم نه ڪري سگهن ٿيون.',
    reconnected: 'ڊوائيس تي ڪنيڪشن بحال نظر اچي ٿو',
    reconnectedDetail: 'تازي ڊيٽا لاءِ صفحي تي ريفريش يا ٻيهر ڪوشش ڪريو. ڪا به درخواست پاڻمرادو جمع نه ٿي آهي.',
    dismiss: 'ڪنيڪشن جو پيغام بند ڪريو',
    readFailed: 'اطلاع لوڊ نه ٿي سگهيا. ڪنيڪشن چيڪ ڪري ٻيهر ڪوشش ڪريو.',
    tryAgain: 'ٻيهر لوڊ ڪريو',
  },
}
