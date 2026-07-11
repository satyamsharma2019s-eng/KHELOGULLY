import { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import LaneDivider from '../components/LaneDivider';
import OriginTag from '../components/OriginTag';
import ScoreBadge from '../components/ScoreBadge';
import { getDashboardAthletes } from '../api/dashboard';
import { errorMessage } from '../api/client';
import { TEST_TYPES, TEST_TYPE_LABELS } from '../api/constants';

export default function Athletes() {
  const [page, setPage] = useState(1);
  const [district, setDistrict] = useState('');
  const [gender, setGender] = useState('');
  const [data, setData] = useState({ athletes: [], pagination: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    getDashboardAthletes({ page, limit: 20, district: district || undefined, gender: gender || undefined })
      .then(setData)
      .catch((err) => setError(errorMessage(err, 'Could not load athletes.')))
      .finally(() => setLoading(false));
  }, [page, district, gender]);

  const { athletes, pagination } = data;

  return (
    <Shell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Athletes</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Field-captured profiles and self-registered student profiles, side by side.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={district}
            onChange={(e) => {
              setPage(1);
              setDistrict(e.target.value);
            }}
            placeholder="Filter by district"
            className="rounded-md border border-line bg-paper-raised px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <select
            value={gender}
            onChange={(e) => {
              setPage(1);
              setGender(e.target.value);
            }}
            className="rounded-md border border-line bg-paper-raised px-3 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </header>

      <LaneDivider />

      {loading && <p className="text-sm text-ink-soft">Loading athletes…</p>}
      {error && <p className="text-sm text-clay">{error}</p>}

      {!loading && !error && athletes.length === 0 && (
        <p className="text-sm text-ink-soft">No athletes match this filter.</p>
      )}

      {!loading && athletes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Origin</th>
                <th className="px-4 py-3 font-medium">District</th>
                {TEST_TYPES.map((t) => (
                  <th key={t} className="px-4 py-3 font-medium">
                    {TEST_TYPE_LABELS[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a._id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-ink-soft">
                      {a.age}y · {a.gender}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <OriginTag userId={a.userId} />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{a.district || '—'}</td>
                  {TEST_TYPES.map((t) => (
                    <td key={t} className="px-4 py-3">
                      <ScoreBadge score={a.scores?.[t]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} athletes
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
