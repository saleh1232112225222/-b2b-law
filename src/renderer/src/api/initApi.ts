import api, { setApiMode, setCloudBaseUrl } from './ApiAdapter'

export function initApiAdapter(): void {
  const isWeb = typeof __IS_WEB__ !== 'undefined' && __IS_WEB__

  if (isWeb) {
    setApiMode('cloud')
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    setCloudBaseUrl(isLocalhost ? '/api' : __API_BASE_URL__ || '/api')
    window.api = api
  }
}
