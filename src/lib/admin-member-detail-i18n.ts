// src/lib/admin-member-detail-i18n.ts
import { useI18n } from './i18n'

type TextDirection = 'ltr' | 'rtl'

const copy = {
  en: {
    loading: 'Loading member application...',
    memberNotFound: 'Member not found',
    memberNotFoundText: 'This member record could not be loaded.',
    backToAdmin: 'Back to Admin',
    pageEyebrow: 'Member Application',
    cnic: 'CNIC',
    district: 'District',
    memberNo: 'Member No',
    notIssuedYet: 'Not issued yet',
    notIssued: 'Not issued',
    notProvided: 'Not provided',
    notReviewed: 'Not reviewed',
    refresh: 'Refresh',
    viewCard: 'View Card',
    officeBearerCard: 'Office Bearer Card',
    officeCard: 'Office Card',
    openCard: 'Open Card',
    digitalCardUnavailable:
      'Digital card will be available after approval and membership number issuance.',
    summary: {
      status: 'Status',
      memberNo: 'Member No',
      submitted: 'Submitted',
      reviewed: 'Reviewed',
    },
    sidebar: {
      quickContact: 'Quick Contact',
      verificationNotice:
        'Admin verification view shows full CNIC and contact details for review purposes.',
      noPhoto: 'No photo',
    },
    details: {
      title: 'Member Details',
      subtitle:
        'Personal and membership information submitted by the member.',
      identity: 'Identity',
      fullName: 'Full Name',
      fatherName: 'Father Name',
      mobile: 'Mobile',
      location: 'Location',
      taluka: 'Taluka',
      address: 'Address',
      profile: 'Profile',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      education: 'Education',
      bloodGroup: 'Blood Group',
      profession: 'Profession',
      casteBranch: 'Caste Branch',
      emergencyContact: 'Emergency Contact',
      emergencyContactName: 'Emergency Contact Name',
      emergencyContactRelation: 'Emergency Contact Relation',
      emergencyContactMobile: 'Emergency Contact Mobile',
      declarationAccepted: 'Declaration Accepted',
      reviewRecord: 'Review Record',
      approvedAt: 'Approved At',
      reviewedAt: 'Reviewed At',
      yes: 'Yes',
      no: 'No',
      rejectionReason: 'Rejection Reason',
    },
    review: {
      title: 'Review Application',
      subtitle:
        'Approve this member if details are correct. Reject only with a clear reason so the member can update and resubmit.',
      approve: 'Approve Member',
      reject: 'Reject Application',
      processing: 'Processing...',
      rejectionReason: 'Rejection Reason',
      rejectionPlaceholder:
        'Example: CNIC format/photo/address is unclear. Please update and resubmit.',
      minimum: 'Minimum',
      charactersRequired: 'characters required.',
      current: 'Current',
      completedTitle: 'Review Completed',
      completedText: 'This application is currently marked as',
      backToAdminList: 'Back to Admin List',
    },
    status: {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      pendingTitle: 'Pending admin review',
      pendingText:
        'Please verify CNIC, mobile, address, district/taluka, photo quality, and declaration before approval.',
      approvedTitle: 'Application approved',
      approvedTextIssued:
        'Membership number {{memberNo}} is issued. The digital card is available.',
      approvedTextMissing:
        'Application is approved, but member number is not available yet.',
      rejectedTitle: 'Application rejected',
      rejectedText:
        'Application was rejected. No rejection reason is available.',
    },
  },
  ur: {
    loading: 'ممبر درخواست لوڈ ہو رہی ہے...',
    memberNotFound: 'ممبر نہیں ملا',
    memberNotFoundText: 'یہ ممبر ریکارڈ لوڈ نہیں ہو سکا۔',
    backToAdmin: 'ایڈمن پر واپس',
    pageEyebrow: 'ممبر درخواست',
    cnic: 'CNIC',
    district: 'ضلع',
    memberNo: 'ممبر نمبر',
    notIssuedYet: 'ابھی جاری نہیں ہوا',
    notIssued: 'جاری نہیں ہوا',
    notProvided: 'فراہم نہیں کیا گیا',
    notReviewed: 'جائزہ نہیں ہوا',
    refresh: 'ریفریش',
    viewCard: 'کارڈ دیکھیں',
    officeBearerCard: 'عہدیدار کارڈ',
    officeCard: 'آفس کارڈ',
    openCard: 'کارڈ کھولیں',
    digitalCardUnavailable:
      'منظوری اور ممبرشپ نمبر جاری ہونے کے بعد ڈیجیٹل کارڈ دستیاب ہوگا۔',
    summary: {
      status: 'اسٹیٹس',
      memberNo: 'ممبر نمبر',
      submitted: 'جمع شدہ',
      reviewed: 'جائزہ',
    },
    sidebar: {
      quickContact: 'فوری رابطہ',
      verificationNotice:
        'ایڈمن تصدیق ویو میں جائزہ کے لیے مکمل CNIC اور رابطہ تفصیلات دکھائی جاتی ہیں۔',
      noPhoto: 'تصویر نہیں',
    },
    details: {
      title: 'ممبر تفصیلات',
      subtitle:
        'ممبر کی طرف سے جمع کرائی گئی ذاتی اور ممبرشپ معلومات۔',
      identity: 'شناخت',
      fullName: 'مکمل نام',
      fatherName: 'والد کا نام',
      mobile: 'موبائل',
      location: 'مقام',
      taluka: 'تعلقہ',
      address: 'پتہ',
      profile: 'پروفائل',
      dateOfBirth: 'تاریخ پیدائش',
      gender: 'جنس',
      education: 'تعلیم',
      bloodGroup: 'بلڈ گروپ',
      profession: 'پیشہ',
      casteBranch: 'ذات / برانچ',
      emergencyContact: 'ایمرجنسی رابطہ',
      emergencyContactName: 'ایمرجنسی رابطہ نام',
      emergencyContactRelation: 'ایمرجنسی رابطہ رشتہ',
      emergencyContactMobile: 'ایمرجنسی رابطہ موبائل',
      declarationAccepted: 'اعلامیہ قبول کیا',
      reviewRecord: 'جائزہ ریکارڈ',
      approvedAt: 'منظوری وقت',
      reviewedAt: 'جائزہ وقت',
      yes: 'ہاں',
      no: 'نہیں',
      rejectionReason: 'رد کرنے کی وجہ',
    },
    review: {
      title: 'درخواست کا جائزہ',
      subtitle:
        'اگر تفصیلات درست ہیں تو ممبر کو منظور کریں۔ صرف واضح وجہ کے ساتھ رد کریں تاکہ ممبر اپڈیٹ کر کے دوبارہ جمع کرا سکے۔',
      approve: 'ممبر منظور کریں',
      reject: 'درخواست رد کریں',
      processing: 'پروسیسنگ...',
      rejectionReason: 'رد کرنے کی وجہ',
      rejectionPlaceholder:
        'مثال: CNIC فارمیٹ/تصویر/پتہ واضح نہیں۔ براہ کرم اپڈیٹ کر کے دوبارہ جمع کریں۔',
      minimum: 'کم از کم',
      charactersRequired: 'حروف ضروری ہیں۔',
      current: 'موجودہ',
      completedTitle: 'جائزہ مکمل',
      completedText: 'یہ درخواست اس وقت اس اسٹیٹس پر ہے',
      backToAdminList: 'ایڈمن فہرست پر واپس',
    },
    status: {
      pending: 'زیر التواء',
      approved: 'منظور شدہ',
      rejected: 'مسترد',
      pendingTitle: 'ایڈمن جائزہ باقی',
      pendingText:
        'منظوری سے پہلے CNIC، موبائل، پتہ، ضلع/تعلقہ، تصویر کی کوالٹی اور اعلامیہ کی تصدیق کریں۔',
      approvedTitle: 'درخواست منظور شدہ',
      approvedTextIssued:
        'ممبرشپ نمبر {{memberNo}} جاری ہو چکا ہے۔ ڈیجیٹل کارڈ دستیاب ہے۔',
      approvedTextMissing:
        'درخواست منظور ہے، لیکن ممبر نمبر ابھی دستیاب نہیں۔',
      rejectedTitle: 'درخواست مسترد',
      rejectedText:
        'درخواست مسترد کی گئی۔ رد کرنے کی وجہ دستیاب نہیں۔',
    },
  },
  sd: {
    loading: 'ميمبر درخواست لوڊ ٿي رهي آهي...',
    memberNotFound: 'ميمبر نه مليو',
    memberNotFoundText: 'هي ميمبر رڪارڊ لوڊ نه ٿي سگهيو.',
    backToAdmin: 'ايڊمن ڏانهن واپس',
    pageEyebrow: 'ميمبر درخواست',
    cnic: 'CNIC',
    district: 'ضلعو',
    memberNo: 'ميمبر نمبر',
    notIssuedYet: 'اڃا جاري نه ٿيو',
    notIssued: 'جاري نه ٿيو',
    notProvided: 'فراهم نه ڪيو ويو',
    notReviewed: 'جائزو نه ٿيو',
    refresh: 'ريفريش',
    viewCard: 'ڪارڊ ڏسو',
    officeBearerCard: 'عهديدار ڪارڊ',
    officeCard: 'آفيس ڪارڊ',
    openCard: 'ڪارڊ کوليو',
    digitalCardUnavailable:
      'منظوري ۽ ميمبرشپ نمبر جاري ٿيڻ کان پوءِ ڊجيٽل ڪارڊ موجود ٿيندو.',
    summary: {
      status: 'اسٽيٽس',
      memberNo: 'ميمبر نمبر',
      submitted: 'جمع ٿيل',
      reviewed: 'جائزو',
    },
    sidebar: {
      quickContact: 'فوري رابطو',
      verificationNotice:
        'ايڊمن تصديق ويؤ ۾ جائزي لاءِ مڪمل CNIC ۽ رابطا تفصيل ڏيکاريا وڃن ٿا.',
      noPhoto: 'تصوير ناهي',
    },
    details: {
      title: 'ميمبر تفصيل',
      subtitle:
        'ميمبر طرفان جمع ڪرايل ذاتي ۽ ميمبرشپ معلومات.',
      identity: 'سڃاڻپ',
      fullName: 'مڪمل نالو',
      fatherName: 'والد جو نالو',
      mobile: 'موبائل',
      location: 'جڳهه',
      taluka: 'تعلقو',
      address: 'پتو',
      profile: 'پروفائل',
      dateOfBirth: 'ڄمڻ جي تاريخ',
      gender: 'جنس',
      education: 'تعليم',
      bloodGroup: 'بلڊ گروپ',
      profession: 'پيشو',
      casteBranch: 'ذات / برانچ',
      emergencyContact: 'ايمرجنسي رابطو',
      emergencyContactName: 'ايمرجنسي رابطو نالو',
      emergencyContactRelation: 'ايمرجنسي رابطو رشتو',
      emergencyContactMobile: 'ايمرجنسي رابطو موبائل',
      declarationAccepted: 'اعلان قبول ڪيو',
      reviewRecord: 'جائزو رڪارڊ',
      approvedAt: 'منظوري وقت',
      reviewedAt: 'جائزو وقت',
      yes: 'ها',
      no: 'نه',
      rejectionReason: 'رد ڪرڻ جو سبب',
    },
    review: {
      title: 'درخواست جو جائزو',
      subtitle:
        'جيڪڏهن تفصيل صحيح آهن ته ميمبر منظور ڪريو. صرف واضح سبب سان رد ڪريو ته جيئن ميمبر اپڊيٽ ڪري ٻيهر جمع ڪرائي.',
      approve: 'ميمبر منظور ڪريو',
      reject: 'درخواست رد ڪريو',
      processing: 'پروسيسنگ...',
      rejectionReason: 'رد ڪرڻ جو سبب',
      rejectionPlaceholder:
        'مثال: CNIC فارميٽ/تصوير/پتو واضح ناهي. مهرباني ڪري اپڊيٽ ڪري ٻيهر جمع ڪريو.',
      minimum: 'گهٽ ۾ گهٽ',
      charactersRequired: 'اکر ضروري آهن.',
      current: 'موجوده',
      completedTitle: 'جائزو مڪمل',
      completedText: 'هي درخواست هن وقت هن اسٽيٽس تي آهي',
      backToAdminList: 'ايڊمن فهرست ڏانهن واپس',
    },
    status: {
      pending: 'زير التوا',
      approved: 'منظور ٿيل',
      rejected: 'رد ٿيل',
      pendingTitle: 'ايڊمن جائزو باقي',
      pendingText:
        'منظوري کان اڳ CNIC، موبائل، پتو، ضلعو/تعلقو، تصوير جي ڪوالٽي ۽ اعلان جي تصديق ڪريو.',
      approvedTitle: 'درخواست منظور ٿيل',
      approvedTextIssued:
        'ميمبرشپ نمبر {{memberNo}} جاري ٿي چڪو آهي. ڊجيٽل ڪارڊ موجود آهي.',
      approvedTextMissing:
        'درخواست منظور آهي، پر ميمبر نمبر اڃا موجود ناهي.',
      rejectedTitle: 'درخواست رد ٿيل',
      rejectedText:
        'درخواست رد ڪئي وئي. رد ڪرڻ جو سبب موجود ناهي.',
    },
  },
} as const

export function useAdminMemberDetailCopy() {
  const { language } = useI18n()
  const textDir: TextDirection = language === 'en' ? 'ltr' : 'rtl'

  return {
    copy: copy[language],
    language,
    textDir,
    isRtl: textDir === 'rtl',
    textAlignClass: textDir === 'rtl' ? 'text-right' : 'text-left',
    iconBeforeClass: textDir === 'rtl' ? 'ml-2' : 'mr-2',
  }
}

export type AdminMemberDetailCopy = ReturnType<
  typeof useAdminMemberDetailCopy
>['copy']
