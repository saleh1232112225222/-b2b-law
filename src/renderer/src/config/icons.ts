/**
 * B2B-LAW Semantic Icon Map
 * Unified icon dictionary for consistent visual language across the system.
 * Based on Lucide Icons library.
 */

export const ICONS = {
  // Navigation
  NAV: {
    DASHBOARD: 'layout-dashboard',
    CASES: 'briefcase',
    TASKS: 'clipboard-check',
    SESSIONS: 'calendar',
    FINANCE: 'banknote',
    REPORTS: 'file-bar-chart',
    VAULT: 'shield-check',
    SETTINGS: 'settings-2',
    CLIENTS: 'users',
    CONTRACTS: 'file-signature'
  },

  // Actions
  ACTION: {
    ADD: 'plus-circle',
    EDIT: 'edit-3',
    DELETE: 'trash-2',
    VIEW: 'eye',
    SAVE: 'save',
    CANCEL: 'x',
    PRINT: 'printer',
    EXPORT_PDF: 'file-text',
    EXPORT_CSV: 'file-spreadsheet',
    SEARCH: 'search',
    FILTER: 'filter',
    REFRESH: 'refresh-cw',
    LOGIN: 'log-in',
    LOGOUT: 'log-out',
    RESTORE: 'history',
    FIX: 'wand-2',
    UPLOAD: 'upload-cloud'
  },

  // Entities
  ENTITY: {
    CASE: 'gavel',
    USER: 'user',
    DOCUMENT: 'file',
    FOLDER: 'folder',
    NOTIFICATION: 'bell',
    MEMORANDUM: 'book-open',
    EXPERT: 'user-cog',
    ENFORCEMENT: 'shield-alert',
    DEFENDANT: 'user-x',
    CLIENT: 'user-check'
  },

  // Statuses
  STATUS: {
    SUCCESS: 'check-circle',
    WARNING: 'alert-triangle',
    ERROR: 'x-circle',
    INFO: 'info',
    PENDING: 'clock',
    LOCKED: 'lock',
    UNLOCKED: 'unlock',
    URGENT: 'alert-octagon',
    DELAY: 'clock-alert',
    DATABASE: 'database',
    SYNC: 'refresh-cw'
  },

  // UI Components
  UI: {
    CLOSE: 'x',
    CHEVRON_LEFT: 'chevron-left',
    CHEVRON_RIGHT: 'chevron-right',
    CHEVRON_DOWN: 'chevron-down',
    MENU: 'menu',
    MORE: 'more-horizontal',
    REORDER: 'grip-vertical',
    USER_PLUS: 'user-plus',
    EXTERNAL_LINK: 'external-link',
    LINK: 'link',
    SHARE: 'share-2',
    FOLDER_PLUS: 'folder-plus',
    FOLDER_OPEN: 'folder-open',
    PLUS: 'plus',
    MINUS: 'minus',
    CHECK: 'check',
    SEARCH: 'search',
    TAG: 'tag',
    PHONE: 'phone',
    EMAIL: 'mail',
    ID_CARD: 'id-card',
    MAP_PIN: 'map-pin',
    BIRTHDAY: 'cake',
    NOTE: 'sticky-note'
  },

  // Finance Specific
  FINANCE: {
    RECEIPT: 'receipt',
    BANKNOTE: 'banknote',
    INVOICE: 'file-text',
    CHART: 'pie-chart',
    WALLET: 'wallet',
    DOLLAR: 'circle-dollar-sign',
    CREDIT_CARD: 'credit-card',
    COINS: 'coins'
  },

  // Legal Specific
  LEGAL: {
    GAVEL: 'gavel',
    PHASE: 'milestone',
    ROLE: 'award',
    ASSESSMENT: 'file-search',
    REQUIREMENT: 'help-circle',
    PLAINTIFF: 'message-square',
    BANK: 'landmark',
    FILING: 'folder-kanban',
    SESSION: 'calendar-clock',
    MEMO: 'file-edit',
    JUDGMENT: 'file-check',
    APPEAL: 'shield-check',
    EXECUTION: 'handshake',
    ATTACHMENT: 'paperclip',
    TASK: 'clipboard-check',
    ENFORCEMENT: 'shield-alert',
    LOCATION: 'map-pin',
    PEOPLE: 'users',
    CASE: 'gavel'
  },

  // System Specific
  SYSTEM: {
    GAVEL: 'gavel',
    TIMELINE: 'git-branch',
    ENFORCEMENT: 'shield-alert',
    JUDGMENT: 'file-check',
    CALENDAR: 'calendar',
    PRINTER: 'printer',
    DELETE_ALERT: 'trash-2',
    SAVE_CHECK: 'check-circle',
    SYNC: 'refresh-cw'
  }
} as const

export type IconKey = typeof ICONS
