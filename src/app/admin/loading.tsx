export default function AdminLoading() {
  return (
    <div className="min-h-screen px-8 py-12">
      <div className="h-10 w-48 bg-arqud-ink animate-pulse rounded mb-8" />
      <div className="grid grid-cols-4 gap-px bg-arqud-ink border border-arqud-ink mb-8">
        {[1,2,3,4].map((i) => (
          <div key={i} className="bg-arqud-night px-6 py-6">
            <div className="h-3 w-24 bg-arqud-ink animate-pulse rounded mb-3" />
            <div className="h-7 w-32 bg-arqud-ink animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1,2,3].map((i) => (
          <div key={i} className="h-14 bg-arqud-night border border-arqud-ink animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
