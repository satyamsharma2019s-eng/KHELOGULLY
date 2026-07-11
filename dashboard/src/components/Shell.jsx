import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/athletes', label: 'Athletes' },
  { to: '/heatmap', label: 'Districts' },
];

export default function Shell({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="flex">
        <aside className="sticky top-0 flex h-screen w-60 flex-col justify-between border-r border-line bg-paper-raised px-5 py-6">
          <div>
            <div className="mb-8">
              <p className="font-display text-lg font-semibold tracking-tight">KheloGully</p>
              <p className="text-xs text-ink-soft">Scout dashboard</p>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-ink text-paper'
                        : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-line pt-4">
            <p className="text-sm font-medium capitalize">{user?.role}</p>
            {user?.schoolOrRegion && (
              <p className="text-xs text-ink-soft capitalize">{user.schoolOrRegion}</p>
            )}
            <button
              onClick={handleSignOut}
              className="mt-3 text-xs font-medium text-clay hover:underline"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
