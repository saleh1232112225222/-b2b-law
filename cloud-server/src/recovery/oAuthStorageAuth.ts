export interface OAuthTokenConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  tokenEndpoint: string
}

export interface TokenResponse {
  access_token: string
  expires_in?: number
  token_type?: string
}

export class OAuthTokenManager {
  private cachedToken: string | null = null
  private expiresAt: number = 0

  constructor(private readonly config: OAuthTokenConfig) {}

  async getAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.cachedToken && this.expiresAt > now + 60_000) {
      return this.cachedToken
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
      grant_type: 'refresh_token'
    })

    const res = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    if (!res.ok) {
      throw new Error(`OAUTH_REFRESH_FAILED:${res.status}`)
    }

    const data = (await res.json()) as TokenResponse
    if (!data.access_token) {
      throw new Error('OAUTH_ACCESS_TOKEN_MISSING')
    }

    this.cachedToken = data.access_token
    const expiresInSec = data.expires_in || 3600
    this.expiresAt = now + expiresInSec * 1000

    return this.cachedToken
  }

  static createGoogleTokenManager(clientId: string, clientSecret: string, refreshToken: string): OAuthTokenManager {
    return new OAuthTokenManager({
      clientId,
      clientSecret,
      refreshToken,
      tokenEndpoint: 'https://oauth2.googleapis.com/token'
    })
  }

  static createMicrosoftTokenManager(clientId: string, clientSecret: string, refreshToken: string, tenant: string = 'common'): OAuthTokenManager {
    return new OAuthTokenManager({
      clientId,
      clientSecret,
      refreshToken,
      tokenEndpoint: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`
    })
  }
}
