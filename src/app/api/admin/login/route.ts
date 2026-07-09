import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.ADMIN_PASSWORD || 'bautizo2026';

    if (password === correctPassword) {
      const crypto = await import('crypto');
      const hash = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'supersecretjwtkeyforbautizo2026')
        .update(correctPassword)
        .digest('hex');

      const response = NextResponse.json({ success: true, token: hash });
      
      response.cookies.set('admin_token', hash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}
