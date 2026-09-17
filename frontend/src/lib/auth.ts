export type UserRole = 'merchant' | 'partner';

export interface Session {
  role: UserRole;
  email: string;
  name: string;
  token: string;
  tenant_id?: string;
}

const SESSION_KEY = 'lanjut_session';

export function saveSession(session: Session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

interface CredentialsPayload {
  email: string;
  password: string;
  role: UserRole;
}

/**
 * Step 1 of 2FA login: POST /api/auth/login with email+password+role.
 * On success the backend emails a 6-digit OTP (via Mailjet) and responds
 * { status: "OTP_REQUIRED" } — no session yet. Throws on invalid credentials
 * or if the backend/Mailjet isn't reachable, so the caller can show a real
 * error instead of silently falling back to a demo session.
 */
export async function requestOtp({ email, password, role }: CredentialsPayload): Promise<{ message?: string; demo_otp?: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Email atau kata sandi salah.');
  }
  return data || {};
}

interface VerifyOtpPayload {
  email: string;
  otp: string;
  role: UserRole;
}

/**
 * Step 2 of 2FA login: POST /api/auth/verify-otp with the code from email.
 * On success the backend issues a session token; this saves it locally and
 * returns the Session for the caller to redirect with.
 */
export async function verifyOtp({ email, otp, role }: VerifyOtpPayload): Promise<Session> {
  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Kode OTP salah atau kedaluwarsa.');
  }

  const data = await res.json();
  const session: Session = {
    role,
    email,
    name: data.name || email.split('@')[0],
    token: data.token,
    tenant_id: data.tenant_id || undefined,
  };
  saveSession(session);
  return session;
}
