import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Never touch the real Resend API or app_settings in tests — mock both edges.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("@/lib/settings/query", () => ({
  getSetting: vi.fn(),
}));

import { getSetting } from "@/lib/settings/query";
import {
  buildLeadNotification,
  parseRecipients,
  resolveNotifyRecipients,
  notifyFrom,
  formatSast,
  sendLeadNotification,
} from "@/lib/leads/notify";

const mockGetSetting = vi.mocked(getSetting);

const lead = {
  full_name: "Thabo M",
  phone: "082 123 4567",
  branch: "Eldo Glen (Centurion)",
  service: "Four of a Kind R599",
  brand: "We Wash",
  created_at: "2026-07-09T12:32:00Z",
};

// A franchise-recruitment lead: no wash branch/package, carries the qualifier rows the
// call site built from form_answers (Capital band first). Routes to Marissa's inbox.
const franchiseLead = {
  full_name: "Big Investor",
  phone: "083 111 2222",
  branch: null,
  service: null,
  brand: "Franchise",
  created_at: "2026-07-23T08:00:00Z",
  qualifiers: [
    { label: "Capital", value: "R1.75m – R2m" },
    { label: "Timeline", value: "In 3 months" },
    { label: "Funds", value: "Yes, cash available" },
    { label: "Area", value: "Rivonia / Sandton" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildLeadNotification", () => {
  it("builds a scannable subject: brand — name — branch", () => {
    expect(buildLeadNotification(lead).subject).toBe(
      "New We Wash lead — Thabo M — Eldo Glen (Centurion)"
    );
  });

  it("drops the branch from the subject when missing", () => {
    expect(buildLeadNotification({ ...lead, branch: null }).subject).toBe(
      "New We Wash lead — Thabo M"
    );
  });

  it("falls back to the phone in the subject when the name is missing", () => {
    expect(buildLeadNotification({ ...lead, full_name: null }).subject).toBe(
      "New We Wash lead — 082 123 4567 — Eldo Glen (Centurion)"
    );
  });

  it("shows name, phone (tel: link), branch and package in the body", () => {
    const { html } = buildLeadNotification(lead);
    expect(html).toContain("Thabo M");
    expect(html).toContain('href="tel:0821234567"');
    expect(html).toContain("082 123 4567");
    expect(html).toContain("Eldo Glen (Centurion)");
    expect(html).toContain("Four of a Kind R599");
  });

  it("shows the received time in SAST (UTC+2)", () => {
    const { html } = buildLeadNotification(lead); // 12:32 UTC → 14:32 SAST
    expect(html).toContain("14:32");
    expect(html).toContain("SAST");
    expect(html).toContain("2026");
  });

  it("links VIEW IN PORTAL to the client leads page", () => {
    const { html } = buildLeadNotification(lead);
    expect(html).toContain("VIEW IN PORTAL");
    expect(html).toContain('href="https://arno.arqudportal.co.za/client/leads"');
  });

  it("escapes HTML in lead-supplied values (public Meta form input)", () => {
    const { html } = buildLeadNotification({ ...lead, full_name: '<img src=x onerror="x">' });
    expect(html).not.toContain('<img src=x onerror="x">');
    expect(html).toContain("&lt;img src=x onerror=&quot;x&quot;&gt;");
  });

  it("renders missing fields as an em dash instead of blank cells", () => {
    const { html } = buildLeadNotification({ ...lead, phone: null, branch: null, service: null });
    expect(html).not.toContain("tel:");
    expect(html).toContain("—");
  });

  it("shows a Preferred row when the lead has a preferred time", () => {
    const { html } = buildLeadNotification({ ...lead, preferred_time: "This week — morning" });
    expect(html).toContain("Preferred");
    expect(html).toContain("This week — morning");
  });

  it("omits the Preferred row entirely when there is no preferred time", () => {
    expect(buildLeadNotification(lead).html).not.toContain("Preferred");
    expect(buildLeadNotification({ ...lead, preferred_time: null }).html).not.toContain("Preferred");
    expect(buildLeadNotification({ ...lead, preferred_time: "  " }).html).not.toContain("Preferred");
  });

  it("escapes HTML in the preferred time (public Meta form input)", () => {
    const { html } = buildLeadNotification({ ...lead, preferred_time: "<b>now</b>" });
    expect(html).not.toContain("<b>now</b>");
    expect(html).toContain("&lt;b&gt;now&lt;/b&gt;");
  });
});

describe("buildLeadNotification — franchise leads", () => {
  it("brands the email FRANCHISE and shows a New Franchise lead subject", () => {
    const { subject, html } = buildLeadNotification(franchiseLead);
    expect(subject).toBe("New Franchise lead — Big Investor");
    expect(html).toContain("FRANCHISE");
  });

  it("renders the qualifier rows with the capital band shown prominently", () => {
    const { html } = buildLeadNotification(franchiseLead);
    expect(html).toContain("Capital");
    expect(html).toContain("R1.75m – R2m");
    expect(html).toContain("Timeline");
    expect(html).toContain("In 3 months");
    expect(html).toContain("Funds");
    expect(html).toContain("Area");
    expect(html).toContain("Rivonia / Sandton");
    // Capital is the first detail row after Name/Phone — it precedes every other qualifier.
    expect(html.indexOf("Capital")).toBeLessThan(html.indexOf("Timeline"));
    expect(html.indexOf("Capital")).toBeLessThan(html.indexOf("Area"));
  });

  it("drops the wash-only Branch / Package / Preferred rows for a franchise lead", () => {
    const { html } = buildLeadNotification(franchiseLead);
    expect(html).not.toContain("Branch");
    expect(html).not.toContain("Package");
    expect(html).not.toContain("Preferred");
  });

  it("escapes both label and value of qualifier rows (public Meta form input)", () => {
    const { html } = buildLeadNotification({
      ...franchiseLead,
      qualifiers: [{ label: "<i>Capital</i>", value: '<img src=x onerror="y">' }],
    });
    expect(html).not.toContain('<img src=x onerror="y">');
    expect(html).toContain("&lt;img src=x onerror=&quot;y&quot;&gt;");
    expect(html).toContain("&lt;i&gt;Capital&lt;/i&gt;");
  });

  it("still shows the shared Name / Phone / Received rows", () => {
    const { html } = buildLeadNotification(franchiseLead);
    expect(html).toContain("Big Investor");
    expect(html).toContain('href="tel:0831112222"');
    expect(html).toContain("Received");
  });
});

// The wash email must be COMPLETELY unchanged by the franchise routing — no qualifier
// rows, still keyed off its own brand inbox and layout.
describe("buildLeadNotification — wash leads are unchanged", () => {
  it("still renders Branch and Package and never renders qualifier-only labels", () => {
    const { html } = buildLeadNotification(lead);
    expect(html).toContain("Branch");
    expect(html).toContain("Package");
    expect(html).toContain("Eldo Glen (Centurion)");
    expect(html).toContain("Four of a Kind R599");
    // No franchise qualifier labels leak into a wash email.
    expect(html).not.toContain("Capital");
    expect(html).not.toContain("Timeline");
  });
});

describe("formatSast", () => {
  it("converts UTC to Africa/Johannesburg time", () => {
    const got = formatSast("2026-07-09T12:32:00Z");
    expect(got).toContain("14:32");
    expect(got).toContain("Jul");
    expect(got).toContain("2026");
    expect(got).toContain("SAST");
  });
});

describe("notifyFrom", () => {
  it("uses the We Wash Cars from-name for We Wash leads", () => {
    expect(notifyFrom("We Wash")).toBe("We Wash Cars Leads <noreply@arqudportal.co.za>");
  });

  it("uses the Sparkling from-name for Sparkling leads", () => {
    expect(notifyFrom("Sparkling")).toBe("Sparkling Leads <noreply@arqudportal.co.za>");
  });

  it("uses a dedicated Sparkling Franchise from-name for franchise leads", () => {
    expect(notifyFrom("Franchise")).toBe("Sparkling Franchise Leads <noreply@arqudportal.co.za>");
  });
});

describe("parseRecipients", () => {
  it("returns [] for a missing/blank setting", () => {
    expect(parseRecipients(null)).toEqual([]);
    expect(parseRecipients("")).toEqual([]);
    expect(parseRecipients("  ")).toEqual([]);
  });

  it("splits comma-separated addresses and trims whitespace", () => {
    expect(parseRecipients("info@wewash.co.za, arno@wewash.co.za ,x@y.co.za")).toEqual([
      "info@wewash.co.za",
      "arno@wewash.co.za",
      "x@y.co.za",
    ]);
  });

  it("ignores empty entries from stray commas", () => {
    expect(parseRecipients("info@wewash.co.za,,")).toEqual(["info@wewash.co.za"]);
  });
});

describe("resolveNotifyRecipients", () => {
  it("reads lead_notify_email_we_wash for the We Wash brand", async () => {
    mockGetSetting.mockResolvedValue("info@wewash.co.za");
    await expect(resolveNotifyRecipients("We Wash")).resolves.toEqual(["info@wewash.co.za"]);
    expect(mockGetSetting).toHaveBeenCalledWith("lead_notify_email_we_wash");
  });

  it("reads lead_notify_email_sparkling for the Sparkling brand", async () => {
    mockGetSetting.mockResolvedValue("admin@sparklingauto.co.za");
    await expect(resolveNotifyRecipients("Sparkling")).resolves.toEqual(["admin@sparklingauto.co.za"]);
    expect(mockGetSetting).toHaveBeenCalledWith("lead_notify_email_sparkling");
  });

  it("reads lead_notify_email_franchise for the Franchise brand (Marissa's inbox)", async () => {
    mockGetSetting.mockResolvedValue("marissa@sparklingauto.co.za");
    await expect(resolveNotifyRecipients("Franchise")).resolves.toEqual(["marissa@sparklingauto.co.za"]);
    expect(mockGetSetting).toHaveBeenCalledWith("lead_notify_email_franchise");
  });

  it("returns [] when the setting is missing (feature off)", async () => {
    mockGetSetting.mockResolvedValue(null);
    await expect(resolveNotifyRecipients("We Wash")).resolves.toEqual([]);
  });

  it("returns [] for brand Other without touching settings", async () => {
    await expect(resolveNotifyRecipients("Other")).resolves.toEqual([]);
    expect(mockGetSetting).not.toHaveBeenCalled();
  });
});

describe("sendLeadNotification", () => {
  it("is a silent no-op when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await sendLeadNotification(lead);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends to the configured brand inbox(es) with the brand from-name", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockGetSetting.mockResolvedValue("info@wewash.co.za, arno@wewash.co.za");
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });

    await sendLeadNotification(lead);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const args = sendMock.mock.calls[0][0];
    expect(args.from).toBe("We Wash Cars Leads <noreply@arqudportal.co.za>");
    expect(args.to).toEqual(["info@wewash.co.za", "arno@wewash.co.za"]);
    expect(args.subject).toBe("New We Wash lead — Thabo M — Eldo Glen (Centurion)");
  });

  it("routes a franchise lead to lead_notify_email_franchise with the Franchise from-name + capital band", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockGetSetting.mockImplementation(async (key: string) =>
      key === "lead_notify_email_franchise" ? "marissa@sparklingauto.co.za" : null
    );
    sendMock.mockResolvedValue({ data: { id: "email-f" }, error: null });

    await sendLeadNotification(franchiseLead);

    expect(mockGetSetting).toHaveBeenCalledWith("lead_notify_email_franchise");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const args = sendMock.mock.calls[0][0];
    expect(args.from).toBe("Sparkling Franchise Leads <noreply@arqudportal.co.za>");
    expect(args.to).toEqual(["marissa@sparklingauto.co.za"]);
    expect(args.subject).toBe("New Franchise lead — Big Investor");
    expect(args.html).toContain("R1.75m – R2m");
  });

  it("does not send when no recipients are configured for the brand", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockGetSetting.mockResolvedValue(null);
    await sendLeadNotification(lead);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not send for brand Other", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    await sendLeadNotification({ ...lead, brand: "Other" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("swallows a settings read failure — ingestion must never see it", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockGetSetting.mockRejectedValue(new Error("supabase down"));
    await expect(sendLeadNotification(lead)).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("swallows a Resend failure — ingestion must never see it", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockGetSetting.mockResolvedValue("info@wewash.co.za");
    sendMock.mockRejectedValue(new Error("resend 500"));
    await expect(sendLeadNotification(lead)).resolves.toBeUndefined();
  });

  // Vercel has silently dropped UI-added env vars in prod (2026-07-10 incident) —
  // the app_settings resend_api_key fallback is what keeps emails flowing.
  it("sends using the app_settings resend_api_key when the env var is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    mockGetSetting.mockImplementation(async (key: string) =>
      key === "resend_api_key" ? "re_settings_key" : "info@wewash.co.za"
    );
    sendMock.mockResolvedValue({ data: { id: "email-2" }, error: null });

    await sendLeadNotification(lead);

    expect(mockGetSetting).toHaveBeenCalledWith("resend_api_key");
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toEqual(["info@wewash.co.za"]);
  });

  it("skips when the key is in neither the env nor app_settings", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    mockGetSetting.mockResolvedValue(null);
    await sendLeadNotification(lead);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("prefers the env key — app_settings is not consulted for the key when env is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_env_key");
    mockGetSetting.mockResolvedValue("info@wewash.co.za");
    sendMock.mockResolvedValue({ data: { id: "email-3" }, error: null });

    await sendLeadNotification(lead);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(mockGetSetting).not.toHaveBeenCalledWith("resend_api_key");
  });
});
