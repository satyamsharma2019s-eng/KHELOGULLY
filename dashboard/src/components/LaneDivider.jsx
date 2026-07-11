// Signature visual motif for this dashboard — echoes lane markings on a
// running track. Used to separate sections instead of a plain rule.
export default function LaneDivider() {
  return (
    <div className="lane-divider" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
