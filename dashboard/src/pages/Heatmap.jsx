import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Shell from '../components/Shell';
import LaneDivider from '../components/LaneDivider';
import { getHeatmap } from '../api/dashboard';
import { errorMessage } from '../api/client';

// Deliberately a sorted bar chart, not a GIS map — same "data-driven talent
// density" narrative for the pitch, without the Leaflet/Mapbox time sink.
export default function Heatmap() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHeatmap()
      .then(setRows)
      .catch((err) => setError(errorMessage(err, 'Could not load district data.')))
      .finally(() => setLoading(false));
  }, []);

  const chartData = rows.map((r) => ({
    district: r._id || 'Unknown',
    athletes: r.totalAthletes,
  }));

  return (
    <Shell>
      <header>
        <h1 className="font-display text-2xl font-semibold">Districts</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Talent density by district, ranked by number of scored athletes.
        </p>
      </header>

      <LaneDivider />

      {loading && <p className="text-sm text-ink-soft">Loading district data…</p>}
      {error && <p className="text-sm text-clay">{error}</p>}

      {!loading && !error && chartData.length === 0 && (
        <p className="text-sm text-ink-soft">No district data yet.</p>
      )}

      {!loading && chartData.length > 0 && (
        <div className="rounded-lg border border-line bg-paper-raised p-5">
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 42)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9D4C8" horizontal={false} />
              <XAxis type="number" stroke="#4A5470" fontSize={12} />
              <YAxis type="category" dataKey="district" stroke="#4A5470" fontSize={12} width={120} />
              <Tooltip
                contentStyle={{ background: '#F8F7F2', border: '1px solid #D9D4C8', fontSize: 13 }}
              />
              <Bar dataKey="athletes" fill="#E8A33D" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Shell>
  );
}
