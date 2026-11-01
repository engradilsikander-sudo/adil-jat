// src/lib/admin-dashboard-i18n.ts
import { useI18n } from './i18n'

type AdminDashboardCopy = {
  textDir: 'ltr' | 'rtl'
  isRtl: boolean
  textAlignClass: string
  arrowClass: string
  roleLabels: Record<string, string>
  loading: string
  brandEyebrow: string
  title: string
  subtitle: string
  showSensitive: string
  hideSensitive: string
  refresh: string
  refreshing: string
  sensitiveWarning: string
  stats: {
    totalMembers: string
    pendingReview: string
    approved: string
    rejected: string
    cardsIssued: string
  }
  membership: {
    eyebrow: string
    title: string
    showing: (shown: number, total: number) => string
    exportFullCsv: string
    exportMaskedCsv: string
    exportCardCsv: string
    exportingCardCsv: string
    cardCsvHint: string
    clearFilters: string
    searchPlaceholder: string
    searchAria: string
    statusAria: string
    districtAria: string
    talukaAria: string
    dateAria: string
    sortAria: string
    allStatuses: string
    allDistricts: string
    allTalukas: string
    allDates: string
    today: string
    last7Days: string
    last30Days: string
    sensitiveHint: string
    sortNewest: string
    sortOldest: string
    sortName: string
    sortDistrict: string
    noMembers: string
    noMembersMessage: string
  }
  table: {
    photo: string
    member: string
    cnicMobile: string
    district: string
    status: string
    memberNo: string
    submitted: string
    digitalCard: string
    application: string
    id: string
  }
  mobile: {
    cnic: string
    submitted: string
    location: string
    memberNo: string
    noTaluka: string
    notIssued: string
  }
  card: {
    digitalCard: string
    digitalMemberCard: string
    sameDesign: string
    openSameMemberCard: string
    availableAfterApproval: string
    memberNoNotIssued: string
  }
  status: {
    pending: string
    approved: string
    rejected: string
  }
  modules: {
    eyebrow: string
    title: string
    description: string
    available: (count: number) => string
    module: string
    currentPage: string
    open: string
    phase1: string
    admin: string
    superAdmin: string
    cards: Record<string, {
      title: string
      description: string
      actionLabel: string
      metricLabel?: string
      badgeLabel?: string
    }>
  }
  access: {
    superAdmin: string
    centralAdmin: string
    roleBased: string
  }
  exportConfirm: string
  viewApplication: string
}

const copies: Record<'en' | 'ur' | 'sd', Omit<AdminDashboardCopy, 'textDir' | 'isRtl' | 'textAlignClass' | 'arrowClass'>> = {
  en: {
    roleLabels: {
      admin: 'Admin',
      super_admin: 'Super Admin',
      membership_admin: 'Membership Admin',
      education_admin: 'Education Admin',
      health_admin: 'Health Admin',
      employment_admin: 'Employment Admin',
      ration_admin: 'Ration Admin',
      welfare_admin: 'Welfare Admin',
      finance_admin: 'Finance Admin',
    },
    loading: 'Loading admin control center...',
    brandEyebrow: 'Jatt Alliance Sindh',
    title: 'JAS Admin Control Center',
    subtitle:
      'Manage membership applications and access authorized program modules for education, health, welfare, employment and finance. Sensitive CNIC/mobile data stays masked unless explicitly required.',
    showSensitive: 'Show Sensitive Data',
    hideSensitive: 'Hide Sensitive Data',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    sensitiveWarning:
      'Sensitive data is visible. Use this mode only for official verification, and avoid exporting or sharing records unless approved by JAS leadership.',
    stats: {
      totalMembers: 'Total Members',
      pendingReview: 'Pending Review',
      approved: 'Approved',
      rejected: 'Rejected',
      cardsIssued: 'Cards Issued',
    },
    membership: {
      eyebrow: 'Membership management',
      title: 'Member Applications',
      showing: (shown, total) => `Showing ${shown} of ${total} members.`,
      exportFullCsv: 'Export Full CSV',
      exportMaskedCsv: 'Export Masked CSV',
      exportCardCsv: 'Export Full Card CSV',
      exportingCardCsv: 'Preparing Full CSV...',
      cardCsvHint:
        'CSV always exports full unmasked front/back card data for every record matching the current filters. The on-screen table can remain masked.',
      clearFilters: 'Clear Filters',
      searchPlaceholder: 'Search name, CNIC, mobile, district...',
      searchAria: 'Search members',
      statusAria: 'Filter members by status',
      districtAria: 'Filter members by district',
      talukaAria: 'Filter members by taluka',
      dateAria: 'Filter members by registration date',
      sortAria: 'Sort members',
      allStatuses: 'All statuses',
      allDistricts: 'All districts',
      allTalukas: 'All talukas',
      allDates: 'All dates',
      today: 'Today',
      last7Days: 'Last 7 days',
      last30Days: 'Last 30 days',
      sensitiveHint:
        'CNIC and mobile numbers are masked by default. Full CSV export requires sensitive-data mode and confirmation.',
      sortNewest: 'Sort: Newest first',
      sortOldest: 'Sort: Oldest first',
      sortName: 'Sort: Name A-Z',
      sortDistrict: 'Sort: District A-Z',
      noMembers: 'No members found',
      noMembersMessage: 'Try changing the search text or filters.',
    },
    table: {
      photo: 'Photo',
      member: 'Member',
      cnicMobile: 'CNIC / Mobile',
      district: 'District',
      status: 'Status',
      memberNo: 'Member No',
      submitted: 'Submitted',
      digitalCard: 'Digital Card',
      application: 'Application',
      id: 'ID',
    },
    mobile: {
      cnic: 'CNIC',
      submitted: 'Submitted',
      location: 'Location',
      memberNo: 'Member No',
      noTaluka: 'No taluka',
      notIssued: 'Not issued',
    },
    card: {
      digitalCard: 'Digital Card',
      digitalMemberCard: 'Digital Member Card',
      sameDesign: 'Same card design as member dashboard.',
      openSameMemberCard: 'Open Same Member Card',
      availableAfterApproval: 'Card available after approval',
      memberNoNotIssued: 'Member no not issued yet',
    },
    status: {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    },
    modules: {
      eyebrow: 'Admin Modules',
      title: 'Control center shortcuts',
      description:
        'Open the authorized modules for membership, programs, finance, public website content, reports and system access management.',
      available: (count) => `${count} module${count === 1 ? '' : 's'} available`,
      module: 'Module',
      currentPage: 'Current Page',
      open: 'Open',
      phase1: 'Phase 1',
      admin: 'Admin',
      superAdmin: 'Super Admin',
      cards: {
        membership: {
          title: 'Membership',
          description:
            'Review member registrations, approve or reject applications, and open QR-based digital membership cards.',
          actionLabel: 'Current Page',
          metricLabel: 'Pending',
        },
        education: {
          title: 'Education',
          description:
            'Manage scholarship, fee support, documents, review notes and approved education support amounts.',
          actionLabel: 'Open Education',
        },
        health: {
          title: 'Health',
          description:
            'Review medical help, emergency treatment, hospital estimates, prescriptions and committee decisions.',
          actionLabel: 'Open Health',
        },
        welfare: {
          title: 'Welfare',
          description:
            'Manage financial help, ration, widow/orphan, emergency, legal and family support cases.',
          actionLabel: 'Open Welfare',
        },
        employment: {
          title: 'Employment',
          description:
            'Review job seeker profiles, CV uploads, skills, training interests, shortlists and placements.',
          actionLabel: 'Open Employment',
        },
        finance: {
          title: 'Finance',
          description:
            'Track donations, expenses, approvals, receipts, available balance and finance audit logs.',
          actionLabel: 'Open Finance',
        },
        cms: {
          title: 'Public Website CMS',
          description:
            'Update multilingual public pages such as About, Vision & Mission, Manifesto, Constitution, CWC and Contact.',
          actionLabel: 'Open CMS',
        },
        media: {
          title: 'News & Media',
          description:
            'Create and publish news, announcements, gallery items and public event notices.',
          actionLabel: 'Open News Admin',
        },
        reports: {
          title: 'Reports Center',
          description:
            'View organization-wide summaries for members, programs, finance, districts and monthly activity.',
          actionLabel: 'Open Reports',
          badgeLabel: 'Admin',
        },
        roles: {
          title: 'Roles & Permissions',
          description:
            'Assign or remove admin roles, review user access and protect super admin controls.',
          actionLabel: 'Manage Roles',
          badgeLabel: 'Super Admin',
        },
        'area-permissions': {
          title: 'Area Permissions',
          description:
            'Assign district, taluka and All Sindh access for module admins after giving them roles.',
          actionLabel: 'Manage Area Access',
          badgeLabel: 'Super Admin',
        },
        'audit-logs': {
          title: 'Audit Logs',
          description:
            'Review sensitive admin activity, role changes, area access updates, finance edits and committee actions.',
          actionLabel: 'Open Audit Logs',
          badgeLabel: 'Super Admin',
        },
        committees: {
          title: 'Organization Levels & Designations',
          description:
            'Manage organization level units, designations and assignment records.',
          actionLabel: 'Open Levels',
          badgeLabel: 'Phase 1',
        },
      },
    },
    access: {
      superAdmin: 'Super admin control layer active',
      centralAdmin: 'Central admin operations access',
      roleBased: 'Role-based module access',
    },
    exportConfirm:
      'This export will include all unmasked personal data shown on the front and back of member cards for every record matching the current filters. The action will be recorded in the audit log. Continue only for authorized official use.',
    viewApplication: 'View Application',
  },
  ur: {
    roleLabels: {
      admin: 'ایڈمن',
      super_admin: 'سپر ایڈمن',
      membership_admin: 'ممبرشپ ایڈمن',
      education_admin: 'ایجوکیشن ایڈمن',
      health_admin: 'ہیلتھ ایڈمن',
      employment_admin: 'ایمپلائمنٹ ایڈمن',
      ration_admin: 'راشن ایڈمن',
      welfare_admin: 'ویلفیئر ایڈمن',
      finance_admin: 'فنانس ایڈمن',
    },
    loading: 'ایڈمن کنٹرول سینٹر لوڈ ہو رہا ہے...',
    brandEyebrow: 'جٹ الائنس سندھ',
    title: 'JAS ایڈمن کنٹرول سینٹر',
    subtitle:
      'ممبرشپ درخواستیں مینج کریں اور تعلیم، صحت، ویلفیئر، روزگار اور فنانس کے مجاز پروگرام ماڈیولز تک رسائی حاصل کریں۔ حساس CNIC/mobile ڈیٹا صرف ضرورت پر ظاہر ہوگا۔',
    showSensitive: 'حساس ڈیٹا دکھائیں',
    hideSensitive: 'حساس ڈیٹا چھپائیں',
    refresh: 'ریفریش',
    refreshing: 'ریفریش ہو رہا ہے...',
    sensitiveWarning:
      'حساس ڈیٹا نظر آ رہا ہے۔ یہ موڈ صرف سرکاری تصدیق کے لیے استعمال کریں اور JAS قیادت کی منظوری کے بغیر ریکارڈ ایکسپورٹ یا شیئر نہ کریں۔',
    stats: {
      totalMembers: 'کل ممبران',
      pendingReview: 'زیر جائزہ',
      approved: 'منظور شدہ',
      rejected: 'مسترد',
      cardsIssued: 'کارڈز جاری',
    },
    membership: {
      eyebrow: 'ممبرشپ مینجمنٹ',
      title: 'ممبر درخواستیں',
      showing: (shown, total) => `${total} میں سے ${shown} ممبران دکھائے جا رہے ہیں۔`,
      exportFullCsv: 'فل CSV ایکسپورٹ',
      exportMaskedCsv: 'ماسکڈ CSV ایکسپورٹ',
      exportCardCsv: 'مکمل کارڈ CSV ایکسپورٹ',
      exportingCardCsv: 'مکمل CSV تیار ہو رہی ہے...',
      cardCsvHint:
        'CSV میں موجودہ فلٹرز سے میچ کرنے والے تمام ریکارڈز کا مکمل اور غیر ماسک شدہ فرنٹ/بیک کارڈ ڈیٹا شامل ہوگا۔ اسکرین ٹیبل ماسک رہ سکتی ہے۔',
      clearFilters: 'فلٹرز صاف کریں',
      searchPlaceholder: 'نام، CNIC، موبائل، ضلع تلاش کریں...',
      searchAria: 'ممبرز تلاش کریں',
      statusAria: 'اسٹیٹس سے ممبرز فلٹر کریں',
      districtAria: 'ضلع سے ممبرز فلٹر کریں',
      talukaAria: 'تعلقہ سے ممبرز فلٹر کریں',
      dateAria: 'رجسٹریشن تاریخ سے ممبرز فلٹر کریں',
      sortAria: 'ممبرز ترتیب دیں',
      allStatuses: 'تمام اسٹیٹس',
      allDistricts: 'تمام اضلاع',
      allTalukas: 'تمام تعلقہ',
      allDates: 'تمام تاریخیں',
      today: 'آج',
      last7Days: 'گزشتہ 7 دن',
      last30Days: 'گزشتہ 30 دن',
      sensitiveHint:
        'CNIC اور موبائل نمبرز ڈیفالٹ طور پر ماسک رہتے ہیں۔ فل CSV ایکسپورٹ کے لیے sensitive-data mode اور تصدیق ضروری ہے۔',
      sortNewest: 'ترتیب: نئے پہلے',
      sortOldest: 'ترتیب: پرانے پہلے',
      sortName: 'ترتیب: نام A-Z',
      sortDistrict: 'ترتیب: ضلع A-Z',
      noMembers: 'کوئی ممبر نہیں ملا',
      noMembersMessage: 'سرچ ٹیکسٹ یا فلٹرز تبدیل کریں۔',
    },
    table: {
      photo: 'تصویر',
      member: 'ممبر',
      cnicMobile: 'CNIC / موبائل',
      district: 'ضلع',
      status: 'اسٹیٹس',
      memberNo: 'ممبر نمبر',
      submitted: 'جمع شدہ',
      digitalCard: 'ڈیجیٹل کارڈ',
      application: 'درخواست',
      id: 'ID',
    },
    mobile: {
      cnic: 'CNIC',
      submitted: 'جمع شدہ',
      location: 'مقام',
      memberNo: 'ممبر نمبر',
      noTaluka: 'تعلقہ نہیں',
      notIssued: 'جاری نہیں ہوا',
    },
    card: {
      digitalCard: 'ڈیجیٹل کارڈ',
      digitalMemberCard: 'ڈیجیٹل ممبر کارڈ',
      sameDesign: 'ممبر ڈیش بورڈ جیسا ہی کارڈ ڈیزائن۔',
      openSameMemberCard: 'وہی ممبر کارڈ کھولیں',
      availableAfterApproval: 'کارڈ منظوری کے بعد دستیاب ہوگا',
      memberNoNotIssued: 'ممبر نمبر ابھی جاری نہیں ہوا',
    },
    status: {
      pending: 'زیر جائزہ',
      approved: 'منظور شدہ',
      rejected: 'مسترد',
    },
    modules: {
      eyebrow: 'ایڈمن ماڈیولز',
      title: 'کنٹرول سینٹر شارٹ کٹس',
      description:
        'ممبرشپ، پروگرامز، فنانس، پبلک ویب سائٹ مواد، رپورٹس اور سسٹم ایکسس مینجمنٹ کے مجاز ماڈیولز کھولیں۔',
      available: (count) => `${count} ماڈیول دستیاب`,
      module: 'ماڈیول',
      currentPage: 'موجودہ صفحہ',
      open: 'کھولیں',
      phase1: 'فیز 1',
      admin: 'ایڈمن',
      superAdmin: 'سپر ایڈمن',
      cards: {
        membership: {
          title: 'ممبرشپ',
          description:
            'ممبر رجسٹریشنز کا جائزہ، منظوری/مسترد، اور QR-based ڈیجیٹل ممبرشپ کارڈز کھولیں۔',
          actionLabel: 'موجودہ صفحہ',
          metricLabel: 'زیر جائزہ',
        },
        education: {
          title: 'تعلیم',
          description:
            'اسکالرشپ، فیس سپورٹ، دستاویزات، ریویو نوٹس اور منظور شدہ تعلیمی سپورٹ رقم مینج کریں۔',
          actionLabel: 'ایجوکیشن کھولیں',
        },
        health: {
          title: 'صحت',
          description:
            'طبی مدد، ایمرجنسی علاج، ہسپتال تخمینے، نسخے اور کمیٹی فیصلوں کا جائزہ لیں۔',
          actionLabel: 'ہیلتھ کھولیں',
        },
        welfare: {
          title: 'ویلفیئر',
          description:
            'مالی مدد، راشن، بیوہ/یتیم، ایمرجنسی، قانونی اور خاندانی سپورٹ کیسز مینج کریں۔',
          actionLabel: 'ویلفیئر کھولیں',
        },
        employment: {
          title: 'روزگار',
          description:
            'جاب سیکر پروفائلز، CV اپلوڈز، اسکلز، ٹریننگ دلچسپی، شارٹ لسٹ اور پلیسمنٹ کا جائزہ لیں۔',
          actionLabel: 'ایمپلائمنٹ کھولیں',
        },
        finance: {
          title: 'فنانس',
          description:
            'عطیات، اخراجات، منظوری، رسیدیں، دستیاب بیلنس اور فنانس آڈٹ لاگز ٹریک کریں۔',
          actionLabel: 'فنانس کھولیں',
        },
        cms: {
          title: 'پبلک ویب سائٹ CMS',
          description:
            'About، Vision & Mission، Manifesto، Constitution، CWC اور Contact جیسے multilingual public pages اپڈیٹ کریں۔',
          actionLabel: 'CMS کھولیں',
        },
        media: {
          title: 'نیوز اور میڈیا',
          description:
            'خبریں، اعلانات، گیلری آئٹمز اور عوامی ایونٹ نوٹس بنائیں اور شائع کریں۔',
          actionLabel: 'نیوز ایڈمن کھولیں',
        },
        reports: {
          title: 'رپورٹس سینٹر',
          description:
            'ممبرز، پروگرامز، فنانس، اضلاع اور ماہانہ سرگرمی کی تنظیمی سمریز دیکھیں۔',
          actionLabel: 'رپورٹس کھولیں',
          badgeLabel: 'ایڈمن',
        },
        roles: {
          title: 'رولز اور پرمیشنز',
          description:
            'ایڈمن رولز assign/remove کریں، user access دیکھیں اور super admin controls محفوظ رکھیں۔',
          actionLabel: 'رولز مینج کریں',
          badgeLabel: 'سپر ایڈمن',
        },
        'area-permissions': {
          title: 'ایریا پرمیشنز',
          description:
            'ماڈیول ایڈمنز کو roles دینے کے بعد district، taluka اور All Sindh access assign کریں۔',
          actionLabel: 'ایریا ایکسس مینج کریں',
          badgeLabel: 'سپر ایڈمن',
        },
        'audit-logs': {
          title: 'آڈٹ لاگز',
          description:
            'حساس admin activity، role changes، area access، finance edits اور committee actions کا جائزہ لیں۔',
          actionLabel: 'آڈٹ لاگز کھولیں',
          badgeLabel: 'سپر ایڈمن',
        },
        committees: {
          title: 'کمیٹیاں اور عہدے',
          description:
            'مرکزی، ڈویژنل، ضلعی اور تعلقہ کمیٹیاں، عہدیداران، عہدے اور مدت ریکارڈ مینج کریں۔',
          actionLabel: 'کمیٹیاں کھولیں',
          badgeLabel: 'فیز 1',
        },
      },
    },
    access: {
      superAdmin: 'سپر ایڈمن کنٹرول لیئر فعال',
      centralAdmin: 'مرکزی ایڈمن آپریشنز ایکسس',
      roleBased: 'رول بیسڈ ماڈیول ایکسس',
    },
    exportConfirm:
      'اس ایکسپورٹ میں موجودہ فلٹرز سے میچ کرنے والے تمام ممبرز کے کارڈ کی فرنٹ اور بیک سائیڈ کا مکمل غیر ماسک شدہ ذاتی ڈیٹا شامل ہوگا۔ یہ ایکشن آڈٹ لاگ میں ریکارڈ ہوگا۔ صرف مجاز سرکاری استعمال کے لیے جاری رکھیں۔',
    viewApplication: 'درخواست دیکھیں',
  },
  sd: {
    roleLabels: {
      admin: 'ايڊمن',
      super_admin: 'سپر ايڊمن',
      membership_admin: 'ميمبرشپ ايڊمن',
      education_admin: 'ايجوڪيشن ايڊمن',
      health_admin: 'هيلٿ ايڊمن',
      employment_admin: 'ايمپلائمنٽ ايڊمن',
      ration_admin: 'راشن ايڊمن',
      welfare_admin: 'ويلفيئر ايڊمن',
      finance_admin: 'فنانس ايڊمن',
    },
    loading: 'ايڊمن ڪنٽرول سينٽر لوڊ ٿي رهيو آهي...',
    brandEyebrow: 'جٽ الائنس سنڌ',
    title: 'JAS ايڊمن ڪنٽرول سينٽر',
    subtitle:
      'ميمبرشپ درخواستون منظم ڪريو ۽ تعليم، صحت، ويلفيئر، روزگار ۽ فنانس جي مجاز پروگرام ماڊيولز تائين رسائي حاصل ڪريو. حساس CNIC/mobile ڊيٽا صرف ضرورت تي ظاهر ٿيندو.',
    showSensitive: 'حساس ڊيٽا ڏيکاريو',
    hideSensitive: 'حساس ڊيٽا لڪايو',
    refresh: 'ريفريش',
    refreshing: 'ريفريش ٿي رهيو آهي...',
    sensitiveWarning:
      'حساس ڊيٽا نظر اچي رهيو آهي. هي موڊ صرف سرڪاري تصديق لاءِ استعمال ڪريو ۽ JAS قيادت جي منظوري کانسواءِ رڪارڊ ايڪسپورٽ يا شيئر نه ڪريو.',
    stats: {
      totalMembers: 'ڪل ميمبر',
      pendingReview: 'جائزي هيٺ',
      approved: 'منظور ٿيل',
      rejected: 'رد ٿيل',
      cardsIssued: 'ڪارڊ جاري',
    },
    membership: {
      eyebrow: 'ميمبرشپ مينيجمينٽ',
      title: 'ميمبر درخواستون',
      showing: (shown, total) => `${total} مان ${shown} ميمبر ڏيکاريا پيا وڃن.`,
      exportFullCsv: 'فل CSV ايڪسپورٽ',
      exportMaskedCsv: 'ماسڪڊ CSV ايڪسپورٽ',
      exportCardCsv: 'مڪمل ڪارڊ CSV ايڪسپورٽ',
      exportingCardCsv: 'مڪمل CSV تيار ٿي رهي آهي...',
      cardCsvHint:
        'CSV ۾ موجوده فلٽرن سان ملندڙ سڀني رڪارڊن جو مڪمل ۽ بغير ماسڪ ٿيل فرنٽ/بيڪ ڪارڊ ڊيٽا شامل هوندو. اسڪرين ٽيبل ماسڪ رهي سگهي ٿي.',
      clearFilters: 'فلٽر صاف ڪريو',
      searchPlaceholder: 'نالو، CNIC، موبائل، ضلعو ڳوليو...',
      searchAria: 'ميمبر ڳوليو',
      statusAria: 'اسٽيٽس سان ميمبر فلٽر ڪريو',
      districtAria: 'ضلع سان ميمبر فلٽر ڪريو',
      talukaAria: 'تعلقي سان ميمبر فلٽر ڪريو',
      dateAria: 'رجسٽريشن تاريخ سان ميمبر فلٽر ڪريو',
      sortAria: 'ميمبر ترتيب ڏيو',
      allStatuses: 'سڀ اسٽيٽس',
      allDistricts: 'سڀ ضلعا',
      allTalukas: 'سڀ تعلقا',
      allDates: 'سڀ تاريخون',
      today: 'اڄ',
      last7Days: 'گذريل 7 ڏينهن',
      last30Days: 'گذريل 30 ڏينهن',
      sensitiveHint:
        'CNIC ۽ موبائل نمبر ڊيفالٽ طور ماسڪ رهن ٿا. فل CSV ايڪسپورٽ لاءِ sensitive-data mode ۽ تصديق ضروري آهي.',
      sortNewest: 'ترتيب: نوان پهريان',
      sortOldest: 'ترتيب: پراڻا پهريان',
      sortName: 'ترتيب: نالو A-Z',
      sortDistrict: 'ترتيب: ضلعو A-Z',
      noMembers: 'ڪو ميمبر نه مليو',
      noMembersMessage: 'سرچ ٽيڪسٽ يا فلٽر تبديل ڪريو.',
    },
    table: {
      photo: 'تصوير',
      member: 'ميمبر',
      cnicMobile: 'CNIC / موبائل',
      district: 'ضلعو',
      status: 'اسٽيٽس',
      memberNo: 'ميمبر نمبر',
      submitted: 'جمع ٿيل',
      digitalCard: 'ڊجيٽل ڪارڊ',
      application: 'درخواست',
      id: 'ID',
    },
    mobile: {
      cnic: 'CNIC',
      submitted: 'جمع ٿيل',
      location: 'جڳهه',
      memberNo: 'ميمبر نمبر',
      noTaluka: 'تعلقو نه',
      notIssued: 'جاري نه ٿيو',
    },
    card: {
      digitalCard: 'ڊجيٽل ڪارڊ',
      digitalMemberCard: 'ڊجيٽل ميمبر ڪارڊ',
      sameDesign: 'ميمبر ڊيش بورڊ جهڙو ساڳيو ڪارڊ ڊيزائن.',
      openSameMemberCard: 'ساڳيو ميمبر ڪارڊ کوليو',
      availableAfterApproval: 'ڪارڊ منظوري کان پوءِ دستياب ٿيندو',
      memberNoNotIssued: 'ميمبر نمبر اڃا جاري نه ٿيو',
    },
    status: {
      pending: 'جائزي هيٺ',
      approved: 'منظور ٿيل',
      rejected: 'رد ٿيل',
    },
    modules: {
      eyebrow: 'ايڊمن ماڊيولز',
      title: 'ڪنٽرول سينٽر شارٽ ڪٽس',
      description:
        'ميمبرشپ، پروگرامز، فنانس، پبلڪ ويب سائيٽ مواد، رپورٽس ۽ سسٽم ايڪسس مينيجمينٽ جا مجاز ماڊيول کوليو.',
      available: (count) => `${count} ماڊيول دستياب`,
      module: 'ماڊيول',
      currentPage: 'موجوده صفحو',
      open: 'کوليو',
      phase1: 'فيز 1',
      admin: 'ايڊمن',
      superAdmin: 'سپر ايڊمن',
      cards: {
        membership: {
          title: 'ميمبرشپ',
          description:
            'ميمبر رجسٽريشنز جو جائزو، منظوري/رد، ۽ QR-based ڊجيٽل ميمبرشپ ڪارڊ کوليو.',
          actionLabel: 'موجوده صفحو',
          metricLabel: 'جائزي هيٺ',
        },
        education: {
          title: 'تعليم',
          description:
            'اسڪالرشپ، في سپورٽ، دستاويز، ريويو نوٽس ۽ منظور ٿيل تعليمي سپورٽ رقم منظم ڪريو.',
          actionLabel: 'ايجوڪيشن کوليو',
        },
        health: {
          title: 'صحت',
          description:
            'طبي مدد، ايمرجنسي علاج، اسپتال تخمينن، نسخن ۽ ڪميٽي فيصلن جو جائزو وٺو.',
          actionLabel: 'هيلٿ کوليو',
        },
        welfare: {
          title: 'ويلفيئر',
          description:
            'مالي مدد، راشن، بيواهه/يتيم، ايمرجنسي، قانوني ۽ خانداني سپورٽ ڪيس منظم ڪريو.',
          actionLabel: 'ويلفيئر کوليو',
        },
        employment: {
          title: 'روزگار',
          description:
            'جاب سيڪر پروفائلز، CV اپلوڊ، مهارتون، ٽريننگ دلچسپي، شارٽ لسٽ ۽ پليسمينٽ جو جائزو وٺو.',
          actionLabel: 'ايمپلائمنٽ کوليو',
        },
        finance: {
          title: 'فنانس',
          description:
            'عطيا، خرچ، منظوري، رسيدون، دستياب بيلنس ۽ فنانس آڊٽ لاگز ٽريڪ ڪريو.',
          actionLabel: 'فنانس کوليو',
        },
        cms: {
          title: 'پبلڪ ويب سائيٽ CMS',
          description:
            'About، Vision & Mission، Manifesto، Constitution، CWC ۽ Contact جهڙا multilingual public pages اپڊيٽ ڪريو.',
          actionLabel: 'CMS کوليو',
        },
        media: {
          title: 'نيوز ۽ ميڊيا',
          description:
            'خبرون، اعلان، گيلري آئٽمز ۽ عوامي ايونٽ نوٽس ٺاهيو ۽ شايع ڪريو.',
          actionLabel: 'نيوز ايڊمن کوليو',
        },
        reports: {
          title: 'رپورٽس سينٽر',
          description:
            'ميمبرن، پروگرامن، فنانس، ضلعن ۽ ماهوار سرگرمي جون تنظيمي سمريون ڏسو.',
          actionLabel: 'رپورٽس کوليو',
          badgeLabel: 'ايڊمن',
        },
        roles: {
          title: 'رولز ۽ پرميشنز',
          description:
            'ايڊمن رولز assign/remove ڪريو، user access ڏسو ۽ super admin controls محفوظ رکو.',
          actionLabel: 'رولز منظم ڪريو',
          badgeLabel: 'سپر ايڊمن',
        },
        'area-permissions': {
          title: 'ايريا پرميشنز',
          description:
            'ماڊيول ايڊمنز کي roles ڏيڻ کان پوءِ district، taluka ۽ All Sindh access assign ڪريو.',
          actionLabel: 'ايريا ايڪسس منظم ڪريو',
          badgeLabel: 'سپر ايڊمن',
        },
        'audit-logs': {
          title: 'آڊٽ لاگز',
          description:
            'حساس admin activity، role changes، area access، finance edits ۽ committee actions جو جائزو وٺو.',
          actionLabel: 'آڊٽ لاگز کوليو',
          badgeLabel: 'سپر ايڊمن',
        },
        committees: {
          title: 'ڪميٽيون ۽ عهدا',
          description:
            'مرڪزي، ڊويزنل، ضلعي ۽ تعلقي ڪميٽيون، عهديدار، عهدا ۽ مدت رڪارڊ منظم ڪريو.',
          actionLabel: 'ڪميٽيون کوليو',
          badgeLabel: 'فيز 1',
        },
      },
    },
    access: {
      superAdmin: 'سپر ايڊمن ڪنٽرول ليئر فعال',
      centralAdmin: 'مرڪزي ايڊمن آپريشنز ايڪسس',
      roleBased: 'رول بيسڊ ماڊيول ايڪسس',
    },
    exportConfirm:
      'هن ايڪسپورٽ ۾ موجوده فلٽرن سان ملندڙ سڀني ميمبرن جي ڪارڊ فرنٽ ۽ بيڪ جو مڪمل بغير ماسڪ ٿيل ذاتي ڊيٽا شامل هوندو. هي عمل آڊٽ لاگ ۾ رڪارڊ ٿيندو. صرف مجاز سرڪاري استعمال لاءِ جاري رکو.',
    viewApplication: 'درخواست ڏسو',
  },
}

export function useAdminDashboardCopy(): AdminDashboardCopy {
  const { language } = useI18n()
  const selected = copies[language] ?? copies.en
  const textDir = language === 'en' ? 'ltr' : 'rtl'
  const isRtl = textDir === 'rtl'

  return {
    ...selected,
    textDir,
    isRtl,
    textAlignClass: isRtl ? 'text-right' : 'text-left',
    arrowClass: isRtl ? 'mr-2 rotate-180' : 'ml-2',
  }
}
