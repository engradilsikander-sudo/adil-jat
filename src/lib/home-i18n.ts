// src/lib/home-i18n.ts
import { useI18n, type AppLanguage } from './i18n'

type TextDirection = 'ltr' | 'rtl'

const homeCopy = {
  en: {
    portalBadge: 'Official Membership Portal',
    brandLine: 'Jatt Alliance Sindh · JAS',
    heroTitleLine1: 'Member Portal',
    heroTitleLine2: 'for JAS',
    heroDescription:
      'A focused digital system for JAS membership registration, manual payment receipt verification, admin approval, QR-based digital cards and member-linked support programs.',
    actions: {
      apply: 'Apply for Membership',
      viewPrograms: 'View Programs',
      donate: 'Donate',
      open: 'Open',
    },
    portalStats: [
      { label: 'Core Focus', value: 'Membership Portal' },
      { label: 'Verification', value: 'QR Digital Card' },
      { label: 'Applications', value: 'Member Programs' },
      { label: 'Payments', value: 'Manual Review' },
    ],
    membershipFlow: {
      eyebrow: 'Membership Flow',
      titleLine1: 'Membership process,',
      titleLine2: 'simple and verified',
      description:
        'The landing page now focuses on the actual portal flow: application, payment receipt, review, approval and QR card access.',
      steps: [
        {
          title: 'Create Account',
          text: 'Signup first so every membership application stays connected to a verified user account.',
        },
        {
          title: 'Submit Application',
          text: 'Fill member details, district, taluka, photo and required membership payment receipt.',
        },
        {
          title: 'Admin Review',
          text: 'Admin verifies profile, payment receipt and documents before approval.',
        },
        {
          title: 'Digital Card',
          text: 'Approved members receive a QR-based digital membership card and member dashboard.',
        },
      ],
    },
    programs: {
      eyebrow: 'Program Gateway',
      titleLine1: 'Member verified',
      titleLine2: 'support programs',
      description:
        'Program cards are now cleaned and status badges reflect the current portal rollout instead of marking every module as fully active.',
      membership: {
        title: 'Membership Portal',
        text: 'Register as a JAS member, track approval status and access your digital membership card.',
        badge: 'Active',
      },
      education: {
        title: 'Education Support',
        text: 'Apply for scholarship, fee support, books, exam fee, hostel, transport or skills support.',
        badge: 'Active',
      },
      health: {
        title: 'Health Assistance',
        text: 'Submit medical support cases with patient details, treatment information and documents.',
        badge: 'Active',
      },
      welfare: {
        title: 'Welfare Cases',
        text: 'Welfare requests remain connected with verified membership and admin review.',
        badge: 'Phase 2',
      },
      employment: {
        title: 'Employment Program',
        text: 'Job seekers can submit profile, skills and CV for future employment support review.',
        badge: 'Phase 2',
      },
      donation: {
        title: 'Donation Verification',
        text: 'Submit donation details for manual finance verification and donor record updates.',
        badge: 'Manual',
      },
    },
    features: {
      eyebrow: 'Portal Features',
      titleLine1: 'Digital tools',
      titleLine2: 'without duplicated content',
      description:
        'This section now lists only system features, not the same programs already shown in the program gateway.',
      qr: {
        title: 'QR Verification',
        text: 'Public verification page confirms approved membership through the member card QR code.',
      },
      admin: {
        title: 'Admin Approval',
        text: 'Membership applications and payment receipts are reviewed before card issuance.',
      },
      dashboard: {
        title: 'Member Dashboard',
        text: 'Members can track membership, programs, donations, updates and card access in one place.',
      },
    },
    preview: {
      cardSubtitle: 'Official verified membership card',
      verified: 'Verified',
      memberNo: 'Member No',
      memberName: 'Member Name',
      memberNameValue: 'Verified Member',
      status: 'Status',
      approved: 'Approved',
      district: 'District',
      sindh: 'Sindh',
      card: 'Card',
      qrVerified: 'QR Verified',
      access: 'Access',
      programs: 'Programs',
      qrText: 'Scan QR to verify approved membership.',
      footer: 'Digital ID is issued only after admin approval.',
      signup: 'Signup',
      review: 'Review',
      digitalCard: 'Digital Card',
    },
    finalCta: {
      badge: 'Member Verified Portal',
      titleLine1: 'Apply, get approved,',
      titleLine2: 'access member services',
      description:
        'Create your account, submit membership form, upload payment receipt and receive a verified digital member ID after admin approval.',
    },
  },
  ur: {
    portalBadge: 'آفیشل ممبرشپ پورٹل',
    brandLine: 'جٹ الائنس سندھ · JAS',
    heroTitleLine1: 'ممبر پورٹل',
    heroTitleLine2: 'JAS کے لیے',
    heroDescription:
      'JAS ممبرشپ رجسٹریشن، مینول پیمنٹ رسید ویریفکیشن، ایڈمن منظوری، QR ڈیجیٹل کارڈز اور ممبر سے منسلک سپورٹ پروگرامز کے لیے ایک فوکسڈ ڈیجیٹل سسٹم۔',
    actions: {
      apply: 'ممبرشپ کے لیے اپلائی کریں',
      viewPrograms: 'پروگرامز دیکھیں',
      donate: 'عطیہ دیں',
      open: 'کھولیں',
    },
    portalStats: [
      { label: 'بنیادی فوکس', value: 'ممبرشپ پورٹل' },
      { label: 'ویریفکیشن', value: 'QR ڈیجیٹل کارڈ' },
      { label: 'درخواستیں', value: 'ممبر پروگرامز' },
      { label: 'پیمنٹس', value: 'مینول ریویو' },
    ],
    membershipFlow: {
      eyebrow: 'ممبرشپ فلو',
      titleLine1: 'ممبرشپ عمل،',
      titleLine2: 'آسان اور تصدیق شدہ',
      description:
        'لینڈنگ پیج اب اصل پورٹل فلو پر فوکس کرتا ہے: درخواست، پیمنٹ رسید، ریویو، منظوری اور QR کارڈ رسائی۔',
      steps: [
        {
          title: 'اکاؤنٹ بنائیں',
          text: 'پہلے سائن اپ کریں تاکہ ہر ممبرشپ درخواست ایک تصدیق شدہ یوزر اکاؤنٹ سے منسلک رہے۔',
        },
        {
          title: 'درخواست جمع کریں',
          text: 'ممبر تفصیلات، ضلع، تعلقہ، تصویر اور ضروری ممبرشپ پیمنٹ رسید اپلوڈ کریں۔',
        },
        {
          title: 'ایڈمن ریویو',
          text: 'ایڈمن منظوری سے پہلے پروفائل، پیمنٹ رسید اور دستاویزات ویریفائی کرتا ہے۔',
        },
        {
          title: 'ڈیجیٹل کارڈ',
          text: 'منظور شدہ ممبرز کو QR ڈیجیٹل ممبرشپ کارڈ اور ممبر ڈیش بورڈ ملتا ہے۔',
        },
      ],
    },
    programs: {
      eyebrow: 'پروگرام گیٹ وے',
      titleLine1: 'ممبر ویریفائیڈ',
      titleLine2: 'سپورٹ پروگرامز',
      description:
        'پروگرام کارڈز اب صاف ہیں اور اسٹیٹس بیجز موجودہ پورٹل رول آؤٹ کے مطابق ہیں، ہر ماڈیول کو مکمل ایکٹو نہیں دکھایا گیا۔',
      membership: {
        title: 'ممبرشپ پورٹل',
        text: 'JAS ممبر کے طور پر رجسٹر ہوں، منظوری اسٹیٹس ٹریک کریں اور اپنا ڈیجیٹل ممبرشپ کارڈ حاصل کریں۔',
        badge: 'فعال',
      },
      education: {
        title: 'تعلیمی معاونت',
        text: 'اسکالرشپ، فیس سپورٹ، کتابیں، امتحانی فیس، ہاسٹل، ٹرانسپورٹ یا اسکلز سپورٹ کے لیے اپلائی کریں۔',
        badge: 'فعال',
      },
      health: {
        title: 'صحت معاونت',
        text: 'مریض کی تفصیلات، علاج کی معلومات اور دستاویزات کے ساتھ میڈیکل سپورٹ کیس جمع کریں۔',
        badge: 'فعال',
      },
      welfare: {
        title: 'فلاحی کیسز',
        text: 'فلاحی درخواستیں ویریفائیڈ ممبرشپ اور ایڈمن ریویو سے منسلک رہیں گی۔',
        badge: 'فیز 2',
      },
      employment: {
        title: 'روزگار پروگرام',
        text: 'جاب سیکرز مستقبل کے روزگار سپورٹ ریویو کے لیے پروفائل، اسکلز اور CV جمع کر سکیں گے۔',
        badge: 'فیز 2',
      },
      donation: {
        title: 'عطیہ ویریفکیشن',
        text: 'مینول فنانس ویریفکیشن اور ڈونر ریکارڈ اپڈیٹ کے لیے عطیہ تفصیلات جمع کریں۔',
        badge: 'مینول',
      },
    },
    features: {
      eyebrow: 'پورٹل فیچرز',
      titleLine1: 'ڈیجیٹل ٹولز',
      titleLine2: 'بغیر دہرائے ہوئے مواد کے',
      description:
        'یہ سیکشن اب صرف سسٹم فیچرز دکھاتا ہے، وہی پروگرام دوبارہ نہیں جو پروگرام گیٹ وے میں پہلے موجود ہیں۔',
      qr: {
        title: 'QR ویریفکیشن',
        text: 'پبلک ویریفکیشن پیج ممبر کارڈ QR کوڈ کے ذریعے منظور شدہ ممبرشپ کنفرم کرتا ہے۔',
      },
      admin: {
        title: 'ایڈمن منظوری',
        text: 'کارڈ جاری ہونے سے پہلے ممبرشپ درخواستیں اور پیمنٹ رسیدیں ریویو ہوتی ہیں۔',
      },
      dashboard: {
        title: 'ممبر ڈیش بورڈ',
        text: 'ممبرز ایک جگہ ممبرشپ، پروگرامز، عطیات، اپڈیٹس اور کارڈ رسائی ٹریک کر سکتے ہیں۔',
      },
    },
    preview: {
      cardSubtitle: 'آفیشل ویریفائیڈ ممبرشپ کارڈ',
      verified: 'ویریفائیڈ',
      memberNo: 'ممبر نمبر',
      memberName: 'ممبر نام',
      memberNameValue: 'ویریفائیڈ ممبر',
      status: 'اسٹیٹس',
      approved: 'منظور',
      district: 'ضلع',
      sindh: 'سندھ',
      card: 'کارڈ',
      qrVerified: 'QR ویریفائیڈ',
      access: 'رسائی',
      programs: 'پروگرامز',
      qrText: 'QR اسکین کر کے منظور شدہ ممبرشپ ویریفائی کریں۔',
      footer: 'ڈیجیٹل ID صرف ایڈمن منظوری کے بعد جاری ہوتی ہے۔',
      signup: 'سائن اپ',
      review: 'ریویو',
      digitalCard: 'ڈیجیٹل کارڈ',
    },
    finalCta: {
      badge: 'ممبر ویریفائیڈ پورٹل',
      titleLine1: 'اپلائی کریں، منظور ہوں،',
      titleLine2: 'ممبر سروسز تک رسائی حاصل کریں',
      description:
        'اپنا اکاؤنٹ بنائیں، ممبرشپ فارم جمع کریں، پیمنٹ رسید اپلوڈ کریں اور ایڈمن منظوری کے بعد ویریفائیڈ ڈیجیٹل ممبر ID حاصل کریں۔',
    },
  },
  sd: {
    portalBadge: 'آفيشل ميمبرشپ پورٽل',
    brandLine: 'جٽ الائنس سنڌ · JAS',
    heroTitleLine1: 'ميمبر پورٽل',
    heroTitleLine2: 'JAS لاءِ',
    heroDescription:
      'JAS ميمبرشپ رجسٽريشن، مينول پيمنٽ رسيد ويريفڪيشن، ايڊمن منظوري، QR ڊجيٽل ڪارڊز ۽ ميمبر سان ڳنڍيل سپورٽ پروگرامز لاءِ هڪ فوڪسڊ ڊجيٽل سسٽم.',
    actions: {
      apply: 'ميمبرشپ لاءِ اپلائي ڪريو',
      viewPrograms: 'پروگرام ڏسو',
      donate: 'عطيو ڏيو',
      open: 'کوليو',
    },
    portalStats: [
      { label: 'بنيادي فوڪس', value: 'ميمبرشپ پورٽل' },
      { label: 'ويريفڪيشن', value: 'QR ڊجيٽل ڪارڊ' },
      { label: 'درخواستون', value: 'ميمبر پروگرامز' },
      { label: 'پيمنٽس', value: 'مينول ريَويو' },
    ],
    membershipFlow: {
      eyebrow: 'ميمبرشپ فلو',
      titleLine1: 'ميمبرشپ عمل،',
      titleLine2: 'آسان ۽ تصديق ٿيل',
      description:
        'لينڊنگ پيج هاڻي اصل پورٽل فلو تي فوڪس ڪري ٿو: درخواست، پيمنٽ رسيد، ريَويو، منظوري ۽ QR ڪارڊ رسائي.',
      steps: [
        {
          title: 'اڪائونٽ ٺاهيو',
          text: 'پهرين سائن اپ ڪريو ته جيئن هر ميمبرشپ درخواست تصديق ٿيل يوزر اڪائونٽ سان ڳنڍيل رهي.',
        },
        {
          title: 'درخواست جمع ڪريو',
          text: 'ميمبر تفصيل، ضلعو، تعلقو، تصوير ۽ ضروري ميمبرشپ پيمنٽ رسيد اپلوڊ ڪريو.',
        },
        {
          title: 'ايڊمن ريَويو',
          text: 'ايڊمن منظوري کان اڳ پروفائل، پيمنٽ رسيد ۽ دستاويز ويريفائي ڪري ٿو.',
        },
        {
          title: 'ڊجيٽل ڪارڊ',
          text: 'منظور ٿيل ميمبرز کي QR ڊجيٽل ميمبرشپ ڪارڊ ۽ ميمبر ڊيش بورڊ ملي ٿو.',
        },
      ],
    },
    programs: {
      eyebrow: 'پروگرام گيٽ وي',
      titleLine1: 'ميمبر ويريفائيڊ',
      titleLine2: 'سپورٽ پروگرامز',
      description:
        'پروگرام ڪارڊز هاڻي صاف آهن ۽ اسٽيٽس بيجز موجوده پورٽل رول آئوٽ مطابق آهن، هر ماڊيول کي مڪمل ايڪٽو نه ڏيکاريو ويو.',
      membership: {
        title: 'ميمبرشپ پورٽل',
        text: 'JAS ميمبر طور رجسٽر ٿيو، منظوري اسٽيٽس ٽريڪ ڪريو ۽ پنهنجو ڊجيٽل ميمبرشپ ڪارڊ حاصل ڪريو.',
        badge: 'فعال',
      },
      education: {
        title: 'تعليمي مدد',
        text: 'اسڪالرشپ، فيس سپورٽ، ڪتاب، امتحاني فيس، هاسٽل، ٽرانسپورٽ يا اسڪلز سپورٽ لاءِ اپلائي ڪريو.',
        badge: 'فعال',
      },
      health: {
        title: 'صحت مدد',
        text: 'مريض جا تفصيل، علاج جي معلومات ۽ دستاويزن سان ميڊيڪل سپورٽ ڪيس جمع ڪريو.',
        badge: 'فعال',
      },
      welfare: {
        title: 'فلاحي ڪيس',
        text: 'فلاحي درخواستون ويريفائيڊ ميمبرشپ ۽ ايڊمن ريَويو سان ڳنڍيل رهنديون.',
        badge: 'فيز 2',
      },
      employment: {
        title: 'روزگار پروگرام',
        text: 'جاب سيڪرز مستقبل جي روزگار سپورٽ ريَويو لاءِ پروفائل، اسڪلز ۽ CV جمع ڪري سگهندا.',
        badge: 'فيز 2',
      },
      donation: {
        title: 'عطيو ويريفڪيشن',
        text: 'مينول فنانس ويريفڪيشن ۽ ڊونر رڪارڊ اپڊيٽ لاءِ عطيو تفصيل جمع ڪريو.',
        badge: 'مينول',
      },
    },
    features: {
      eyebrow: 'پورٽل فيچرز',
      titleLine1: 'ڊجيٽل ٽولز',
      titleLine2: 'بغير ورجايل مواد جي',
      description:
        'هي سيڪشن هاڻي صرف سسٽم فيچرز ڏيکاري ٿو، اهي ساڳيا پروگرام ٻيهر نه جيڪي پروگرام گيٽ وي ۾ اڳ ۾ موجود آهن.',
      qr: {
        title: 'QR ويريفڪيشن',
        text: 'پبلڪ ويريفڪيشن پيج ميمبر ڪارڊ QR ڪوڊ ذريعي منظور ٿيل ميمبرشپ ڪنفرم ڪري ٿو.',
      },
      admin: {
        title: 'ايڊمن منظوري',
        text: 'ڪارڊ جاري ٿيڻ کان اڳ ميمبرشپ درخواستون ۽ پيمنٽ رسيدون ريَويو ٿين ٿيون.',
      },
      dashboard: {
        title: 'ميمبر ڊيش بورڊ',
        text: 'ميمبر هڪ جاءِ تي ميمبرشپ، پروگرامز، عطيا، اپڊيٽس ۽ ڪارڊ رسائي ٽريڪ ڪري سگهن ٿا.',
      },
    },
    preview: {
      cardSubtitle: 'آفيشل ويريفائيڊ ميمبرشپ ڪارڊ',
      verified: 'ويريفائيڊ',
      memberNo: 'ميمبر نمبر',
      memberName: 'ميمبر نالو',
      memberNameValue: 'ويريفائيڊ ميمبر',
      status: 'اسٽيٽس',
      approved: 'منظور',
      district: 'ضلعو',
      sindh: 'سنڌ',
      card: 'ڪارڊ',
      qrVerified: 'QR ويريفائيڊ',
      access: 'رسائي',
      programs: 'پروگرامز',
      qrText: 'QR اسڪين ڪري منظور ٿيل ميمبرشپ ويريفائي ڪريو.',
      footer: 'ڊجيٽل ID صرف ايڊمن منظوري کان پوءِ جاري ٿيندي آهي.',
      signup: 'سائن اپ',
      review: 'ريَويو',
      digitalCard: 'ڊجيٽل ڪارڊ',
    },
    finalCta: {
      badge: 'ميمبر ويريفائيڊ پورٽل',
      titleLine1: 'اپلائي ڪريو، منظور ٿيو،',
      titleLine2: 'ميمبر سروسز تائين رسائي حاصل ڪريو',
      description:
        'پنهنجو اڪائونٽ ٺاهيو، ميمبرشپ فارم جمع ڪريو، پيمنٽ رسيد اپلوڊ ڪريو ۽ ايڊمن منظوري کان پوءِ ويريفائيڊ ڊجيٽل ميمبر ID حاصل ڪريو.',
    },
  },
} as const

export function useHomeCopy() {
  const { language } = useI18n()
  const textDir: TextDirection = language === 'en' ? 'ltr' : 'rtl'

  return {
    copy: homeCopy[language as AppLanguage],
    language,
    textDir,
    isRtl: textDir === 'rtl',
    textAlignClass: textDir === 'rtl' ? 'text-right' : 'text-left',
    iconBeforeClass: textDir === 'rtl' ? 'ml-2' : 'mr-2',
    arrowClass: textDir === 'rtl' ? 'rotate-180' : '',
  }
}

export type HomeCopy = (typeof homeCopy)[AppLanguage]
