/// <reference types="vite/client" />

declare module '*.json' {
  const value: any
  export default value
}

declare const __IS_WEB__: boolean
declare const __API_BASE_URL__: string

interface Window {
  ipcRenderer?: {
    invoke(channel: string, ...args: any[]): Promise<any>
    on(channel: string, listener: (...args: any[]) => void): void
    send(channel: string, ...args: any[]): void
    removeListener(channel: string, listener: (...args: any[]) => void): void
  }
  api?: any
}
