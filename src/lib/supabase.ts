import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Capture the callback before Auth initialization consumes its URL parameters.
// Only the one-time code and error metadata are retained; session tokens are not copied.
export const initialRecoveryRedirect = (() => {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const isResetPage = url.pathname === '/reset-password';
  const code = isResetPage ? url.searchParams.get('code') : null;
  const implicitRecovery = hash.get('type') === 'recovery';
  const hasImplicitTokens = Boolean(hash.get('access_token') && hash.get('refresh_token'));
  const errorCode = isResetPage
    ? url.searchParams.get('error_code') || hash.get('error_code')
    : null;
  const redirectError = isResetPage
    ? url.searchParams.get('error') || hash.get('error')
    : null;
  const errorDescription = isResetPage
    ? url.searchParams.get('error_description') || hash.get('error_description')
    : null;

  return {
    code,
    implicitRecovery,
    hasImplicitTokens,
    errorCode,
    redirectError,
    errorDescription,
    hasRecoveryLink: Boolean(code || implicitRecovery || redirectError || errorCode || errorDescription),
  };
})();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// A PKCE callback must be initialized as PKCE: the SDK otherwise rejects the
// code and removes its verifier before the page can exchange it.
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  initialRecoveryRedirect.code ? { auth: { flowType: 'pkce' } } : undefined,
);
