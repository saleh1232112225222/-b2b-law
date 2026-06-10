import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { ar, en } from 'vuetify/locale'
import '@mdi/font/css/materialdesignicons.css'

const navy = '#1A437D'
const gold = '#E9C349'
const goldDark = '#B8941E'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  locale: {
    locale: 'ar',
    fallback: 'en',
    messages: { ar, en },
    rtl: {
      ar: true
    }
  },
  defaults: {
    VCard: {
      flat: true,
      border: true,
      class: 'glass-card'
    },
    VBtn: {
      elevation: 0,
      variant: 'flat',
      class: 'rounded-lg font-weight-bold'
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },
    VDataTable: {
      density: 'comfortable',
      hover: true
    },
    VDialog: {
      maxWidth: '600'
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: navy,
          'primary-dark': '#0F2A55',
          'primary-light': '#8FB0E8',
          'on-primary': '#FFFFFF',
          secondary: '#EFF2F7',
          'secondary-dark': '#D1D9E6',
          accent: gold,
          'on-accent': '#0F172A',
          gold: goldDark,
          'gold-light': '#F5D94E',
          background: '#F4F6FA',
          'background-dark': '#E8ECF2',
          surface: '#FFFFFF',
          'surface-variant': '#F8FAFC',
          'on-surface': '#0F172A',
          'on-surface-variant': '#475569',
          info: '#3B82F6',
          'info-light': '#DBEAFE',
          success: '#059669',
          'success-light': '#D1FAE5',
          warning: '#D97706',
          'warning-light': '#FEF3C7',
          error: '#DC2626',
          'error-light': '#FEE2E2',
          'sidebar-bg': '#0F2A55',
          'sidebar-hover': 'rgba(233, 195, 73, 0.12)'
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: gold,
          'primary-dark': '#B38B2D',
          'primary-light': '#FFF3C4',
          'on-primary': '#0F172A',
          secondary: '#131D30',
          'secondary-dark': '#0A1120',
          accent: gold,
          'on-accent': '#0F172A',
          gold: gold,
          'gold-light': '#FFF3C4',
          background: '#080E1A',
          'background-dark': '#040810',
          surface: '#0D1526',
          'surface-variant': '#131D30',
          'on-surface': '#F1F5F9',
          'on-surface-variant': '#94A3B8',
          info: '#60A5FA',
          'info-light': '#1E3A5F',
          success: '#34D399',
          'success-light': '#064E3B',
          warning: '#FBBF24',
          'warning-light': '#5C3D0E',
          error: '#F87171',
          'error-light': '#5C1010',
          'sidebar-bg': '#060C18',
          'sidebar-hover': 'rgba(233, 195, 73, 0.12)'
        }
      }
    }
  }
})
