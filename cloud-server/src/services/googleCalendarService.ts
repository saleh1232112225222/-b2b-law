import { query } from '../db/connection'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'b2b-law-google-client-id'
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

export interface SanitizedCalendar {
  id: string
  summary: string
  description: string
  primary: boolean
  timeZone: string
  accessRole: string
}

export interface GoogleIntegrationStatus {
  connected: boolean
  googleEmail: string | null
  selectedCalendarId: string | null
  selectedCalendarSummary: string | null
  tokenStatus: 'valid' | 'expired' | 'disconnected'
  needsReauthorization: boolean
  error?: string
}

export class GoogleCalendarService {
  /**
   * Helper to retrieve a valid access token.
   * If expired or missing, attempts to refresh using refresh_token once.
   * Never exposes tokens or secrets to logs or frontend.
   */
  static async getValidAccessToken(
    companyId: string,
    userId?: string
  ): Promise<{ accessToken: string | null; config: any; needsReauth: boolean; error?: string }> {
    let dbRes = userId
      ? await query(
          `SELECT config_data, status FROM office_integrations 
           WHERE company_id = $1 AND service_name = 'google_calendar' AND user_id = $2 AND status = 'connected'`,
          [companyId, userId]
        )
      : { rows: [] }

    if (dbRes.rows.length === 0) {
      dbRes = await query(
        `SELECT config_data, status FROM office_integrations 
         WHERE company_id = $1 AND service_name = 'google_calendar' AND status = 'connected'
         ORDER BY user_id NULLS LAST LIMIT 1`,
        [companyId]
      )
    }

    if (dbRes.rows.length === 0 || dbRes.rows[0].status !== 'connected') {
      return {
        accessToken: null,
        config: {},
        needsReauth: false,
        error: 'الخدمة غير مربوطة بحساب Google'
      }
    }

    const row = dbRes.rows[0]
    const config = row.config_data || {}
    let accessToken: string | null = config.accessToken || null
    const refreshToken: string | null = config.refreshToken || null
    const authorizedAt: string | null = config.authorizedAt || null

    // Check token age (Google access tokens expire in 3600 seconds)
    const isExpired =
      !authorizedAt ||
      !accessToken ||
      accessToken.startsWith('oauth_at_') ||
      Date.now() - new Date(authorizedAt).getTime() > 45 * 60 * 1000

    if (!isExpired && accessToken) {
      return { accessToken, config, needsReauth: false }
    }

    // Attempt Refresh Token Exchange if token is expired
    if (!refreshToken || refreshToken.startsWith('oauth_rt_')) {
      // Demo mode or missing real refresh token
      if (accessToken && !accessToken.startsWith('oauth_at_')) {
        return { accessToken, config, needsReauth: false }
      }
      return {
        accessToken: null,
        config,
        needsReauth: true,
        error: 'انتهت صلاحية جلسة الوصول، يرجى إعادة التفويض'
      }
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      })

      const data: any = await response.json()

      if (response.ok && data.access_token) {
        const newAccessToken = data.access_token
        const nowIso = new Date().toISOString()
        const updatedConfig = {
          ...config,
          accessToken: newAccessToken,
          authorizedAt: nowIso,
          needsReauthorization: false
        }

        await query(
          `UPDATE office_integrations 
           SET config_data = $1, updated_at = NOW() 
           WHERE company_id = $2 AND service_name = 'google_calendar'`,
          [JSON.stringify(updatedConfig), companyId]
        )

        return { accessToken: newAccessToken, config: updatedConfig, needsReauth: false }
      } else {
        console.error('[GoogleCalendarService] Refresh token failed from Google API')
        const updatedConfig = { ...config, needsReauthorization: true }
        await query(
          `UPDATE office_integrations 
           SET config_data = $1, updated_at = NOW() 
           WHERE company_id = $2 AND service_name = 'google_calendar'`,
          [JSON.stringify(updatedConfig), companyId]
        )

        return {
          accessToken: null,
          config: updatedConfig,
          needsReauth: true,
          error: 'فشل تجديد جلسة الوصول عبر Google. يرجى إعادة التفويض.'
        }
      }
    } catch (err: any) {
      console.error('[GoogleCalendarService] Network error during token refresh:', err?.message || err)
      return {
        accessToken: null,
        config,
        needsReauth: true,
        error: 'تعذر الاتصال بـ Google لتجديد الجلسة'
      }
    }
  }

  /**
   * Fetches user's Google Calendars list safely from Google REST API.
   */
  static async fetchUserCalendars(
    companyId: string,
    userId?: string
  ): Promise<{ success: boolean; calendars: SanitizedCalendar[]; needsReauthorization: boolean; error?: string }> {
    const tokenInfo = await this.getValidAccessToken(companyId, userId)

    if (tokenInfo.needsReauth || !tokenInfo.accessToken) {
      return {
        success: false,
        calendars: [],
        needsReauthorization: tokenInfo.needsReauth,
        error: tokenInfo.error || 'يتطلب إكمال تفويض Google'
      }
    }

    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          Authorization: `Bearer ${tokenInfo.accessToken}`,
          Accept: 'application/json'
        }
      })

      if (res.status === 401) {
        // Retry once after forced refresh
        console.warn('[GoogleCalendarService] 401 received from Calendar API. Attempting forced refresh...')
        const forcedToken = await this.getValidAccessToken(companyId, userId)
        if (!forcedToken.accessToken) {
          return { success: false, calendars: [], needsReauthorization: true, error: 'انتهت الجلسة' }
        }
        const retryRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: {
            Authorization: `Bearer ${forcedToken.accessToken}`,
            Accept: 'application/json'
          }
        })
        if (!retryRes.ok) {
          return { success: false, calendars: [], needsReauthorization: true, error: 'فشل التوثيق مع Google' }
        }
        const retryData: any = await retryRes.json()
        const calendars = this.sanitizeCalendarList(retryData.items || [])
        return { success: true, calendars, needsReauthorization: false }
      }

      if (res.status === 403) {
        return {
          success: false,
          calendars: [],
          needsReauthorization: false,
          error: 'صلاحيات الحساب غير كافية للوصول لتقويم Google'
        }
      }

      if (!res.ok) {
        const errBody = await res.text()
        console.error('[GoogleCalendarService] Failed fetching calendarList:', res.status, errBody)
        return { success: false, calendars: [], needsReauthorization: false, error: 'فشل جلب التقاويم' }
      }

      const data: any = await res.json()
      const calendars = this.sanitizeCalendarList(data.items || [])
      return { success: true, calendars, needsReauthorization: false }
    } catch (err: any) {
      console.error('[GoogleCalendarService] Exception in fetchUserCalendars:', err?.message || err)
      return { success: false, calendars: [], needsReauthorization: false, error: 'خطأ في الاتصال بالشبكة' }
    }
  }

  /**
   * Selects a calendar and validates that it exists in the user's Google Calendar list.
   */
  static async selectCalendar(
    companyId: string,
    calendarId: string,
    userId?: string
  ): Promise<{ success: boolean; selectedCalendarId?: string; syncedCount?: number; error?: string }> {
    if (!calendarId || typeof calendarId !== 'string') {
      return { success: false, error: 'معرف التقويم غير صحيح' }
    }

    const listRes = await this.fetchUserCalendars(companyId, userId)
    if (!listRes.success) {
      return { success: false, error: listRes.error || 'تعذر التحقق من التقاويم المتاحة' }
    }

    const targetCal = listRes.calendars.find((c) => c.id === calendarId)
    if (!targetCal) {
      return { success: false, error: 'التقويم المحدد غير موجود ضمن قائمة تقاويم حساب Google الخاص بك' }
    }

    const dbRes = await query(
      `SELECT config_data FROM office_integrations WHERE company_id = $1 AND service_name = 'google_calendar'`,
      [companyId]
    )

    if (dbRes.rows.length === 0) {
      return { success: false, error: 'الخدمة غير مربوطة' }
    }

    const config = dbRes.rows[0].config_data || {}
    const updatedConfig = {
      ...config,
      selectedCalendarId: targetCal.id,
      selectedCalendarSummary: targetCal.summary
    }

    await query(
      `UPDATE office_integrations 
       SET config_data = $1, updated_at = NOW() 
       WHERE company_id = $2 AND service_name = 'google_calendar'`,
      [JSON.stringify(updatedConfig), companyId]
    )

    // Automatically trigger batch sync for upcoming sessions to the newly selected calendar
    const syncRes = await this.syncUpcomingSessions(companyId, userId)

    return {
      success: true,
      selectedCalendarId: targetCal.id,
      syncedCount: syncRes.syncedCount
    }
  }

  /**
   * Retrieves sanitized integration status for the current user/company.
   */
  static async getStatus(companyId: string, userId?: string): Promise<GoogleIntegrationStatus> {
    let dbRes = userId
      ? await query(
          `SELECT config_data, status FROM office_integrations 
           WHERE company_id = $1 AND service_name = 'google_calendar' AND user_id = $2 AND status = 'connected'`,
          [companyId, userId]
        )
      : { rows: [] }

    if (dbRes.rows.length === 0) {
      dbRes = await query(
        `SELECT config_data, status FROM office_integrations 
         WHERE company_id = $1 AND service_name = 'google_calendar' AND status = 'connected'
         ORDER BY user_id NULLS LAST LIMIT 1`,
        [companyId]
      )
    }

    if (dbRes.rows.length === 0 || dbRes.rows[0].status !== 'connected') {
      return {
        connected: false,
        googleEmail: null,
        selectedCalendarId: null,
        selectedCalendarSummary: null,
        tokenStatus: 'disconnected',
        needsReauthorization: false
      }
    }

    const config = dbRes.rows[0].config_data || {}
    const needsReauth = Boolean(config.needsReauthorization)

    return {
      connected: true,
      googleEmail: config.accountEmail || null,
      selectedCalendarId: config.selectedCalendarId || 'primary',
      selectedCalendarSummary: config.selectedCalendarSummary || 'التقويم الأساسي الافتراضي (Primary)',
      tokenStatus: needsReauth ? 'expired' : 'valid',
      needsReauthorization: needsReauth
    }
  }

  /**
   * Phase 2-A: Creates an event in Google Calendar.
   * Prevents duplicate event creation if existingGoogleEventId is already provided.
   */
  static async createCalendarEvent(
    companyId: string,
    eventData: {
      summary: string
      description?: string
      location?: string
      startTime: string
      endTime?: string
      existingGoogleEventId?: string
    },
    userId?: string
  ): Promise<{ success: boolean; googleEventId?: string; reason?: string; error?: string }> {
    if (eventData.existingGoogleEventId) {
      return { success: true, googleEventId: eventData.existingGoogleEventId }
    }

    const tokenInfo = await this.getValidAccessToken(companyId, userId)
    if (tokenInfo.needsReauth || !tokenInfo.accessToken) {
      return { success: false, reason: 'not_connected', error: tokenInfo.error || 'الخدمة غير متصلة' }
    }

    const status = await this.getStatus(companyId)
    if (!status.connected) {
      return { success: false, reason: 'not_connected', error: 'الخدمة غير متصلة' }
    }

    const calendarId = status.selectedCalendarId || 'primary'

    // Demo / Mock OAuth token fallback
    if (!tokenInfo.accessToken || tokenInfo.accessToken.startsWith('oauth_at_') || tokenInfo.accessToken.includes('MANUAL') || tokenInfo.accessToken.includes('DEMO')) {
      const mockEventId = eventData.existingGoogleEventId || `gcal_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      return { success: true, googleEventId: mockEventId }
    }

    try {
      const startTime = new Date(eventData.startTime as any)

      if (isNaN(startTime.getTime())) {
        return { success: false, reason: 'invalid_date', error: 'تاريخ الموعد غير صحيح' }
      }

      const endTime = eventData.endTime
        ? new Date(eventData.endTime)
        : new Date(startTime.getTime() + 60 * 60 * 1000) // Default 1 hour duration

      const bodyPayload = {
        summary: eventData.summary,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Riyadh'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Riyadh'
        }
      }

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenInfo.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(bodyPayload)
        }
      )

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error('[GoogleCalendarService] Failed to create event:', res.status, errText)
        return { success: false, reason: 'api_error', error: `Google API Error HTTP ${res.status}` }
      }

      const data: any = await res.json()
      return {
        success: true,
        googleEventId: data.id
      }
    } catch (err: any) {
      console.error('[GoogleCalendarService] Network error in createCalendarEvent:', err?.message || err)
      return { success: false, reason: 'network_error', error: 'خطأ في الشبكة أثناء إضافة الموعد لـ Google' }
    }
  }

  /**
   * Updates an existing event in Google Calendar.
   */
  static async updateCalendarEvent(
    companyId: string,
    googleEventId: string,
    eventData: {
      summary: string
      description?: string
      location?: string
      startTime: string
      endTime?: string
    },
    userId?: string
  ): Promise<{ success: boolean; reason?: string; error?: string }> {
    if (!googleEventId) {
      return { success: false, error: 'معرف الحدث غير موفر' }
    }

    const tokenInfo = await this.getValidAccessToken(companyId, userId)
    if (tokenInfo.needsReauth || !tokenInfo.accessToken) {
      return { success: false, reason: 'not_connected', error: tokenInfo.error || 'الخدمة غير متصلة' }
    }

    const status = await this.getStatus(companyId)
    if (!status.connected) {
      return { success: false, reason: 'not_connected', error: 'الخدمة غير متصلة' }
    }

    const calendarId = status.selectedCalendarId || 'primary'

    // Demo / Mock OAuth token fallback
    if (!tokenInfo.accessToken || tokenInfo.accessToken.startsWith('oauth_at_') || tokenInfo.accessToken.includes('MANUAL') || tokenInfo.accessToken.includes('DEMO')) {
      return { success: true }
    }

    try {
      const startTime = new Date(eventData.startTime)
      const endTime = eventData.endTime
        ? new Date(eventData.endTime)
        : new Date(startTime.getTime() + 60 * 60 * 1000)

      const bodyPayload = {
        summary: eventData.summary,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Riyadh'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Riyadh'
        }
      }

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${tokenInfo.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(bodyPayload)
        }
      )

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error('[GoogleCalendarService] Failed to update event:', res.status, errText)
        return { success: false, reason: 'api_error', error: `Google API Error HTTP ${res.status}` }
      }

      return { success: true }
    } catch (err: any) {
      console.error('[GoogleCalendarService] Network error in updateCalendarEvent:', err?.message || err)
      return { success: false, reason: 'network_error', error: 'خطأ في الشبكة أثناء تحديث الموعد بـ Google' }
    }
  }

  /**
   * Deletes an event from Google Calendar.
   */
  static async deleteCalendarEvent(
    companyId: string,
    googleEventId: string,
    userId?: string
  ): Promise<{ success: boolean; reason?: string; error?: string }> {
    if (!googleEventId) {
      return { success: true }
    }

    const tokenInfo = await this.getValidAccessToken(companyId, userId)
    if (tokenInfo.needsReauth || !tokenInfo.accessToken) {
      return { success: false, reason: 'not_connected', error: tokenInfo.error || 'الخدمة غير متصلة' }
    }

    const status = await this.getStatus(companyId)
    if (!status.connected) {
      return { success: false, reason: 'not_connected', error: 'الخدمة غير متصلة' }
    }

    const calendarId = status.selectedCalendarId || 'primary'

    // Demo / Mock OAuth token fallback
    if (!tokenInfo.accessToken || tokenInfo.accessToken.startsWith('oauth_at_') || tokenInfo.accessToken.includes('MANUAL') || tokenInfo.accessToken.includes('DEMO')) {
      return { success: true }
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${tokenInfo.accessToken}`
          }
        }
      )

      if (!res.ok && res.status !== 404 && res.status !== 410) {
        const errText = await res.text().catch(() => '')
        console.error('[GoogleCalendarService] Failed to delete event:', res.status, errText)
        return { success: false, reason: 'api_error', error: `Google API Error HTTP ${res.status}` }
      }

      return { success: true }
    } catch (err: any) {
      console.error('[GoogleCalendarService] Network error in deleteCalendarEvent:', err?.message || err)
      return { success: false, reason: 'network_error', error: 'خطأ في الشبكة أثناء حذف الموعد من Google' }
    }
  }

  /**
   * Syncs unsynced upcoming sessions to Google Calendar in batch.
   */
  static async syncUpcomingSessions(
    companyId: string,
    userId?: string
  ): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    const status = await this.getStatus(companyId)
    if (!status.connected) {
      return { success: false, syncedCount: 0, error: 'الخدمة غير متصلة' }
    }

    try {
      const sessionsRes = await query(
        `SELECT s.id, s.date, s.time, s.court_room, s.notes, s.google_event_id, c.case_number, c.title as case_title
         FROM sessions s
         LEFT JOIN cases c ON c.id = s.case_id
         WHERE s.company_id = $1 
           AND (s.is_archived = FALSE OR s.is_archived IS NULL)
         ORDER BY s.date ASC LIMIT 200`,
        [companyId]
      )

      let count = 0
      for (const sess of sessionsRes.rows) {
        let dateStr = ''
        if (sess.date instanceof Date) {
          dateStr = sess.date.toISOString().split('T')[0]
        } else if (typeof sess.date === 'string') {
          dateStr = sess.date.split('T')[0]
        } else {
          dateStr = String(sess.date || '').split('T')[0]
        }

        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue

        const sessionTime = sess.time || '09:00'
        const timeClean = sessionTime.length === 5 ? `${sessionTime}:00` : sessionTime
        const startTimeStr = `${dateStr}T${timeClean}`
        const summary = `جلسة قضائية: ${sess.case_title || sess.case_number || sess.court_room || 'جلسة محكمة'}`
        const description = `جلسة قضائية\nرقم القضية: ${sess.case_number || 'غير محدد'}\nعنوان القضية: ${sess.case_title || 'غير محدد'}\nالقاعة/المحكمة: ${sess.court_room || 'غير محدد'}\nملاحظات: ${sess.notes || 'لا يوجد'}`

        const createRes = await this.createCalendarEvent(
          companyId,
          {
            summary,
            description,
            location: sess.court_room || '',
            startTime: startTimeStr,
            existingGoogleEventId: sess.google_event_id
          },
          userId
        )

        if (createRes.success && createRes.googleEventId) {
          if (!sess.google_event_id) {
            await query(`UPDATE sessions SET google_event_id = $1 WHERE id = $2 AND company_id = $3`, [
              createRes.googleEventId,
              sess.id,
              companyId
            ])
          }
          count++
        }
      }

      await query(
        `UPDATE office_integrations SET last_sync_at = NOW(), updated_at = NOW() WHERE company_id = $1 AND service_name = 'google_calendar'`,
        [companyId]
      )

      return { success: true, syncedCount: count }
    } catch (err: any) {
      console.error('[GoogleCalendarService] Exception in syncUpcomingSessions:', err?.message || err)
      return { success: false, syncedCount: 0, error: 'تعذر تنفيذ المزامنة' }
    }
  }

  private static sanitizeCalendarList(items: any[]): SanitizedCalendar[] {
    return items.map((item) => ({
      id: item.id || '',
      summary: item.summary || item.id || 'تقويم بدون عنوان',
      description: item.description || '',
      primary: Boolean(item.primary),
      timeZone: item.timeZone || 'Asia/Riyadh',
      accessRole: item.accessRole || 'reader'
    }))
  }
}
