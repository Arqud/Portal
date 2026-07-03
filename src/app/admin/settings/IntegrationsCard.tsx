"use client";

import { useState, useTransition } from "react";
import { Card, Input, Button } from "@/components/ui";
import { saveSetting } from "@/app/actions/settings";

export function IntegrationsCard({
  initialUrl,
  initialForwardUrl,
  initialForwardSecret,
}: {
  initialUrl: string | null;
  initialForwardUrl: string | null;
  initialForwardSecret: string | null;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [gMsg, setGMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fwdUrl, setFwdUrl] = useState(initialForwardUrl ?? "");
  const [fwdSecret, setFwdSecret] = useState(initialForwardSecret ?? "");
  const [fMsg, setFMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function saveGoogle() {
    setGMsg(null);
    start(async () => {
      const res = await saveSetting("google_calendar_ics_url", url);
      setGMsg(res.ok ? { ok: true, text: "Saved — the Calendar now reads your Google schedule." } : { ok: false, text: res.error ?? "Couldn't save." });
    });
  }

  function saveForward() {
    setFMsg(null);
    start(async () => {
      const a = await saveSetting("lead_forward_url", fwdUrl);
      const b = await saveSetting("lead_forward_secret", fwdSecret);
      const ok = a.ok && b.ok;
      setFMsg(ok ? { ok: true, text: "Saved — new leads now forward to Duan in real time." } : { ok: false, text: a.error ?? b.error ?? "Couldn't save." });
    });
  }

  return (
    <Card title="Integrations">
      <div className="space-y-8">
        {/* Google Calendar */}
        <div className="space-y-3">
          <div>
            <p className="text-[12.5px] font-medium text-arqud-bone">Google Calendar (read)</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-arqud-muted">
              Google Calendar → Settings → your calendar → <span className="text-arqud-bone-dim">Integrate calendar</span> → copy{" "}
              <span className="text-arqud-bone-dim">&ldquo;Secret address in iCal format&rdquo;</span> and paste it here.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" className="flex-1" />
            <Button size="sm" onClick={saveGoogle} disabled={pending || !url.trim()}>{initialUrl ? "Update" : "Save"}</Button>
          </div>
          {gMsg && <p className={`text-[11.5px] ${gMsg.ok ? "text-arqud-green" : "text-arqud-amber"}`}>{gMsg.text}</p>}
          {initialUrl && !gMsg && <p className="text-[11px] text-arqud-green">✓ Connected — refreshed every 15 minutes</p>}
        </div>

        <div className="h-px bg-arqud-line" />

        {/* Lead forwarding (Duan speed-to-lead) */}
        <div className="space-y-3">
          <div>
            <p className="text-[12.5px] font-medium text-arqud-bone">Lead forwarding — speed-to-lead SMS (Duan)</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-arqud-muted">
              Every new lead is POSTed here in real time (name, phone, brand, branch, lead id, service), signed with the shared secret.
              Paste the endpoint URL + secret Duan gives you at deploy. Leave blank to disable.
            </p>
          </div>
          <Input value={fwdUrl} onChange={(e) => setFwdUrl(e.target.value)} placeholder="https://duan-endpoint.example.com/lead" className="w-full" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={fwdSecret} onChange={(e) => setFwdSecret(e.target.value)} placeholder="Shared secret" className="flex-1" />
            <Button size="sm" onClick={saveForward} disabled={pending}>{initialForwardUrl ? "Update" : "Save"}</Button>
          </div>
          {fMsg && <p className={`text-[11.5px] ${fMsg.ok ? "text-arqud-green" : "text-arqud-amber"}`}>{fMsg.text}</p>}
          {initialForwardUrl && !fMsg && <p className="text-[11px] text-arqud-green">✓ Forwarding active</p>}
        </div>
      </div>
    </Card>
  );
}
