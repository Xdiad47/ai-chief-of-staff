const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Send a 6-digit OTP to the given email address.
 */
export async function sendOtp(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to send OTP');
  }
  return data;
}

/**
 * Verify the 6-digit OTP for the given email.
 */
export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ verified: boolean }> {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Invalid or expired OTP');
  }
  return data;
}

/**
 * Register a new company (multipart/form-data with logo file).
 * Returns { success, company_id, trial_ends_at }.
 */
export async function registerCompany(
  formData: FormData
): Promise<{ success: boolean; company_id: string; trial_ends_at: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: formData, // Let the browser set the Content-Type + boundary automatically
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Registration failed');
  }
  return data;
}
