'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

/**
 * Shown by src/app/admin/layout.tsx in place of {children} whenever
 * verifyAdmin() fails server-side. Reproduces the exact
 * .container > .section-card.login-card DOM nesting the old inline login
 * screen used — that nesting is load-bearing: .login-card .btn-gold is a
 * real CSS selector (tailwind.css) special-cased because this button
 * renders outside .admin-container.
 */
export function AdminLoginGate() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // The layout's auth check is server-side (verifyAdmin() in an
        // async Server Component); refresh() re-runs it so the originally
        // requested /admin/* route renders instead of always bouncing to
        // /admin.
        router.refresh();
      } else {
        const data = await response.json();
        setLoginError(data.error || 'Contraseña incorrecta');
        setLoginLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoginError('Error de servidor. Inténtalo de nuevo.');
      setLoginLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '85vh' }}>
      <div className="section-card login-card">
        <div className="location-icon">
          <Lock size={36} />
        </div>
        <span className="section-subtitle" style={{ marginBottom: '0.5rem' }}>Administración</span>
        <h2 className="section-title" style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Panel de Control</h2>

        <form onSubmit={handleLogin} style={{ textAlign: 'left', marginTop: '1rem' }}>
          <div className="rsvp-form-group">
            <label className="rsvp-label" htmlFor="admin-pwd">Contraseña de Acceso</label>
            <input
              id="admin-pwd"
              type="password"
              className="rsvp-input"
              placeholder="Escribe la contraseña..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loginLoading}
            />
          </div>

          {loginError && (
            <p style={{ color: '#B22222', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>
              {loginError}
            </p>
          )}

          <button
            type="submit"
            className="btn-gold"
            style={{ width: '100%' }}
            disabled={loginLoading}
          >
            {loginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
