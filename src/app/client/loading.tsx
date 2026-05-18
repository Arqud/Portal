export default function ClientLoading() {
  return (
    <div className="min-h-screen px-8 py-12">
      <div className="h-10 w-48 bg-arqud-ink animate-pulse rounded mb-8" />
      <div className="space-y-3">
        {[1,2,3].map((i) => (
          <div key={i} className="h-14 bg-arqud-night border border-arqud-ink animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
