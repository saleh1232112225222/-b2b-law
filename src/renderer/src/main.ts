import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'
import { initApiAdapter } from './api/initApi'

import './assets/main.css'
import './assets/responsive.css'
import './assets/tailwind.css'

// Initialize API mode: Cloud (Web) or Desktop (Electron IPC)
initApiAdapter()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')

// ---------- Protection against unwanted reloads ----------
/**
 * Prevent any unauthorized call to `location.reload()`.
 * Only allow reloads that originate from internal functions such as `runAutoRefresh`.
 */
try {
  const originalReload = window.location.reload.bind(window);
  Object.defineProperty(window.location, 'reload', {
    writable: false,
    configurable: false,
    value: function () {
      const stack = new Error().stack || '';
      const allowed = stack.includes('runAutoRefresh') || stack.includes('refreshTimer');
      if (allowed) {
        originalReload();
      } else {
        console.warn('[Protection] Blocked unauthorized location.reload call');
      }
    }
  });
} catch { /* location.reload is read-only in some environments */ }
// -----------------------------------------------------------

// Setup responsive data-label attributes for tables
function setupResponsiveTables(): void {
  const tables = document.querySelectorAll('.v-data-table table, .v-table table')
  tables.forEach((table) => {
    const headerRow = table.querySelector('thead tr')
    if (!headerRow) return
    const headers = Array.from(headerRow.querySelectorAll('th')).map((th) => {
      const titleEl = th.querySelector('.v-data-table-header__content, .v-table-header__content')
      return (titleEl || th).textContent?.trim() || ''
    })
    const rows = table.querySelectorAll('tbody tr')
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td')
      cells.forEach((cell, index) => {
        if (headers[index] && !cell.hasAttribute('data-label')) {
          cell.setAttribute('data-label', headers[index])
        }
      })
    })
  })
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupResponsiveTables)
  const observer = new MutationObserver(setupResponsiveTables)
  observer.observe(document.body, { childList: true, subtree: true })
}

if (import.meta.env.DEV) {
  setTimeout(() => {
    // @ts-ignore
    window.api.system.runDiagnostics().then((data) => {
      console.log(
        '%c 🛡️ B2B LAWYER PRO - DIAGNOSTICS REPORT',
        'color: #2ecc71; font-weight: bold; font-size: 14px;'
      )
      console.table(data)

      if (data.mode === 'INSTALLED (AppData/UAC)' && data.activePath.includes('Program Files')) {
        console.error('❌ CRITICAL ERROR: App is writing to Program Files! Path override failed.')
      } else {
        console.log('✅ PATH SYSTEM: Healthy and Secure.')
      }
    })
  }, 250)
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.altKey && e.shiftKey && e.code === 'KeyS') {
    e.preventDefault()
    // @ts-ignore
    window.api.system.captureScreenshot()
  }
})

const withTimeout = async <T>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: any = null
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`انتهت مهلة ${label} (${ms / 1000}s)`)), ms)
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const clearLocalAuth = (): void => {
  localStorage.removeItem('web_isLoggedIn')
  localStorage.removeItem('web_currentUser')
  localStorage.removeItem('web_currentUserSession')
  window.dispatchEvent(new Event('auth-changed'))
}

const bootstrapAuth = async (): Promise<void> => {
  try {
    if (localStorage.getItem('web_isLoggedIn') !== 'true') return
    await router.isReady()

    // Skip backend session verification for mock/dev bypass tokens
    if (import.meta.env.VITE_USE_MOCK_OTP === 'true') {
      return
    }

    const session: any = await withTimeout(window.api.auth.getSession(), 5000, 'التحقق من الجلسة')
    if (!session) {
      clearLocalAuth()
      await router.replace('/login')
      return
    }

    localStorage.setItem('web_currentUserSession', JSON.stringify(session))
    localStorage.setItem(
      'web_currentUser',
      JSON.stringify({ username: session.username, roleKey: session.roleKey })
    )
    window.dispatchEvent(new Event('auth-changed'))

    if ((session as any).isLocked && router.currentRoute.value.path !== '/lock') {
      await router.replace('/lock')
      return
    }

    if (router.currentRoute.value.path !== '/vault-setup') {
      try {
        const r = (await withTimeout(
          (window as any).api.vault.needsSetup(),
          4000,
          'فحص خزانة المكتب'
        )) as any
        if (r?.needsSetup) {
          await router.replace('/vault-setup')
        }
      } catch {}
    }
  } catch {
    clearLocalAuth()
    try {
      await router.replace('/login')
    } catch {}
  }
}

const sandboxAutoRun = async (): Promise<void> => {
  try {
    if (!import.meta.env.DEV) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('sandbox') !== '1' || params.get('autorun') !== '1') return

    let session: any = null
    try {
      session = await window.api.auth.login('admin', 'admin')
    } catch {
      session = await (window as any).api.auth.devForceLogin('admin')
    }
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ username: session.username, roleKey: session.roleKey })
    )
    localStorage.setItem('currentUserSession', JSON.stringify(session))
    window.dispatchEvent(new Event('auth-changed'))

    if (params.get('stress') === '1' && localStorage.getItem('sandboxStressGenerated') !== 'true') {
      try {
        await (window as any).api.system.generateStressData()
      } catch {}
      localStorage.setItem('sandboxStressGenerated', 'true')
    }

    await router.isReady()
    const pages: Array<{ tag: string; path: string }> = [
      { tag: 'clients', path: '/clients' },
      { tag: 'defendants', path: '/defendants' },
      { tag: 'poa', path: '/poa' },
      { tag: 'cases', path: '/cases' }
    ]

    for (const p of pages) {
      console.log('[SANDBOX] nav:', p.path)
      try {
        await router.push(p.path)
      } catch {}
      await new Promise((r) => setTimeout(r, 2200))
      try {
        const shot = await (window as any).api.system.captureScreenshotAuto(p.tag)
        if (shot?.saved && shot?.path) {
          console.log('[SANDBOX] screenshot saved:', shot.path)
        }
      } catch {}
    }
  } catch (e) {
    console.error('[SANDBOX] failed', e)
  }
}

sandboxAutoRun()
bootstrapAuth()
