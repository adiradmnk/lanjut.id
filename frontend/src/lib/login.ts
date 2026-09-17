export interface SignedInAccount {
  // Read the role from the verified account/session when Google Auth is added.
  role: unknown;
}

/**
 * Integration point for Google Auth, intentionally left unconfigured.
 * Return the signed-in account with its assigned role after verification.
 * Return null if sign-in is unavailable or cancelled.
 * This placeholder does not create a session or authenticate anyone.
 */
export async function signIn(): Promise<SignedInAccount | null> {
  return null;
}
