import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Cases from './pages/Cases';
import Donations from './pages/Donations';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Audit from './pages/Audit';
import { getCurrentUser, signOut } from './lib/auth';

function Layout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  const location = useLocation();
  const role = user?.role || 'Auditor';
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSignOut() {
    signOut();
    window.location.href = '/login';
  }

  const allNavItems = [
    { path: '/dashboard', label: 'Dashboard', roles: ['SystemAdmin', 'CaseWorker', 'VolunteerCoordinator', 'Auditor'] },
    { path: '/cases', label: 'Cases', roles: ['SystemAdmin', 'CaseWorker', 'VolunteerCoordinator', 'Auditor'] },
    { path: '/donations', label: 'Donations', roles: ['SystemAdmin', 'CaseWorker', 'VolunteerCoordinator', 'Auditor'] },
    { path: '/users', label: 'Users', roles: ['SystemAdmin'] },
    { path: '/audit', label: 'Audit Log', roles: ['SystemAdmin', 'Auditor'] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Desktop Nav */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">SH</span>
                </div>
                <h1 className="text-lg font-semibold text-primary">ServeHub</h1>
              </div>

              {/* Desktop navigation */}
              <nav className="hidden md:flex gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 text-sm rounded ${
                      location.pathname === item.path
                        ? 'bg-primary text-white'
                        : 'text-text-muted hover:bg-background'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right: User info + Mobile menu button */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-sm text-text-muted">
                {user?.name || user?.email}
                <span className="ml-1 text-xs">({role})</span>
              </div>

              <button
                onClick={handleSignOut}
                className="hidden sm:block text-sm text-text-muted hover:text-primary"
              >
                Sign out
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden border border-border rounded px-3 py-1.5 text-sm"
              >
                {menuOpen ? 'Close' : 'Menu'}
              </button>
            </div>
          </div>

          {/* Mobile navigation */}
          {menuOpen && (
            <nav className="md:hidden mt-3 pb-2 border-t border-border pt-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 text-sm rounded ${
                    location.pathname === item.path
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:bg-background'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="px-3 pt-2 text-sm text-text-muted border-t border-border mt-2">
                {user?.name || user?.email} ({role})
              </div>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-3 py-2 text-sm text-text-muted"
              >
                Sign out
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="pb-8">{children}</main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/cases" element={<ProtectedRoute><Layout><Cases /></Layout></ProtectedRoute>} />
        <Route path="/donations" element={<ProtectedRoute><Layout><Donations /></Layout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute><Layout><Audit /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
