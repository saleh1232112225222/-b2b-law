export interface Alert {
  id: string
  case_id: string
  severity: 'error' | 'warning' | 'info'
  type: 'session' | 'task' | 'general'
  title: string
  subtitle: string
}
