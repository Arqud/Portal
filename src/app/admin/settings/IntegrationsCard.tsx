"use client";

import { useState, useTransition } from "react";
import { Card, Input, Button } from "@/components/ui";
import { saveSetting } from "@/app/actions/settings";

export function IntegrationsCard({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveSetting("google_calendar_ics_url", url);
      setMsg(res.ok ? { ok: true, text: "Saved — the Calendar now reads your Google schedule." } : { ok: false, text: res.error ?? "Couldn't save." });
    });
  }

  return (
    <Card title="Integrations">
      <div className="space-y-3">
        <div>
          <p className="text-[12.5px] text-arqud-bone font-medium">Google Calendar (read)</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-arqud-muted">
            Google Calendar → Settings → your calendar → <span className="text-arqud-bone-dim">Integrate calendar</span> → copy{" "}
            <span className="text-arqud-bone-dim">“Secret address in iCal format”</span> and paste it here.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            className="flex-1"
          />
          <Button size="sm" onClick={save} disabled={pending || !url.trim()}>
            {initialUrl ? "Update" : "Save"}
          </Button>
        </div>
        {msg && <p className={`text-[11.5px] ${msg.ok ? "text-arqud-green" : "text-arqud-amber"}`}>{msg.text}</p>}
        {initialUrl && !msg && <p className="text-[11px] text-arqud-green">✓ Connected — refreshed every 15 minutes</p>}
      </div>
    </Card>
  );
}
