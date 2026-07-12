// Null-safe score display. Until the baseline mean/stddev table is seeded,
// zScore/percentile can be null OR the testType key can simply be missing
// from an athlete's scores object entirely — both cases render the same way.
export default function ScoreBadge({ score }) {
  if (!score || score.zScore === null || score.zScore === undefined) {
    return <span className="font-mono text-xs text-ink-soft/60">not scored yet</span>;
  }

  const positive = score.zScore >= 0;

  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-sm">
      <span className={positive ? 'text-track' : 'text-clay'}>
        {score.zScore > 0 ? '+' : ''}
        {score.zScore.toFixed(2)}
      </span>
      {score.percentile !== null && score.percentile !== undefined && (
        <span className="text-ink-soft/70 text-xs">
          {Math.round(score.percentile)}th pctl
        </span>
      )}
    </span>
  );
}
