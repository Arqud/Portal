export function ProgressTrack({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-[7px] w-full overflow-hidden rounded-[5px] bg-arqud-bg-2">
      <div
        className="h-full rounded-[5px] bg-gradient-to-r from-arqud-gold to-arqud-gold-soft"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
