import { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import LaneDivider from '../components/LaneDivider';
import StatCard from '../components/StatCard';
import { getStats } from '../api/dashboard';
import { errorMessage } from '../api/client';
import { TEST_TYPE_LABELS } from '../api/constants';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(errorMessage(err, 'Could not load stats.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <header>
        <h1 className="font-display text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Scoped to your school or region automatically.
        </p>
      </header>

      <LaneDivider />

      {loading && <p className="text-sm text-ink-soft">Loading stats…</p>}
      {error && <p className="text-sm text-clay">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Total athletes" value={stats.totalAthletes} />
            <StatCard label="Total tests recorded" value={stats.totalTests} />
            <StatCard label="Test types with data" value={stats.breakdown.length} />
          </div>

          <h2 className="mt-10 font-display text-lg font-semibold">By test type</h2>

          {stats.breakdown.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              No scored results yet — this fills in once tests are synced and the baseline
              norms table is seeded.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">Test type</th>
                    <th className="px-4 py-3 font-medium">Tests</th>
                    <th className="px-4 py-3 font-medium">Avg raw score</th>
                    <th className="px-4 py-3 font-medium">Avg Z-score</th>
                    <th className="px-4 py-3 font-medium">Avg percentile</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.breakdown.map((row) => (
                    <tr key={row._id} className="border-t border-line font-mono">
                      <td className="px-4 py-3 font-body">
                        {TEST_TYPE_LABELS[row._id] || row._id}
                      </td>
                      <td className="px-4 py-3">{row.totalTests}</td>
                      <td className="px-4 py-3">{row.avgRawScore?.toFixed(2)}</td>
                      <td className="px-4 py-3">{row.avgZScore?.toFixed(2)}</td>
                      <td className="px-4 py-3">{row.avgPercentile?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
