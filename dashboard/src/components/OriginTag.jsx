// Athlete.userId is null for scout/PET-registered profiles, populated for
// self-registered students. This is the exact signal the backend gives us.
export default function OriginTag({ userId }) {
  const isSelfRegistered = Boolean(userId);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium font-body ${
        isSelfRegistered
          ? 'bg-track/10 text-track'
          : 'bg-ink/5 text-ink-soft'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isSelfRegistered ? 'bg-track' : 'bg-ink-soft'}`}
      />
      {isSelfRegistered ? 'Self-registered' : 'Field-captured'}
    </span>
  );
}
