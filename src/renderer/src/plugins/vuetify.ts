import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { ar, en } from 'vuetify/locale'
import '@mdi/font/css/materialdesignicons.css'

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
      class: 'rounded-lg'
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
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1A437D',
          'primary-dark': '#0F2A55',
          'primary-light': '#8FB0E8',
          secondary: '#EFF2F7',
          accent: '#1A437D',
          gold: '#B8941E',
          background: '#F4F6FA',
          surface: '#FFFFFF',
          info: '#3B82F6',
          success: '#059669',
          warning: '#F59E0B',
          error: '#DC2626'
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#E9C349',
          'primary-dark': '#B38B2D',
          'primary-light': '#FFF3C4',
          secondary: '#131D30',
          accent: '#E9C349',
          gold: '#E9C349',
          background: '#080E1A',
          surface: '#0D1526',
          info: '#60A5FA',
          success: '#34D399',
          warning: '#FBBF24',
          error: '#F87171'
        }
      }
    }
  }
})
