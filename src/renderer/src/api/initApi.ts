import api, { setApiMode, setCloudBaseUrl } from './ApiAdapter'

export function initApiAdapter(): void {
  const isWeb = typeof __IS_WEB__ !== 'undefined' && __IS_WEB__

  if (isWeb) {
    setApiMode('cloud')
    setCloudBaseUrl(__API_BASE_URL__ || '/api')
    window.api = api
  }
}
