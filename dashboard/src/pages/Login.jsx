import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import LaneDivider from '../components/LaneDivider';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(phone, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in. Check your phone and password.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 font-body">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-semibold text-ink">KheloGully</p>
          <p className="mt-1 text-sm text-ink-soft">Scout, teacher, and admin sign in</p>
        </div>

        <LaneDivider />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="mb-1 block text-xs font-medium text-ink-soft">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91..."
              className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-ink-soft">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            />
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
