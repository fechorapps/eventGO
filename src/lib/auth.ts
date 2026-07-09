import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function verifyAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return false;

    const correctPassword = process.env.ADMIN_PASSWORD || 'bautizo2026';
    const expectedHash = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'supersecretjwtkeyforbautizo2026')
      .update(correctPassword)
      .digest('hex');

    return token === expectedHash;
  } catch (error) {
    console.error('Error verifying admin session:', error);
    return false;
  }
}
