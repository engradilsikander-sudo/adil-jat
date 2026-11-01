// src/lib/public-page-i18n.ts
import { useI18n, type AppLanguage } from './i18n'
import type { CmsPageSlug } from './cms'

type TextDirection = 'ltr' | 'rtl'

type CmsFallbackCopy = {
  eyebrow: string
  title: string
  subtitle: string
  content: string
}

const cmsFallbacks: Record<AppLanguage, Record<CmsPageSlug, CmsFallbackCopy>> = {
  en: {
    about: {
      eyebrow: 'About JAS',
      title: 'About Jatt Alliance Sindh',
      subtitle:
        'A non-political, welfare-focused and member-verified community platform for Jatt families across Sindh.',
      content:
        'Jatt Alliance Sindh (JAS) is a community welfare platform created to organize membership, education support, health assistance, welfare cases, employment support, donations and verified public service records.\n\nThe organization is designed to work through transparent membership verification, responsible admin review, district/taluka coordination and digital records.\n\nThis page can be updated from the Admin CMS panel.',
    },
    'vision-mission': {
      eyebrow: 'Vision & Mission',
      title: 'Vision and Mission',
      subtitle:
        'To build an organized, educated, self-reliant and service-oriented Jatt community across Sindh.',
      content:
        'Vision:\nTo make the Jatt community living across Sindh educationally, economically, socially, morally and organizationally strong, dignified, self-reliant and united.\n\nMission:\nTo establish an organized system of membership, education, health, employment, welfare, donations and mutual cooperation for deserving and talented members of the community.\n\nThis page can be updated from the Admin CMS panel.',
    },
    manifesto: {
      eyebrow: 'Manifesto / Manshoor',
      title: 'Manifesto / Manshoor',
      subtitle:
        'The guiding principles and public commitment of Jatt Alliance Sindh.',
      content:
        'Jatt Alliance Sindh works for education, health, employment, welfare, social support, representation, unity, dignity and service.\n\nCore manifesto points include:\n- Education support and scholarships\n- Health assistance and emergency help\n- Employment and skills support\n- Welfare cases for deserving families\n- Transparent donations and finance records\n- Community unity and verified membership\n\nThis page can be updated from the Admin CMS panel.',
    },
    constitution: {
      eyebrow: 'Constitution',
      title: 'JAS Constitution',
      subtitle:
        'The constitutional structure, roles, responsibilities and organizational rules of JAS.',
      content:
        'The constitution defines JAS membership, organizational structure, Central Executive Committee, Central Advisory Committee, provincial, divisional, district and taluka units, duties of office bearers, program management, finance rules, discipline, records and reporting.\n\nCurrent hierarchy:\nCEC → Advisory → Provincial → Divisional → District → Taluka\n\nThis page can be updated from the Admin CMS panel.',
    },
    cwc: {
      eyebrow: 'Central Working Committee',
      title: 'Central Working Committee',
      subtitle:
        'The top-level governing and executive body responsible for day-to-day decisions and policy implementation.',
      content:
        'The Central Working Committee (CWC) is the top-level governing and executive body of Jatt Alliance Sindh.\n\nCentral Cabinet designations include:\n- Chairman\n- Senior Vice Chairman\n- Vice Chairman\n- General Secretary\n- Information Secretary\n\nAdditional committees, wings and advisory boards may be created as needed.\n\nThis page can be updated from the Admin CMS panel.',
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Contact Jatt Alliance Sindh',
      subtitle:
        'For membership, program support, donations, verification and committee coordination.',
      content:
        'Contact information can be updated from the Admin CMS panel.\n\nSuggested fields:\n- WhatsApp number\n- Office address\n- Email\n- District coordination contacts\n- Donation account information\n- Social media links',
    },
  },
  ur: {
    about: {
      eyebrow: 'جے اے ایس کے بارے میں',
      title: 'جٹ الائنس سندھ کا تعارف',
      subtitle:
        'سندھ بھر کے جٹ خاندانوں کے لیے غیر سیاسی، فلاحی اور ممبرشپ سے تصدیق شدہ کمیونٹی پلیٹ فارم۔',
      content:
        'جٹ الائنس سندھ (JAS) ایک کمیونٹی فلاحی پلیٹ فارم ہے جو ممبرشپ، تعلیم، صحت، ویلفیئر کیسز، روزگار، عطیات اور تصدیق شدہ عوامی ریکارڈ کو منظم کرنے کے لیے بنایا گیا ہے۔\n\nتنظیم شفاف ممبرشپ تصدیق، ذمہ دار ایڈمن جائزہ، ڈویژن، ضلع اور تعلقہ سطح کی کوآرڈینیشن اور ڈیجیٹل ریکارڈ کے ذریعے کام کرے گی۔\n\nیہ صفحہ Admin CMS Panel سے اپڈیٹ کیا جا سکتا ہے۔',
    },
    'vision-mission': {
      eyebrow: 'وژن اور مشن',
      title: 'وژن اور مشن',
      subtitle:
        'سندھ بھر کی جٹ برادری کو منظم، تعلیم یافتہ، خود کفیل اور خدمت گزار بنانا۔',
      content:
        'وژن:\nسندھ میں آباد جٹ برادری کو تعلیمی، معاشی، سماجی، اخلاقی اور تنظیمی طور پر مضبوط، باوقار، خود کفیل اور متحد بنانا۔\n\nمشن:\nمستحق اور باصلاحیت ممبران کے لیے ممبرشپ، تعلیم، صحت، روزگار، ویلفیئر، عطیات اور باہمی تعاون کا منظم نظام قائم کرنا۔\n\nیہ صفحہ Admin CMS Panel سے اپڈیٹ کیا جا سکتا ہے۔',
    },
    manifesto: {
      eyebrow: 'منشور',
      title: 'منشور / Manshoor',
      subtitle:
        'جٹ الائنس سندھ کے رہنما اصول اور عوامی عہد۔',
      content:
        'جٹ الائنس سندھ تعلیم، صحت، روزگار، ویلفیئر، سماجی مدد، نمائندگی، اتحاد، وقار اور خدمت کے لیے کام کرے گی۔\n\nمنشور کے اہم نکات:\n- تعلیم سپورٹ اور اسکالرشپس\n- صحت مدد اور ایمرجنسی سپورٹ\n- روزگار اور اسکلز سپورٹ\n- مستحق خاندانوں کے لیے ویلفیئر کیسز\n- شفاف عطیات اور مالی ریکارڈ\n- کمیونٹی اتحاد اور تصدیق شدہ ممبرشپ\n\nیہ صفحہ Admin CMS Panel سے اپڈیٹ کیا جا سکتا ہے۔',
    },
    constitution: {
      eyebrow: 'آئین',
      title: 'جے اے ایس آئین',
      subtitle:
        'جے اے ایس کا آئینی ڈھانچہ، عہدے، ذمہ داریاں اور تنظیمی قواعد۔',
      content:
        'آئین میں جے اے ایس ممبرشپ، تنظیمی ڈھانچہ، مرکزی ورکنگ کمیٹی، ڈویژن، ضلع اور تعلقہ یونٹس، عہدیداران کی ذمہ داریاں، پروگرام مینجمنٹ، مالیاتی قواعد، نظم و ضبط، ریکارڈ اور رپورٹنگ شامل ہیں۔\n\nموجودہ درجہ بندی:\nمرکز / Markaz → ڈویژن → ضلع → تعلقہ\n\nیہ صفحہ Admin CMS Panel سے اپڈیٹ کیا جا سکتا ہے۔',
    },
    cwc: {
      eyebrow: 'مرکزی ورکنگ کمیٹی',
      title: 'مرکزی ورکنگ کمیٹی',
      subtitle:
        'روزمرہ فیصلوں اور پالیسی عملدرآمد کی ذمہ دار اعلیٰ سطحی گورننگ اور ایگزیکٹو باڈی۔',
      content:
        'مرکزی ورکنگ کمیٹی (CWC) جٹ الائنس سندھ کی اعلیٰ سطحی گورننگ اور ایگزیکٹو باڈی ہے۔\n\nمرکزی کابینہ کے عہدے:\n- چیئرمین\n- سینئر وائس چیئرمین\n- وائس چیئرمین\n- جنرل سیکریٹری\n- انفارمیشن سیکریٹری\n\nضرورت کے مطابق اضافی کمیٹیاں، ونگز اور ایڈوائزری بورڈز بنائے جا سکتے ہیں۔\n\nیہ صفحہ Admin CMS Panel سے اپڈیٹ کیا جا سکتا ہے۔',
    },
    contact: {
      eyebrow: 'رابطہ',
      title: 'جٹ الائنس سندھ سے رابطہ',
      subtitle:
        'ممبرشپ، پروگرام سپورٹ، عطیات، تصدیق اور کمیٹی کوآرڈینیشن کے لیے۔',
      content:
        'رابطہ معلومات Admin CMS Panel سے اپڈیٹ کی جا سکتی ہیں۔\n\nتجویز کردہ فیلڈز:\n- واٹس ایپ نمبر\n- دفتر کا پتہ\n- ای میل\n- ضلعی رابطہ نمبرز\n- عطیات اکاؤنٹ معلومات\n- سوشل میڈیا لنکس',
    },
  },
  sd: {
    about: {
      eyebrow: 'JAS بابت',
      title: 'جٽ الائنس سنڌ جو تعارف',
      subtitle:
        'سنڌ جي جٽ خاندانن لاءِ غير سياسي، فلاحي ۽ ميمبرشپ تصديق ٿيل ڪميونٽي پليٽ فارم.',
      content:
        'جٽ الائنس سنڌ (JAS) هڪ ڪميونٽي فلاحي پليٽ فارم آهي، جيڪو ميمبرشپ، تعليم، صحت، ويلفيئر ڪيسز، روزگار، عطيا ۽ تصديق ٿيل عوامي رڪارڊ کي منظم ڪرڻ لاءِ ٺاهيو ويو آهي۔\n\nتنظيم شفاف ميمبرشپ تصديق، ذميوار ايڊمن جائزي، ڊويزن، ضلع ۽ تعلقي سطح جي ڪوآرڊينيشن ۽ ڊجيٽل رڪارڊ ذريعي ڪم ڪندي۔\n\nهي صفحو Admin CMS Panel مان اپڊيٽ ڪري سگهجي ٿو.',
    },
    'vision-mission': {
      eyebrow: 'وژن ۽ مشن',
      title: 'وژن ۽ مشن',
      subtitle:
        'سنڌ جي جٽ برادري کي منظم، تعليم يافته، خود ڪفيل ۽ خدمتگار بنائڻ.',
      content:
        'وژن:\nسنڌ ۾ رهندڙ جٽ برادري کي تعليمي، معاشي، سماجي، اخلاقي ۽ تنظيمي طور مضبوط، باوقار، خود ڪفيل ۽ متحد بنائڻ۔\n\nمشن:\nمستحق ۽ باصلاحيت ميمبرن لاءِ ميمبرشپ، تعليم، صحت، روزگار، ويلفيئر، عطيا ۽ باهمي تعاون جو منظم نظام قائم ڪرڻ۔\n\nهي صفحو Admin CMS Panel مان اپڊيٽ ڪري سگهجي ٿو.',
    },
    manifesto: {
      eyebrow: 'منشور',
      title: 'منشور / Manshoor',
      subtitle:
        'جٽ الائنس سنڌ جا رهنما اصول ۽ عوامي عزم.',
      content:
        'جٽ الائنس سنڌ تعليم، صحت، روزگار، ويلفيئر، سماجي مدد، نمائندگي، اتحاد، وقار ۽ خدمت لاءِ ڪم ڪندي۔\n\nمنشور جا اهم نڪتا:\n- تعليم سپورٽ ۽ اسڪالرشپس\n- صحت مدد ۽ ايمرجنسي سپورٽ\n- روزگار ۽ مهارتن جي سپورٽ\n- مستحق خاندانن لاءِ ويلفيئر ڪيسز\n- شفاف عطيا ۽ مالي رڪارڊ\n- ڪميونٽي اتحاد ۽ تصديق ٿيل ميمبرشپ\n\nهي صفحو Admin CMS Panel مان اپڊيٽ ڪري سگهجي ٿو.',
    },
    constitution: {
      eyebrow: 'آئين',
      title: 'JAS آئين',
      subtitle:
        'JAS جو آئيني ڍانچو، عهدا، ذميواريون ۽ تنظيمي قاعدا.',
      content:
        'آئين ۾ JAS ميمبرشپ، تنظيمي ڍانچو، مرڪزي ورڪنگ ڪميٽي، ڊويزن، ضلع ۽ تعلقه يونٽس، عهديدارن جون ذميواريون، پروگرام مينيجمينٽ، مالي قاعدا، نظم و ضبط، رڪارڊ ۽ رپورٽنگ شامل آهن۔\n\nموجوده درجا بندي:\nمرڪز / Markaz → ڊويزن → ضلعو → تعلقو\n\nهي صفحو Admin CMS Panel مان اپڊيٽ ڪري سگهجي ٿو.',
    },
    cwc: {
      eyebrow: 'مرڪزي ورڪنگ ڪميٽي',
      title: 'مرڪزي ورڪنگ ڪميٽي',
      subtitle:
        'روزاني فيصلا ۽ پاليسي عملدرآمد لاءِ اعليٰ سطح جي گورننگ ۽ ايگزيڪيوٽو باڊي.',
      content:
        'مرڪزي ورڪنگ ڪميٽي (CWC) جٽ الائنس سنڌ جي اعليٰ سطح جي گورننگ ۽ ايگزيڪيوٽو باڊي آهي۔\n\nمرڪزي ڪابينا جا عهدا:\n- چيئرمين\n- سينئر وائس چيئرمين\n- وائس چيئرمين\n- جنرل سيڪريٽري\n- انفارميشن سيڪريٽري\n\nضرورت مطابق اضافي ڪميٽيون، ونگز ۽ ايڊوائزري بورڊز ٺاهي سگهجن ٿا۔\n\nهي صفحو Admin CMS Panel مان اپڊيٽ ڪري سگهجي ٿو.',
    },
    contact: {
      eyebrow: 'رابطو',
      title: 'جٽ الائنس سنڌ سان رابطو',
      subtitle:
        'ميمبرشپ، پروگرام سپورٽ، عطيا، تصديق ۽ ڪميٽي ڪوآرڊينيشن لاءِ.',
      content:
        'رابطي جي معلومات Admin CMS Panel مان اپڊيٽ ڪري سگهجي ٿي۔\n\nتجويز ڪيل فيلڊز:\n- واٽس ايپ نمبر\n- آفيس ايڊريس\n- اي ميل\n- ضلعي رابطا\n- عطيا اڪائونٽ معلومات\n- سوشل ميڊيا لنڪس',
    },
  },
}


export function getPublicCmsFallback(slug: CmsPageSlug, language: AppLanguage) {
  return cmsFallbacks[language]?.[slug] ?? cmsFallbacks.en[slug]
}

const sharedCopy = {
  en: {
    becomeMember: 'Become a Member',
    donate: 'Donate',
    contact: 'Contact',
    officialContent: 'Official JAS Content',
    cmsManaged:
      'These organization pages are managed from the CMS so future updates can be published without changing code.',
    loading: 'Loading...',
    publishedFromCms: 'Published from CMS',
    fallbackContent: 'Fallback content',
    membership: 'Membership',
    membershipText: 'Join JAS as a verified member.',
    programs: 'Programs',
    programsText: 'Explore education, health, welfare and employment support.',
    donors: 'Donors',
    donorsText: 'View member-only donor leaderboard.',
    search: 'Search',
    allCategories: 'All categories',
    viewDetails: 'View Details',
    open: 'Open',
  },
  ur: {
    becomeMember: 'ممبر بنیں',
    donate: 'عطیہ دیں',
    contact: 'رابطہ',
    officialContent: 'سرکاری JAS مواد',
    cmsManaged:
      'یہ تنظیمی صفحات CMS سے مینج ہوتے ہیں تاکہ آئندہ اپڈیٹس کوڈ تبدیل کیے بغیر شائع کی جا سکیں۔',
    loading: 'لوڈ ہو رہا ہے...',
    publishedFromCms: 'CMS سے شائع شدہ',
    fallbackContent: 'فال بیک مواد',
    membership: 'ممبرشپ',
    membershipText: 'تصدیق شدہ ممبر کے طور پر JAS میں شامل ہوں۔',
    programs: 'پروگرامز',
    programsText: 'تعلیم، صحت، ویلفیئر اور روزگار سپورٹ دیکھیں۔',
    donors: 'ڈونرز',
    donorsText: 'صرف ممبرز کے لیے ڈونر لیڈر بورڈ دیکھیں۔',
    search: 'تلاش',
    allCategories: 'تمام کیٹیگریز',
    viewDetails: 'تفصیل دیکھیں',
    open: 'کھولیں',
  },
  sd: {
    becomeMember: 'ميمبر ٿيو',
    donate: 'عطيو ڏيو',
    contact: 'رابطو',
    officialContent: 'سرڪاري JAS مواد',
    cmsManaged:
      'هي تنظيمي صفحا CMS مان منظم ٿين ٿا ته جيئن ايندڙ اپڊيٽس ڪوڊ تبديل ڪرڻ کانسواءِ شايع ٿي سگهن۔',
    loading: 'لوڊ ٿي رهيو آهي...',
    publishedFromCms: 'CMS مان شايع ٿيل',
    fallbackContent: 'فال بيڪ مواد',
    membership: 'ميمبرشپ',
    membershipText: 'تصديق ٿيل ميمبر طور JAS ۾ شامل ٿيو۔',
    programs: 'پروگرام',
    programsText: 'تعليم، صحت، ويلفيئر ۽ روزگار سپورٽ ڏسو۔',
    donors: 'ڊونرز',
    donorsText: 'صرف ميمبرن لاءِ ڊونر ليڊر بورڊ ڏسو۔',
    search: 'ڳولا',
    allCategories: 'سڀ ڪيٽيگريون',
    viewDetails: 'تفصيل ڏسو',
    open: 'کوليو',
  },
} as const

const committeesCopy = {
  en: {
    eyebrow: 'Organization Structure',
    title: 'Public Committees',
    description:
      'Publicly displayed Central Executive, Central Advisory, Provincial, Divisional, District and Taluka committees of Jatt Alliance Sindh with official office bearers and tenure details.',
    hierarchy: 'CEC → Advisory → Provincial → Divisional → District → Taluka',
    hierarchyText:
      'Only committees marked for public display are shown here. Internal or draft committee records remain restricted to administrators.',
    publicCommittees: 'Public Committees',
    central: 'CEC',
    centralAdvisory: 'Advisory',
    provincial: 'Provincial',
    divisional: 'Divisional',
    district: 'District',
    taluka: 'Taluka',
    officeBearers: 'Office Bearers',
    searchPlaceholder: 'Search committee, division, district, taluka...',
    allCommittees: 'All committees',
    loading: 'Loading public committees...',
    empty: 'No public committees found.',
    viewCommittee: 'View Committee',
    officeBearerSingular: 'office bearer',
    officeBearerPlural: 'office bearers',
    backToCommittees: 'Back to Committees',
    officialRecord:
      'Official public record of Jatt Alliance Sindh office bearers for this committee.',
    publicOfficeBearers: 'Public office bearers',
    activeOfficeBearers: 'active office bearers currently listed for this committee.',
    noOfficeBearers: 'No public office bearers have been assigned yet.',
    listed: 'listed',
    members: 'Members',
    father: 'Father',
    memberId: 'Member ID',
    location: 'Location',
    tenure: 'Tenure',
    notDisclosed: 'Not disclosed',
    sindh: 'Sindh',
  },
  ur: {
    eyebrow: 'تنظیمی ڈھانچہ',
    title: 'عوامی کمیٹیاں',
    description:
      'جٹ الائنس سندھ کی مرکزی ایگزیکٹو، مرکزی مشاورتی، صوبائی، ڈویژنل، ضلعی اور تعلقہ کمیٹیاں، سرکاری عہدیداران اور مدت کی تفصیل کے ساتھ۔',
    hierarchy: 'CEC → Advisory → صوبہ → ڈویژن → ضلع → تعلقہ',
    hierarchyText:
      'صرف public display والی کمیٹیاں یہاں نظر آئیں گی۔ اندرونی یا draft کمیٹی ریکارڈ صرف ایڈمنز تک محدود رہیں گے۔',
    publicCommittees: 'عوامی کمیٹیاں',
    central: 'CEC',
    centralAdvisory: 'مشاورتی',
    provincial: 'صوبائی',
    divisional: 'ڈویژنل',
    district: 'ضلعی',
    taluka: 'تعلقہ',
    officeBearers: 'عہدیداران',
    searchPlaceholder: 'کمیٹی، ڈویژن، ضلع، تعلقہ تلاش کریں...',
    allCommittees: 'تمام کمیٹیاں',
    loading: 'عوامی کمیٹیاں لوڈ ہو رہی ہیں...',
    empty: 'کوئی عوامی کمیٹی نہیں ملی۔',
    viewCommittee: 'کمیٹی دیکھیں',
    officeBearerSingular: 'عہدیدار',
    officeBearerPlural: 'عہدیداران',
    backToCommittees: 'کمیٹیوں پر واپس',
    officialRecord:
      'اس کمیٹی کے لیے جٹ الائنس سندھ کے عہدیداران کا سرکاری عوامی ریکارڈ۔',
    publicOfficeBearers: 'عوامی عہدیداران',
    activeOfficeBearers: 'فعال عہدیداران اس کمیٹی میں درج ہیں۔',
    noOfficeBearers: 'ابھی کوئی عوامی عہدیدار اسائن نہیں کیا گیا۔',
    listed: 'درج',
    members: 'ممبران',
    father: 'والد',
    memberId: 'ممبر آئی ڈی',
    location: 'مقام',
    tenure: 'مدت',
    notDisclosed: 'ظاہر نہیں کیا گیا',
    sindh: 'سندھ',
  },
  sd: {
    eyebrow: 'تنظيمي ڍانچو',
    title: 'عوامي ڪميٽيون',
    description:
      'جٽ الائنس سنڌ جون مرڪزي ايگزيڪيوٽو، مرڪزي مشاورتي، صوبائي، ڊويزنل، ضلعي ۽ تعلقي ڪميٽيون، سرڪاري عهديدارن ۽ مدت جي تفصيل سان۔',
    hierarchy: 'CEC → Advisory → صوبو → ڊويزن → ضلعو → تعلقو',
    hierarchyText:
      'صرف public display واريون ڪميٽيون هتي نظر اينديون. اندروني يا draft ڪميٽي رڪارڊ صرف ايڊمن تائين محدود رهندا۔',
    publicCommittees: 'عوامي ڪميٽيون',
    central: 'CEC',
    centralAdvisory: 'مشاورتي',
    provincial: 'صوبائي',
    divisional: 'ڊويزنل',
    district: 'ضلعي',
    taluka: 'تعلقو',
    officeBearers: 'عهديدار',
    searchPlaceholder: 'ڪميٽي، ڊويزن، ضلعو، تعلقو ڳوليو...',
    allCommittees: 'سڀ ڪميٽيون',
    loading: 'عوامي ڪميٽيون لوڊ ٿي رهيون آهن...',
    empty: 'ڪا عوامي ڪميٽي نه ملي.',
    viewCommittee: 'ڪميٽي ڏسو',
    officeBearerSingular: 'عهديدار',
    officeBearerPlural: 'عهديدار',
    backToCommittees: 'ڪميٽين ڏانهن واپس',
    officialRecord:
      'هن ڪميٽي لاءِ جٽ الائنس سنڌ جي عهديدارن جو سرڪاري عوامي رڪارڊ.',
    publicOfficeBearers: 'عوامي عهديدار',
    activeOfficeBearers: 'فعال عهديدار هن ڪميٽي ۾ درج آهن.',
    noOfficeBearers: 'اڃا ڪو عوامي عهديدار اسائن نه ٿيو.',
    listed: 'درج',
    members: 'ميمبر',
    father: 'والد',
    memberId: 'ميمبر آءِ ڊي',
    location: 'جڳهه',
    tenure: 'مدت',
    notDisclosed: 'ظاهر نه ڪيو ويو',
    sindh: 'سنڌ',
  },
} as const

const mediaCopy = {
  en: {
    newsEyebrow: 'News & Updates',
    newsTitle: 'Latest announcements and community updates',
    newsDescription:
      'Published updates from Jatt Alliance Sindh, including general announcements, program news, events and community activity.',
    newsSearch: 'Search news, announcements, programs...',
    loadingNews: 'Loading published news...',
    emptyNews: 'No published news found.',
    featured: 'Featured',
    readMore: 'Read More',
    eventsEyebrow: 'Events',
    eventsTitle: 'Upcoming and published JAS events',
    eventsDescription:
      'Public event notices, meetings, community sessions and program activity dates.',
    loadingEvents: 'Loading events...',
    emptyEvents: 'No published events found.',
    galleryEyebrow: 'Gallery',
    galleryTitle: 'JAS events and community activity gallery',
    galleryDescription:
      'Published photos from JAS meetings, programs, welfare activities, education support, health assistance and community events.',
    loadingGallery: 'Loading gallery...',
    emptyGallery: 'No published gallery items found.',
  },
  ur: {
    newsEyebrow: 'خبریں اور اپڈیٹس',
    newsTitle: 'تازہ اعلانات اور کمیونٹی اپڈیٹس',
    newsDescription:
      'جٹ الائنس سندھ کی شائع شدہ اپڈیٹس، جن میں عام اعلانات، پروگرام نیوز، ایونٹس اور کمیونٹی سرگرمیاں شامل ہیں۔',
    newsSearch: 'خبریں، اعلانات، پروگرامز تلاش کریں...',
    loadingNews: 'شائع شدہ خبریں لوڈ ہو رہی ہیں...',
    emptyNews: 'کوئی شائع شدہ خبر نہیں ملی۔',
    featured: 'نمایاں',
    readMore: 'مزید پڑھیں',
    eventsEyebrow: 'ایونٹس',
    eventsTitle: 'آنے والے اور شائع شدہ JAS ایونٹس',
    eventsDescription:
      'عوامی ایونٹ نوٹس، میٹنگز، کمیونٹی سیشنز اور پروگرام سرگرمیوں کی تاریخیں۔',
    loadingEvents: 'ایونٹس لوڈ ہو رہے ہیں...',
    emptyEvents: 'کوئی شائع شدہ ایونٹ نہیں ملا۔',
    galleryEyebrow: 'گیلری',
    galleryTitle: 'JAS ایونٹس اور کمیونٹی سرگرمیوں کی گیلری',
    galleryDescription:
      'JAS میٹنگز، پروگرامز، ویلفیئر سرگرمیوں، تعلیمی سپورٹ، صحت مدد اور کمیونٹی ایونٹس کی شائع شدہ تصاویر۔',
    loadingGallery: 'گیلری لوڈ ہو رہی ہے...',
    emptyGallery: 'کوئی شائع شدہ گیلری آئٹم نہیں ملا۔',
  },
  sd: {
    newsEyebrow: 'خبرون ۽ اپڊيٽس',
    newsTitle: 'تازا اعلان ۽ ڪميونٽي اپڊيٽس',
    newsDescription:
      'جٽ الائنس سنڌ جون شايع ٿيل اپڊيٽس، جن ۾ عام اعلان، پروگرام خبرون، ايونٽس ۽ ڪميونٽي سرگرميون شامل آهن۔',
    newsSearch: 'خبرون، اعلان، پروگرام ڳوليو...',
    loadingNews: 'شايع ٿيل خبرون لوڊ ٿي رهيون آهن...',
    emptyNews: 'ڪا شايع ٿيل خبر نه ملي.',
    featured: 'نمايان',
    readMore: 'وڌيڪ پڙهو',
    eventsEyebrow: 'ايونٽس',
    eventsTitle: 'ايندڙ ۽ شايع ٿيل JAS ايونٽس',
    eventsDescription:
      'عوامي ايونٽ نوٽس، ميٽنگون، ڪميونٽي سيشن ۽ پروگرام سرگرمين جون تاريخون۔',
    loadingEvents: 'ايونٽس لوڊ ٿي رهيا آهن...',
    emptyEvents: 'ڪو شايع ٿيل ايونٽ نه مليو.',
    galleryEyebrow: 'گيلري',
    galleryTitle: 'JAS ايونٽس ۽ ڪميونٽي سرگرمين جي گيلري',
    galleryDescription:
      'JAS ميٽنگن، پروگرامن، ويلفيئر سرگرمين، تعليمي سپورٽ، صحت مدد ۽ ڪميونٽي ايونٽس جون شايع ٿيل تصويرون۔',
    loadingGallery: 'گيلري لوڊ ٿي رهي آهي...',
    emptyGallery: 'ڪا شايع ٿيل گيلري آئٽم نه ملي.',
  },
} as const

export function usePublicPageCopy() {
  const { language } = useI18n()
  const textDir: TextDirection = language === 'en' ? 'ltr' : 'rtl'
  const isRtl = textDir === 'rtl'

  return {
    language,
    isRtl,
    textDir,
    textAlignClass: isRtl ? 'text-right' : 'text-left',
    arrowClass: isRtl ? 'mr-2 rotate-180' : 'ml-2',
    iconBeforeClass: isRtl ? 'ml-2' : 'mr-2',
    cms: cmsFallbacks[language],
    shared: sharedCopy[language],
    committees: committeesCopy[language],
    media: mediaCopy[language],
  }
}

export function getLocalizedCommitteeTypeLabel(
  type: string,
  labels: ReturnType<typeof usePublicPageCopy>['committees'],
) {
  if (type === 'central') return labels.central
  if (type === 'central_advisory') return labels.centralAdvisory
  if (type === 'provincial') return labels.provincial
  if (type === 'divisional') return labels.divisional
  if (type === 'district') return labels.district
  if (type === 'taluka') return labels.taluka

  return type
}
