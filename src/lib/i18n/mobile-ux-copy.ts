import type { AppLanguage } from './types'

type NotificationCopy = {
  loading: string
  eyebrow: string
  title: string
  subtitle: string
  markAllRead: string
  refresh: string
  preferences: string
  totalUpdates: string
  unreadLoaded: string
  loaded: string
  showingLatest: string
  refreshing: string
  loadingMore: string
  loadMore: string
  emptyTitle: string
  emptyText: string
  backDashboard: string
  newLabel: string
  open: string
  unavailableDate: string
  categories: Record<string, string>
}

type PreferenceCopy = {
  leaveConfirm: string
  refreshConfirm: string
  refresh: string
  loading: string
  control: string
  title: string
  subtitle: string
  viewNotifications: string
  browserChannel: string
  webPushTitle: string
  webPushDescription: string
  browserSupport: string
  permission: string
  pushConfiguration: string
  currentDevice: string
  supported: string
  notSupported: string
  configured: string
  missingPublicKey: string
  subscribed: string
  notSubscribed: string
  permissionGranted: string
  permissionDenied: string
  permissionDefault: string
  enableThisBrowser: string
  removeThisBrowser: string
  deliveryCategories: string
  chooseImportantUpdates: string
  enableBrowserPush: string
  enableBrowserPushDescription: string
  membershipUpdates: string
  membershipUpdatesDescription: string
  programUpdates: string
  programUpdatesDescription: string
  financeUpdates: string
  financeUpdatesDescription: string
  generalAnnouncements: string
  generalAnnouncementsDescription: string
  savePreferences: string
  savedDevices: string
  browserSubscriptions: string
  endpointsHidden: string
  disableAllDevices: string
  enabled: string
  disabled: string
  failures: string
  lastSeen: string
  lastSuccess: string
  lastFailure: string
  noDevices: string
  never: string
  unknown: string
  loginAgainSave: string
  saved: string
  vapidMissing: string
  productionOnly: string
  unsupportedSecurePush: string
  permissionBlocked: string
  permissionNotGranted: string
  loginAgainEnable: string
  incompleteSubscription: string
  enabledForDevice: string
  unableEnable: string
  browserNotSubscribed: string
  browserRemoved: string
  unableRemove: string
  loginAgainDisable: string
  allDevicesDisabled: string
  migrationRequired: string
}

type PwaCopy = {
  updateConfirm: string
  updateTimeout: string
  updateStartFailed: string
  pushNotConfigured: string
  pushUnsupported: string
  pushLoginFirst: string
  pushPermissionDenied: string
  pushLoginAgain: string
  pushIncomplete: string
  pushEnabled: string
  pushEnableFailed: string
  updateEyebrow: string
  updating: string
  updateAvailable: string
  updateDescription: string
  updateNow: string
  later: string
  installEyebrow: string
  installTitle: string
  installDescription: string
  opening: string
  installAction: string
  notNow: string
  pushEyebrow: string
  pushTitle: string
  pushDescription: string
  enabling: string
  enableNotifications: string
}

export type MobileUxCopy = {
  notifications: NotificationCopy
  preferences: PreferenceCopy
  pwa: PwaCopy
}

const en: MobileUxCopy = {
  notifications: {
    loading: 'Loading notifications...',
    eyebrow: 'In-app Updates',
    title: 'Notifications',
    subtitle: 'Program status, donation verification and important member updates will appear here.',
    markAllRead: 'Mark all read',
    refresh: 'Refresh',
    preferences: 'Preferences',
    totalUpdates: 'Total Updates',
    unreadLoaded: 'Unread Loaded',
    loaded: 'Loaded',
    showingLatest: 'Showing latest {shown} of {total} notifications',
    refreshing: 'Refreshing...',
    loadingMore: 'Loading...',
    loadMore: 'Load More',
    emptyTitle: 'No notifications yet',
    emptyText: 'When an admin updates your application, case or donation status, the notification will appear here.',
    backDashboard: 'Back to Dashboard',
    newLabel: 'New',
    open: 'Open',
    unavailableDate: 'N/A',
    categories: {
      education: 'Education', health: 'Health', welfare: 'Welfare', employment: 'Employment',
      donation: 'Donation', membership: 'Membership', finance: 'Finance', general: 'General',
    },
  },
  preferences: {
    leaveConfirm: 'You have unsaved notification preference changes. Leave without saving them?',
    refreshConfirm: 'Refreshing will discard your unsaved notification preference changes. Continue?',
    refresh: 'Refresh',
    loading: 'Loading notification preferences...',
    control: 'Notification Control',
    title: 'Push Preferences',
    subtitle: 'Choose which JAS updates can reach your browser and manage all devices linked with your account.',
    viewNotifications: 'View Notifications',
    browserChannel: 'Browser channel',
    webPushTitle: 'Web push notifications',
    webPushDescription: 'Pausing push keeps in-app notifications active. Removing a device deletes only that browser subscription.',
    browserSupport: 'Browser support',
    permission: 'Permission',
    pushConfiguration: 'Push configuration',
    currentDevice: 'Current device',
    supported: 'Supported',
    notSupported: 'Not supported',
    configured: 'Configured',
    missingPublicKey: 'Missing public key',
    subscribed: 'Subscribed',
    notSubscribed: 'Not subscribed',
    permissionGranted: 'Granted',
    permissionDenied: 'Denied',
    permissionDefault: 'Not decided',
    enableThisBrowser: 'Enable this browser',
    removeThisBrowser: 'Remove this browser',
    deliveryCategories: 'Delivery categories',
    chooseImportantUpdates: 'Choose important updates',
    enableBrowserPush: 'Enable browser push',
    enableBrowserPushDescription: 'Master switch for every web push category.',
    membershipUpdates: 'Membership updates',
    membershipUpdatesDescription: 'Application, card, payment and profile decisions.',
    programUpdates: 'Program updates',
    programUpdatesDescription: 'Education, health, welfare and employment cases.',
    financeUpdates: 'Finance updates',
    financeUpdatesDescription: 'Donation and finance-related status alerts.',
    generalAnnouncements: 'General announcements',
    generalAnnouncementsDescription: 'Organization notices and general campaigns.',
    savePreferences: 'Save preferences',
    savedDevices: 'Saved devices',
    browserSubscriptions: 'Browser subscriptions',
    endpointsHidden: 'Endpoints and encryption keys are never displayed in full.',
    disableAllDevices: 'Disable all devices',
    enabled: 'Enabled',
    disabled: 'Disabled',
    failures: 'Failures',
    lastSeen: 'Last seen',
    lastSuccess: 'Last success',
    lastFailure: 'Last failure',
    noDevices: 'No browser devices are registered yet.',
    never: 'Never',
    unknown: 'Unknown',
    loginAgainSave: 'Please login again before saving notification preferences.',
    saved: 'Notification preferences saved.',
    vapidMissing: 'Browser notification configuration is not available yet.',
    productionOnly: 'Browser push registration is available on the production HTTPS app.',
    unsupportedSecurePush: 'This browser does not support secure web push notifications.',
    permissionBlocked: 'Browser notification permission is blocked. Enable it from the browser site settings.',
    permissionNotGranted: 'Notification permission was not granted.',
    loginAgainEnable: 'Please login again before enabling browser notifications.',
    incompleteSubscription: 'Browser returned an incomplete push subscription.',
    enabledForDevice: 'Browser notifications enabled for this device.',
    unableEnable: 'Unable to enable browser notifications.',
    browserNotSubscribed: 'This browser is not currently subscribed.',
    browserRemoved: 'This browser was removed from push notifications.',
    unableRemove: 'Unable to remove this browser subscription.',
    loginAgainDisable: 'Please login again before disabling devices.',
    allDevicesDisabled: 'Web push paused and all saved browser devices disabled.',
    migrationRequired: 'Apply migration 20260711010000_web_push_reliability_preferences.sql before using notification preferences.',
  },
  pwa: {
    updateConfirm: 'Update JAS now? Save any unfinished form first. This will reload the page.',
    updateTimeout: 'Update did not finish. Please try again when connected.',
    updateStartFailed: 'Could not start the update. Please try again.',
    pushNotConfigured: 'Push notifications are not configured yet.',
    pushUnsupported: 'This browser does not support web push notifications.',
    pushLoginFirst: 'Please login first to enable member notifications.',
    pushPermissionDenied: 'Notification permission was not allowed.',
    pushLoginAgain: 'Please login again to enable notifications.',
    pushIncomplete: 'Browser did not return a complete push subscription.',
    pushEnabled: 'Browser notifications enabled.',
    pushEnableFailed: 'Unable to enable browser notifications.',
    updateEyebrow: 'JAS app update',
    updating: 'Updating…',
    updateAvailable: 'New version available',
    updateDescription: 'Save any unfinished work, then choose Update now. You can keep using this version by choosing Later.',
    updateNow: 'Update now',
    later: 'Later',
    installEyebrow: 'Install JAS App',
    installTitle: 'Install JAS App',
    installDescription: 'Install the JAS member portal for faster access to membership, digital cards, updates and admin tools.',
    opening: 'Opening…',
    installAction: 'Install JAS App',
    notNow: 'Not now',
    pushEyebrow: 'JAS notifications',
    pushTitle: 'Enable browser notifications',
    pushDescription: 'Get membership approval, payment and important update alerts even when the JAS app is installed or running in the background.',
    enabling: 'Enabling…',
    enableNotifications: 'Enable notifications',
  },
}

const ur: MobileUxCopy = {
  notifications: {
    loading: 'اطلاعات لوڈ ہو رہی ہیں...',
    eyebrow: 'ایپ کے اندر اپڈیٹس',
    title: 'اطلاعات',
    subtitle: 'پروگرام اسٹیٹس، عطیہ کی تصدیق اور اہم ممبر اپڈیٹس یہاں دکھائی جائیں گی۔',
    markAllRead: 'سب کو پڑھا ہوا نشان لگائیں',
    refresh: 'تازہ کریں',
    preferences: 'ترجیحات',
    totalUpdates: 'کل اپڈیٹس',
    unreadLoaded: 'لوڈ شدہ غیر پڑھی',
    loaded: 'لوڈ شدہ',
    showingLatest: 'تازہ ترین {shown} از {total} اطلاعات دکھائی جا رہی ہیں',
    refreshing: 'تازہ ہو رہا ہے...',
    loadingMore: 'لوڈ ہو رہا ہے...',
    loadMore: 'مزید لوڈ کریں',
    emptyTitle: 'ابھی کوئی اطلاع نہیں',
    emptyText: 'جب ایڈمن آپ کی درخواست، کیس یا عطیہ کا اسٹیٹس اپڈیٹ کرے گا تو اطلاع یہاں دکھائی دے گی۔',
    backDashboard: 'ڈیش بورڈ پر واپس',
    newLabel: 'نئی',
    open: 'کھولیں',
    unavailableDate: 'دستیاب نہیں',
    categories: {
      education: 'تعلیم', health: 'صحت', welfare: 'فلاح', employment: 'روزگار',
      donation: 'عطیہ', membership: 'ممبرشپ', finance: 'مالیات', general: 'عمومی',
    },
  },
  preferences: {
    leaveConfirm: 'آپ نے اطلاع کی ترجیحات میں تبدیلیاں محفوظ نہیں کیں۔ محفوظ کیے بغیر صفحہ چھوڑ دیں؟',
    refreshConfirm: 'تازہ کرنے سے غیر محفوظ اطلاع ترجیحات ختم ہو جائیں گی۔ جاری رکھیں؟',
    refresh: 'تازہ کریں',
    loading: 'اطلاع کی ترجیحات لوڈ ہو رہی ہیں...',
    control: 'اطلاع کنٹرول',
    title: 'پش ترجیحات',
    subtitle: 'منتخب کریں کہ کون سی JAS اپڈیٹس براؤزر تک پہنچ سکتی ہیں اور اپنے اکاؤنٹ سے منسلک تمام ڈیوائسز منظم کریں۔',
    viewNotifications: 'اطلاعات دیکھیں',
    browserChannel: 'براؤزر چینل',
    webPushTitle: 'ویب پش اطلاعات',
    webPushDescription: 'پش روکنے سے ایپ کے اندر اطلاعات فعال رہیں گی۔ ڈیوائس ہٹانے سے صرف اسی براؤزر کی سبسکرپشن حذف ہوگی۔',
    browserSupport: 'براؤزر سپورٹ',
    permission: 'اجازت',
    pushConfiguration: 'پش کنفیگریشن',
    currentDevice: 'موجودہ ڈیوائس',
    supported: 'سپورٹ شدہ',
    notSupported: 'سپورٹ نہیں',
    configured: 'کنفیگر شدہ',
    missingPublicKey: 'پبلک کی موجود نہیں',
    subscribed: 'سبسکرائب شدہ',
    notSubscribed: 'سبسکرائب نہیں',
    permissionGranted: 'اجازت دی گئی',
    permissionDenied: 'اجازت روکی گئی',
    permissionDefault: 'ابھی فیصلہ نہیں',
    enableThisBrowser: 'اس براؤزر کو فعال کریں',
    removeThisBrowser: 'اس براؤزر کو ہٹائیں',
    deliveryCategories: 'اطلاع کی اقسام',
    chooseImportantUpdates: 'اہم اپڈیٹس منتخب کریں',
    enableBrowserPush: 'براؤزر پش فعال کریں',
    enableBrowserPushDescription: 'تمام ویب پش اقسام کے لیے بنیادی سوئچ۔',
    membershipUpdates: 'ممبرشپ اپڈیٹس',
    membershipUpdatesDescription: 'درخواست، کارڈ، ادائیگی اور پروفائل فیصلے۔',
    programUpdates: 'پروگرام اپڈیٹس',
    programUpdatesDescription: 'تعلیم، صحت، فلاح اور روزگار کے کیسز۔',
    financeUpdates: 'مالی اپڈیٹس',
    financeUpdatesDescription: 'عطیات اور مالی اسٹیٹس سے متعلق اطلاعات۔',
    generalAnnouncements: 'عمومی اعلانات',
    generalAnnouncementsDescription: 'تنظیمی نوٹس اور عمومی مہمات۔',
    savePreferences: 'ترجیحات محفوظ کریں',
    savedDevices: 'محفوظ ڈیوائسز',
    browserSubscriptions: 'براؤزر سبسکرپشنز',
    endpointsHidden: 'اینڈ پوائنٹس اور انکرپشن کیز کبھی مکمل طور پر نہیں دکھائی جاتیں۔',
    disableAllDevices: 'تمام ڈیوائسز غیر فعال کریں',
    enabled: 'فعال',
    disabled: 'غیر فعال',
    failures: 'ناکامیاں',
    lastSeen: 'آخری بار دیکھا',
    lastSuccess: 'آخری کامیابی',
    lastFailure: 'آخری ناکامی',
    noDevices: 'ابھی کوئی براؤزر ڈیوائس رجسٹرڈ نہیں۔',
    never: 'کبھی نہیں',
    unknown: 'نامعلوم',
    loginAgainSave: 'اطلاع کی ترجیحات محفوظ کرنے سے پہلے دوبارہ لاگ اِن کریں۔',
    saved: 'اطلاع کی ترجیحات محفوظ ہو گئیں۔',
    vapidMissing: 'براؤزر اطلاع کی کنفیگریشن ابھی دستیاب نہیں۔',
    productionOnly: 'براؤزر پش رجسٹریشن صرف پروڈکشن HTTPS ایپ پر دستیاب ہے۔',
    unsupportedSecurePush: 'یہ براؤزر محفوظ ویب پش اطلاعات کو سپورٹ نہیں کرتا۔',
    permissionBlocked: 'براؤزر اطلاع کی اجازت مسدود ہے۔ براؤزر سائٹ سیٹنگز سے اسے فعال کریں۔',
    permissionNotGranted: 'اطلاع کی اجازت نہیں دی گئی۔',
    loginAgainEnable: 'براؤزر اطلاعات فعال کرنے سے پہلے دوبارہ لاگ اِن کریں۔',
    incompleteSubscription: 'براؤزر نے مکمل پش سبسکرپشن واپس نہیں کی۔',
    enabledForDevice: 'اس ڈیوائس کے لیے براؤزر اطلاعات فعال ہو گئیں۔',
    unableEnable: 'براؤزر اطلاعات فعال نہیں ہو سکیں۔',
    browserNotSubscribed: 'یہ براؤزر اس وقت سبسکرائب نہیں ہے۔',
    browserRemoved: 'یہ براؤزر پش اطلاعات سے ہٹا دیا گیا۔',
    unableRemove: 'اس براؤزر کی سبسکرپشن ہٹائی نہیں جا سکی۔',
    loginAgainDisable: 'ڈیوائسز غیر فعال کرنے سے پہلے دوبارہ لاگ اِن کریں۔',
    allDevicesDisabled: 'ویب پش روک دیا گیا اور تمام محفوظ براؤزر ڈیوائسز غیر فعال کر دی گئیں۔',
    migrationRequired: 'اطلاع کی ترجیحات استعمال کرنے سے پہلے 20260711010000_web_push_reliability_preferences.sql مائیگریشن لاگو کریں۔',
  },
  pwa: {
    updateConfirm: 'JAS ابھی اپڈیٹ کریں؟ پہلے اپنا نامکمل فارم محفوظ کریں۔ صفحہ دوبارہ لوڈ ہوگا۔',
    updateTimeout: 'اپڈیٹ مکمل نہیں ہوا۔ کنکشن دستیاب ہونے پر دوبارہ کوشش کریں۔',
    updateStartFailed: 'اپڈیٹ شروع نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
    pushNotConfigured: 'پش اطلاعات ابھی کنفیگر نہیں ہیں۔',
    pushUnsupported: 'یہ براؤزر ویب پش اطلاعات کو سپورٹ نہیں کرتا۔',
    pushLoginFirst: 'ممبر اطلاعات فعال کرنے کے لیے پہلے لاگ اِن کریں۔',
    pushPermissionDenied: 'اطلاع کی اجازت نہیں دی گئی۔',
    pushLoginAgain: 'اطلاعات فعال کرنے کے لیے دوبارہ لاگ اِن کریں۔',
    pushIncomplete: 'براؤزر نے مکمل پش سبسکرپشن واپس نہیں کی۔',
    pushEnabled: 'براؤزر اطلاعات فعال ہو گئیں۔',
    pushEnableFailed: 'براؤزر اطلاعات فعال نہیں ہو سکیں۔',
    updateEyebrow: 'JAS ایپ اپڈیٹ',
    updating: 'اپڈیٹ ہو رہا ہے…',
    updateAvailable: 'نیا ورژن دستیاب ہے',
    updateDescription: 'نامکمل کام محفوظ کریں، پھر ابھی اپڈیٹ کریں منتخب کریں۔ بعد میں منتخب کرکے موجودہ ورژن استعمال کرتے رہ سکتے ہیں۔',
    updateNow: 'ابھی اپڈیٹ کریں',
    later: 'بعد میں',
    installEyebrow: 'JAS ایپ انسٹال کریں',
    installTitle: 'JAS ایپ انسٹال کریں',
    installDescription: 'ممبرشپ، ڈیجیٹل کارڈز، اپڈیٹس اور ایڈمن ٹولز تک تیز رسائی کے لیے JAS ممبر پورٹل انسٹال کریں۔',
    opening: 'کھل رہا ہے…',
    installAction: 'JAS ایپ انسٹال کریں',
    notNow: 'ابھی نہیں',
    pushEyebrow: 'JAS اطلاعات',
    pushTitle: 'براؤزر اطلاعات فعال کریں',
    pushDescription: 'ممبرشپ منظوری، ادائیگی اور اہم اپڈیٹ الرٹس حاصل کریں، چاہے JAS ایپ انسٹال ہو یا پس منظر میں چل رہی ہو۔',
    enabling: 'فعال ہو رہا ہے…',
    enableNotifications: 'اطلاعات فعال کریں',
  },
}

const sd: MobileUxCopy = {
  notifications: {
    loading: 'نوٽيفڪيشنون لوڊ ٿي رهيون آهن...',
    eyebrow: 'ايپ اندر اپڊيٽس',
    title: 'نوٽيفڪيشنون',
    subtitle: 'پروگرام اسٽيٽس، عطئي جي تصديق ۽ اهم ميمبر اپڊيٽس هتي ڏيکاريا ويندا۔',
    markAllRead: 'سڀ پڙهيل طور نشان لڳايو',
    refresh: 'ريفريش',
    preferences: 'ترجيحات',
    totalUpdates: 'ڪل اپڊيٽس',
    unreadLoaded: 'لوڊ ٿيل اڻ پڙهيل',
    loaded: 'لوڊ ٿيل',
    showingLatest: 'تازيون {shown} مان {total} نوٽيفڪيشنون ڏيکاريون پيون وڃن',
    refreshing: 'ريفريش ٿي رهيو آهي...',
    loadingMore: 'لوڊ ٿي رهيو آهي...',
    loadMore: 'وڌيڪ لوڊ ڪريو',
    emptyTitle: 'اڃا ڪا نوٽيفڪيشن ناهي',
    emptyText: 'جڏهن ايڊمن توهان جي درخواست، ڪيس يا عطئي جي اسٽيٽس کي اپڊيٽ ڪندو ته نوٽيفڪيشن هتي ظاهر ٿيندي۔',
    backDashboard: 'ڊيش بورڊ ڏانهن واپس',
    newLabel: 'نئون',
    open: 'کوليو',
    unavailableDate: 'دستياب ناهي',
    categories: {
      education: 'تعليم', health: 'صحت', welfare: 'فلاح', employment: 'روزگار',
      donation: 'عطيو', membership: 'ميمبرشپ', finance: 'ماليات', general: 'عام',
    },
  },
  preferences: {
    leaveConfirm: 'توهان نوٽيفڪيشن ترجيحات جون تبديليون محفوظ ناهن ڪيون۔ محفوظ ڪرڻ کان سواءِ صفحو ڇڏڻ چاهيو ٿا؟',
    refreshConfirm: 'ريفريش ڪرڻ سان محفوظ نه ٿيل نوٽيفڪيشن ترجيحات ختم ٿي وينديون۔ جاري رکو؟',
    refresh: 'ريفريش',
    loading: 'نوٽيفڪيشن ترجيحات لوڊ ٿي رهيون آهن...',
    control: 'نوٽيفڪيشن ڪنٽرول',
    title: 'پش ترجيحات',
    subtitle: 'چونڊيو ته ڪهڙيون JAS اپڊيٽس توهان جي برائوزر تائين پهچي سگهن ٿيون ۽ اڪائونٽ سان ڳنڍيل سڀ ڊوائيس منظم ڪريو۔',
    viewNotifications: 'نوٽيفڪيشنون ڏسو',
    browserChannel: 'برائوزر چينل',
    webPushTitle: 'ويب پش نوٽيفڪيشنون',
    webPushDescription: 'پش روڪڻ سان ايپ اندر نوٽيفڪيشنون فعال رهنديون۔ ڊوائيس هٽائڻ سان رڳو انهي برائوزر جي سبسڪرپشن ختم ٿيندي۔',
    browserSupport: 'برائوزر سپورٽ',
    permission: 'اجازت',
    pushConfiguration: 'پش ڪنفيگريشن',
    currentDevice: 'موجوده ڊوائيس',
    supported: 'سپورٽ ٿيل',
    notSupported: 'سپورٽ ناهي',
    configured: 'ڪنفيگر ٿيل',
    missingPublicKey: 'پبلڪ ڪي موجود ناهي',
    subscribed: 'سبسڪرائب ٿيل',
    notSubscribed: 'سبسڪرائب ناهي',
    permissionGranted: 'اجازت مليل',
    permissionDenied: 'اجازت روڪيل',
    permissionDefault: 'اڃا فيصلو ناهي',
    enableThisBrowser: 'هي برائوزر فعال ڪريو',
    removeThisBrowser: 'هي برائوزر هٽايو',
    deliveryCategories: 'نوٽيفڪيشن جا قسم',
    chooseImportantUpdates: 'اهم اپڊيٽس چونڊيو',
    enableBrowserPush: 'برائوزر پش فعال ڪريو',
    enableBrowserPushDescription: 'سڀني ويب پش قسمن لاءِ بنيادي سوئچ۔',
    membershipUpdates: 'ميمبرشپ اپڊيٽس',
    membershipUpdatesDescription: 'درخواست، ڪارڊ، ادائيگي ۽ پروفائل جا فيصلا۔',
    programUpdates: 'پروگرام اپڊيٽس',
    programUpdatesDescription: 'تعليم، صحت، فلاح ۽ روزگار جا ڪيس۔',
    financeUpdates: 'مالي اپڊيٽس',
    financeUpdatesDescription: 'عطين ۽ مالي اسٽيٽس سان لاڳاپيل اطلاع۔',
    generalAnnouncements: 'عام اعلان',
    generalAnnouncementsDescription: 'تنظيمي نوٽيس ۽ عام مهمون۔',
    savePreferences: 'ترجيحات محفوظ ڪريو',
    savedDevices: 'محفوظ ڊوائيس',
    browserSubscriptions: 'برائوزر سبسڪرپشنون',
    endpointsHidden: 'اينڊ پوائنٽس ۽ انڪرپشن ڪيز ڪڏهن به مڪمل طور نه ڏيکاريون وينديون۔',
    disableAllDevices: 'سڀ ڊوائيس غير فعال ڪريو',
    enabled: 'فعال',
    disabled: 'غير فعال',
    failures: 'ناڪاميون',
    lastSeen: 'آخري ڀيرو ڏٺو',
    lastSuccess: 'آخري ڪاميابي',
    lastFailure: 'آخري ناڪامي',
    noDevices: 'اڃا ڪو برائوزر ڊوائيس رجسٽر ٿيل ناهي۔',
    never: 'ڪڏهن به نه',
    unknown: 'نامعلوم',
    loginAgainSave: 'نوٽيفڪيشن ترجيحات محفوظ ڪرڻ کان اڳ ٻيهر لاگ اِن ڪريو۔',
    saved: 'نوٽيفڪيشن ترجيحات محفوظ ٿي ويون۔',
    vapidMissing: 'برائوزر نوٽيفڪيشن ڪنفيگريشن اڃا دستياب ناهي۔',
    productionOnly: 'برائوزر پش رجسٽريشن صرف پروڊڪشن HTTPS ايپ تي دستياب آهي۔',
    unsupportedSecurePush: 'هي برائوزر محفوظ ويب پش نوٽيفڪيشنن کي سپورٽ نٿو ڪري۔',
    permissionBlocked: 'برائوزر نوٽيفڪيشن اجازت روڪيل آهي۔ برائوزر سائيٽ سيٽنگن مان فعال ڪريو۔',
    permissionNotGranted: 'نوٽيفڪيشن اجازت نه ملي۔',
    loginAgainEnable: 'برائوزر نوٽيفڪيشنون فعال ڪرڻ کان اڳ ٻيهر لاگ اِن ڪريو۔',
    incompleteSubscription: 'برائوزر مڪمل پش سبسڪرپشن واپس نه ڪئي۔',
    enabledForDevice: 'هن ڊوائيس لاءِ برائوزر نوٽيفڪيشنون فعال ٿي ويون۔',
    unableEnable: 'برائوزر نوٽيفڪيشنون فعال نه ٿي سگهيون۔',
    browserNotSubscribed: 'هي برائوزر هن وقت سبسڪرائب ٿيل ناهي۔',
    browserRemoved: 'هي برائوزر پش نوٽيفڪيشنن مان هٽايو ويو۔',
    unableRemove: 'هن برائوزر جي سبسڪرپشن هٽائي نه سگهي۔',
    loginAgainDisable: 'ڊوائيس غير فعال ڪرڻ کان اڳ ٻيهر لاگ اِن ڪريو۔',
    allDevicesDisabled: 'ويب پش روڪيو ويو ۽ سڀ محفوظ برائوزر ڊوائيس غير فعال ڪيا ويا۔',
    migrationRequired: 'نوٽيفڪيشن ترجيحات استعمال ڪرڻ کان اڳ 20260711010000_web_push_reliability_preferences.sql مائيگريشن لاڳو ڪريو۔',
  },
  pwa: {
    updateConfirm: 'JAS هاڻي اپڊيٽ ڪريو؟ پهرين اڻپورو فارم محفوظ ڪريو۔ صفحو ٻيهر لوڊ ٿيندو۔',
    updateTimeout: 'اپڊيٽ مڪمل نه ٿيو۔ ڪنيڪشن موجود هجي ته ٻيهر ڪوشش ڪريو۔',
    updateStartFailed: 'اپڊيٽ شروع نه ٿي سگهيو۔ ٻيهر ڪوشش ڪريو۔',
    pushNotConfigured: 'پش نوٽيفڪيشنون اڃا ڪنفيگر ٿيل ناهن۔',
    pushUnsupported: 'هي برائوزر ويب پش نوٽيفڪيشنن کي سپورٽ نٿو ڪري۔',
    pushLoginFirst: 'ميمبر نوٽيفڪيشنون فعال ڪرڻ لاءِ پهرين لاگ اِن ڪريو۔',
    pushPermissionDenied: 'نوٽيفڪيشن اجازت نه ملي۔',
    pushLoginAgain: 'نوٽيفڪيشنون فعال ڪرڻ لاءِ ٻيهر لاگ اِن ڪريو۔',
    pushIncomplete: 'برائوزر مڪمل پش سبسڪرپشن واپس نه ڪئي۔',
    pushEnabled: 'برائوزر نوٽيفڪيشنون فعال ٿي ويون۔',
    pushEnableFailed: 'برائوزر نوٽيفڪيشنون فعال نه ٿي سگهيون۔',
    updateEyebrow: 'JAS ايپ اپڊيٽ',
    updating: 'اپڊيٽ ٿي رهيو آهي…',
    updateAvailable: 'نئون ورزن دستياب آهي',
    updateDescription: 'اڻپورو ڪم محفوظ ڪريو، پوءِ هاڻي اپڊيٽ ڪريو چونڊيو۔ بعد ۾ چونڊي موجوده ورزن استعمال ڪندا رهو۔',
    updateNow: 'هاڻي اپڊيٽ ڪريو',
    later: 'بعد ۾',
    installEyebrow: 'JAS ايپ انسٽال ڪريو',
    installTitle: 'JAS ايپ انسٽال ڪريو',
    installDescription: 'ميمبرشپ، ڊجيٽل ڪارڊ، اپڊيٽس ۽ ايڊمن اوزارن تائين تيز رسائي لاءِ JAS ميمبر پورٽل انسٽال ڪريو۔',
    opening: 'کلي رهيو آهي…',
    installAction: 'JAS ايپ انسٽال ڪريو',
    notNow: 'هاڻي نه',
    pushEyebrow: 'JAS نوٽيفڪيشنون',
    pushTitle: 'برائوزر نوٽيفڪيشنون فعال ڪريو',
    pushDescription: 'ميمبرشپ منظوري، ادائيگي ۽ اهم اپڊيٽ الرٽ حاصل ڪريو، ڀلي JAS ايپ انسٽال هجي يا پس منظر ۾ هلي رهي هجي۔',
    enabling: 'فعال ٿي رهيو آهي…',
    enableNotifications: 'نوٽيفڪيشنون فعال ڪريو',
  },
}

export const mobileUxCopy: Record<AppLanguage, MobileUxCopy> = { en, ur, sd }
