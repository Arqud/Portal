export function TeaserTile({ title, note }: { title: string; note: string }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-dashed border-arqud-line p-5 panel-gradient">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[17px] text-arqud-bone">{title}</h3>
        <span className="rounded-full bg-arqud-gold/10 px-2.5 py-0.5 text-[10px] font-semibold text-arqud-gold">Soon</span>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-arqud-muted">{note}</p>
    </div>
  );
}
