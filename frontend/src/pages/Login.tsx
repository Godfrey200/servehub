import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, saveUser } from '../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await signIn(email, password);
      saveUser(user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-border bg-surface rounded p-8">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-primary rounded mx-auto flex items-center justify-center mb-4">
            <span className="text-white font-semibold text-lg">SH</span>
          </div>
          <h1 className="text-xl font-semibold text-primary">ServeHub</h1>
          <p className="text-sm text-text-muted mt-1">
            Sign in to manage cases and resources
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="you@organization.org"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="text-sm text-danger border border-danger/30 bg-red-50 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white text-sm font-medium py-2.5 rounded hover:bg-secondary transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
