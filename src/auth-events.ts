export type AuthMode = 'login' | 'register'

export type AuthRequest = {
  mode: AuthMode
  redirect?: string
}

export function requestAuth(mode: AuthMode, redirect?: string) {
  window.dispatchEvent(new CustomEvent<AuthRequest>('kurio:auth', { detail: { mode, redirect } }))
}

export function rememberAuthRequest(request: AuthRequest) {
  sessionStorage.setItem('kurio.auth.pending', JSON.stringify(request))
}

export function consumeAuthRequest(): AuthRequest | null {
  const stored = sessionStorage.getItem('kurio.auth.pending')
  if (!stored) return null
  sessionStorage.removeItem('kurio.auth.pending')
  try { return JSON.parse(stored) as AuthRequest } catch { return null }
}
