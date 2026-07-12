export default function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-line bg-paper-raised p-5">
      <p className="font-body text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1 font-body text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}
