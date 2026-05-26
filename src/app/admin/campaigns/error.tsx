"use client";

export default function CampaignsError({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Campaigns</h1>
      <div className="border border-red-800 bg-red-950/20 p-8 space-y-3">
        <p className="text-red-400 font-semibold">Error: {error.message}</p>
        {error.digest && <p className="text-xs text-arqud-muted">Digest: {error.digest}</p>}
      </div>
    </main>
  );
}
