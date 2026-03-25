import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ── English Translations ────────────────────────────────────────────────────
const translationEN = {
  // Navigation
  dashboard: 'Dashboard',
  ownerDashboard: 'Owner Dashboard',
  employeeDashboard: 'Employee Dashboard',
  approvals: 'Approvals',
  customers: 'Customers',
  newCustomer: 'New Customer',
  claims: 'Claims',
  leads: 'Leads',
  renewals: 'Renewals',
  commissions: 'Commissions',
  employees: 'Employees',
  documents: 'Documents',
  familyTree: 'Family Tree',
  auditLogs: 'Audit Logs',
  knowledgeBase: 'Knowledge Base',
  policyAssistant: 'Policy Assistant',
  analytics: 'Analytics',
  compliance: 'Compliance',
  settings: 'Settings',
  profile: 'Profile',
  logout: 'Logout',
  search: 'Search',

  // Dashboard metrics
  overview: 'Overview',
  totalRevenue: 'Total Revenue',
  activePolicies: 'Active Policies',
  pendingApprovals: 'Pending Approvals',
  recentActivity: 'Recent Activity',
  totalCustomers: 'Total Customers',
  totalClaims: 'Total Claims',
  totalLeads: 'Total Leads',
  commissionEarned: 'Commission Earned',

  // Analytics & Exports
  exportPdf: 'PDF Report',
  exportExcel: 'Excel Report',
  businessOverview: 'Business Overview',
  policyMix: 'Policy Mix',
  revenueBreakdown: 'Revenue Breakdown',

  // Knowledge Base
  kbSearch: 'Search articles, topics, or keywords…',
  kbAllTopics: 'All Topics',
  kbPopularArticles: 'Popular Articles',
  kbJustAdded: 'Just Added',
  kbCategoryFilter: 'Filter by Category',
  kbReadMore: 'Read More',
  kbBackToList: 'Back to Articles',
  kbFaqs: 'Frequently Asked Questions',
  kbRelatedTopics: 'Related Topics',
  kbViewCount: 'views',
  kbHelpful: 'Was this article helpful?',
  kbYes: 'Yes',
  kbNo: 'No',

  // Common actions
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  add: 'Add',
  view: 'View',
  download: 'Download',
  upload: 'Upload',
  submit: 'Submit',
  approve: 'Approve',
  reject: 'Reject',
  close: 'Close',
  print: 'Print',
  share: 'Share',

  // Status labels
  statusPending: 'Pending',
  statusApproved: 'Approved',
  statusRejected: 'Rejected',
  statusActive: 'Active',
  statusClosed: 'Closed',
  statusOpen: 'Open',

  // Policy types
  motor: 'Motor',
  health: 'Health',
  life: 'Life',
  term: 'Term',
  home: 'Home',
  travel: 'Travel',

  // Misc
  welcome: 'Welcome',
  noData: 'No data available',
  loading: 'Loading…',
  error: 'An error occurred',
  language: 'Language',
};

// ── Tamil Translations ──────────────────────────────────────────────────────
const translationTA = {
  // Navigation
  dashboard: 'டாஷ்போர்டு',
  ownerDashboard: 'உரிமையாளர் டாஷ்போர்டு',
  employeeDashboard: 'பணியாளர் டாஷ்போர்டு',
  approvals: 'அனுமதிகள்',
  customers: 'வாடிக்கையாளர்கள்',
  newCustomer: 'புதிய வாடிக்கையாளர்',
  claims: 'கோரிக்கைகள்',
  leads: 'லீட்ஸ்',
  renewals: 'புதுப்பித்தல்கள்',
  commissions: 'கமிஷன்கள்',
  employees: 'பணியாளர்கள்',
  documents: 'ஆவணங்கள்',
  familyTree: 'குடும்ப மரம்',
  auditLogs: 'தணிக்கை பதிவுகள்',
  knowledgeBase: 'அறிவுத் தளம்',
  policyAssistant: 'பாலிசி உதவியாளர்',
  analytics: 'பகுப்பாய்வு',
  compliance: 'இணக்கம்',
  settings: 'அமைப்புகள்',
  profile: 'சுயவிவரம்',
  logout: 'வெளியேறு',
  search: 'தேடு',

  // Dashboard metrics
  overview: 'மேலோட்டம்',
  totalRevenue: 'மொத்த வருவாய்',
  activePolicies: 'செயலில் உள்ள பாலிசிகள்',
  pendingApprovals: 'நிலுவையிலுள்ள அனுமதிகள்',
  recentActivity: 'சமீபத்திய செயல்பாடு',
  totalCustomers: 'மொத்த வாடிக்கையாளர்கள்',
  totalClaims: 'மொத்த கோரிக்கைகள்',
  totalLeads: 'மொத்த லீட்ஸ்',
  commissionEarned: 'ஈட்டிய கமிஷன்',

  // Analytics & Exports
  exportPdf: 'PDF அறிக்கை',
  exportExcel: 'Excel அறிக்கை',
  businessOverview: 'வணிக மேலோட்டம்',
  policyMix: 'பாலிசி கலவை',
  revenueBreakdown: 'வருவாய் விவரம்',

  // Knowledge Base
  kbSearch: 'கட்டுரைகள், தலைப்புகள் அல்லது முக்கியச் சொற்களைத் தேடுங்கள்…',
  kbAllTopics: 'அனைத்து தலைப்புகள்',
  kbPopularArticles: 'பிரபலமான கட்டுரைகள்',
  kbJustAdded: 'புதிதாக சேர்க்கப்பட்டது',
  kbCategoryFilter: 'வகை வாரியாக வடிகட்டு',
  kbReadMore: 'மேலும் படிக்கவும்',
  kbBackToList: 'கட்டுரைகளுக்கு திரும்பு',
  kbFaqs: 'அடிக்கடி கேட்கப்படும் கேள்விகள்',
  kbRelatedTopics: 'தொடர்புடைய தலைப்புகள்',
  kbViewCount: 'பார்வைகள்',
  kbHelpful: 'இந்தக் கட்டுரை உதவியாக இருந்ததா?',
  kbYes: 'ஆம்',
  kbNo: 'இல்லை',

  // Common actions
  save: 'சேமி',
  cancel: 'ரத்துசெய்',
  delete: 'நீக்கு',
  edit: 'திருத்து',
  add: 'சேர்',
  view: 'பார்',
  download: 'பதிவிறக்கு',
  upload: 'பதிவேற்று',
  submit: 'சமர்ப்பி',
  approve: 'அனுமதி',
  reject: 'நிராகரி',
  close: 'மூடு',
  print: 'அச்சிடு',
  share: 'பகிர்',

  // Status labels
  statusPending: 'நிலுவையில்',
  statusApproved: 'அனுமதிக்கப்பட்டது',
  statusRejected: 'நிராகரிக்கப்பட்டது',
  statusActive: 'செயலில்',
  statusClosed: 'மூடப்பட்டது',
  statusOpen: 'திறந்த',

  // Policy types
  motor: 'மோட்டார்',
  health: 'உடல்நலம்',
  life: 'வாழ்க்கை',
  term: 'கால',
  home: 'இல்லம்',
  travel: 'பயணம்',

  // Misc
  welcome: 'வரவேற்கிறோம்',
  noData: 'தரவு இல்லை',
  loading: 'ஏற்றுகிறது…',
  error: 'பிழை ஏற்பட்டது',
  language: 'மொழி',
};

const resources = {
  en: { translation: translationEN },
  ta: { translation: translationTA },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',         // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
