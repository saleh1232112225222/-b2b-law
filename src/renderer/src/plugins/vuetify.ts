import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { ar, en } from 'vuetify/locale'
import '@mdi/font/css/materialdesignicons.css'

const navy = '#1F2A44'
const gold = '#B08A2E'
const goldDark = '#8A6A20'

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
          'primary-dark': '#141B2D',
          'primary-light': '#2A3B5F',
          'on-primary': '#FFFFFF',
          secondary: '#F8F7F3',
          'secondary-dark': '#E5E1D8',
          accent: gold,
          'on-accent': '#FFFFFF',
          gold: gold,
          'gold-light': '#F3E8C8',
          background: '#F8F7F3',
          'background-dark': '#EFECE6',
          surface: '#FFFFFF',
          'surface-variant': '#F7F3E8',
          'on-surface': '#1F2A44',
          'on-surface-variant': '#73777D',
          info: '#1F2A44',
          'info-light': '#E8EEF5',
          success: '#2E7D5B',
          'success-light': '#E8F5E9',
          warning: '#D97706',
          'warning-light': '#FEF3C7',
          error: '#C94A4A',
          'error-light': '#FFEBEE',
          'sidebar-bg': '#1F2A44',
          'sidebar-hover': 'rgba(176, 138, 46, 0.15)'
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
