import { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import LaneDivider from '../components/LaneDivider';
import { getLeaderboard } from '../api/dashboard';
import { errorMessage } from '../api/client';
import { TEST_TYPES, TEST_TYPE_LABELS } from '../api/constants';

export default function Leaderboard() {
  const [testType, setTestType] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    getLeaderboard({ testType: testType || undefined, limit: 25 })
      .then(setRows)
      .catch((err) => setError(errorMessage(err, 'Could not load leaderboard.')))
      .finally(() => setLoading(false));
  }, [testType]);

  return (
    <Shell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Leaderboard</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Top performers by Z-score. Unscored results are excluded automatically.
          </p>
        </div>

        <select
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          className="rounded-md border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        >
          <option value="">All test types</option>
          {TEST_TYPES.map((t) => (
            <option key={t} value={t}>
              {TEST_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </header>

      <LaneDivider />

      {loading && <p className="text-sm text-ink-soft">Loading leaderboard…</p>}
      {error && <p className="text-sm text-clay">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-ink-soft">
          No scored results yet for this filter. Results appear once synced tests have a
          non-null Z-score.
        </p>
      )}

      {!loading && rows.length > 0 && (
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li
              key={row._id || `${row.athleteId}-${row.testType}`}
              className="flex items-center gap-4 rounded-lg border border-line bg-paper-raised px-4 py-3"
            >
              <span className="w-8 shrink-0 font-mono text-sm text-ink-soft">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{row.athlete?.name}</p>
                <p className="text-xs text-ink-soft">
                  {TEST_TYPE_LABELS[row.testType] || row.testType} · {row.athlete?.district || 'district n/a'}
                </p>
              </div>
              <span className="font-mono text-sm text-track">
                {row.zScore > 0 ? '+' : ''}
                {row.zScore?.toFixed(2)}
              </span>
              <span className="w-16 text-right font-mono text-xs text-ink-soft">
                {Math.round(row.percentile)}th
              </span>
            </li>
          ))}
        </ol>
      )}
    </Shell>
  );
}
