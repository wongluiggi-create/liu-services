import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';

// ─── Error messages ───────────────────────────────────────────────────────────

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found': 'No existe una cuenta con este correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Este correo ya tiene una cuenta registrada.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'El formato del correo no es válido.',
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de completar.',
    'auth/cancelled-popup-request': 'Operación cancelada.',
    'auth/network-request-failed': 'Sin conexión. Verifica tu internet.',
  };
  return map[code] ?? 'Ocurrió un error inesperado. Intenta nuevamente.';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearError = () => setError('');

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    clearError();
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    clearError();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => (m === 'login' ? 'register' : 'login'));
    clearError();
  };

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[#FFCC00] flex items-center justify-center shadow-lg shadow-[#FFCC00]/20">
            <span className="text-[#111111] font-black text-xl tracking-tight">LIU</span>
          </div>
        </div>

        <div className="bg-[#1C1C1C] rounded-2xl border border-[#7F54F5]/20 p-6 flex flex-col gap-5">

          {/* Heading */}
          <div>
            <h1 className="text-gray-100 font-bold text-lg">
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">Liu Agency · Servicios</p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-10 rounded-lg border border-[#7F54F5]/30 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#7F54F5]/20" />
            <span className="text-gray-600 text-xs">o con correo</span>
            <div className="flex-1 h-px bg-[#7F54F5]/20" />
          </div>

          {/* Email + password */}
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="correo@ejemplo.cl"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="h-10 w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors"
            />
            <input
              type="password"
              placeholder="contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="h-10 w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleEmailAuth}
            disabled={loading || !email.trim() || !password}
            className="h-10 w-full rounded-lg bg-[#FD8000] text-white text-sm font-semibold hover:bg-[#E57200] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>

          {/* Switch mode */}
          <p className="text-center text-xs text-gray-500">
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button
              onClick={switchMode}
              className="text-[#FFCC00] hover:underline font-medium"
            >
              {mode === 'login' ? 'Créala gratis' : 'Iniciar sesión'}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-700 mt-6">
          Liu Agency © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
