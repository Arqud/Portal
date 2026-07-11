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
  buildProposalAcceptedEmail,
  sendProposalAcceptedEmail,
} from "@/lib/proposals/notify";

const mockGetSetting = vi.mocked(getSetting);

const accepted = {
  title: "Meta Ads Growth Retainer",
  proposal_number: "PRO-2026-001",
  recipient: "We Wash Cars",
  accepted_by_name: "Arno Botha",
  accepted_at_sast: "11 Jul 2026, 14:32 SAST",
  total: 12500,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildProposalAcceptedEmail", () => {
  it("builds the locked subject: Proposal accepted — title — recipient", () => {
    expect(buildProposalAcceptedEmail(accepted).subject).toBe(
      "Proposal accepted — Meta Ads Growth Retainer — We Wash Cars"
    );
  });

  it("shows title, number, recipient, acceptor and SAST timestamp in the body", () => {
    const { html } = buildProposalAcceptedEmail(accepted);
    expect(html).toContain("Meta Ads Growth Retainer");
    expect(html).toContain("PRO-2026-001");
    expect(html).toContain("We Wash Cars");
    expect(html).toContain("Arno Botha");
    expect(html).toContain("11 Jul 2026, 14:32 SAST");
  });

  it("formats the total as en-ZA currency with two decimals", () => {
    const { html } = buildProposalAcceptedEmail(accepted);
    expect(html).toContain(`R ${(12500).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`);
  });

  it("carries the PROPOSAL ACCEPTED headline", () => {
    expect(buildProposalAcceptedEmail(accepted).html).toContain("PROPOSAL ACCEPTED");
  });

  it("escapes HTML in the recipient-typed name (public form input)", () => {
    const { html } = buildProposalAcceptedEmail({
      ...accepted,
      accepted_by_name: '<script>alert("x")</script>',
    });
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });
});

describe("sendProposalAcceptedEmail", () => {
  it("is a silent no-op (no throw) when no Resend key exists anywhere", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    mockGetSetting.mockResolvedValue(null);
    await expect(sendProposalAcceptedEmail(accepted)).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("falls back to Morne@arqud.com when proposal_notify_email is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockGetSetting.mockResolvedValue(null);
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });

    await sendProposalAcceptedEmail(accepted);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const args = sendMock.mock.calls[0][0];
    expect(args.to).toBe("Morne@arqud.com");
    expect(args.from).toBe("ARQUD Portal <noreply@arqudportal.co.za>");
    expect(args.subject).toBe("Proposal accepted — Meta Ads Growth Retainer — We Wash Cars");
  });

  it("sends to the configured proposal_notify_email when set", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockGetSetting.mockImplementation(async (key: string) =>
      key === "proposal_notify_email" ? "deals@arqud.com" : null
    );
    sendMock.mockResolvedValue({ data: { id: "email-2" }, error: null });

    await sendProposalAcceptedEmail(accepted);

    expect(mockGetSetting).toHaveBeenCalledWith("proposal_notify_email");
    expect(sendMock.mock.calls[0][0].to).toBe("deals@arqud.com");
  });

  it("swallows a Resend throw — acceptance must never see it", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockGetSetting.mockResolvedValue(null);
    sendMock.mockRejectedValue(new Error("resend 500"));
    await expect(sendProposalAcceptedEmail(accepted)).resolves.toBeUndefined();
  });

  it("swallows a settings read failure — acceptance must never see it", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    mockGetSetting.mockRejectedValue(new Error("supabase down"));
    await expect(sendProposalAcceptedEmail(accepted)).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("uses the app_settings resend_api_key when the env var is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    mockGetSetting.mockImplementation(async (key: string) =>
      key === "resend_api_key" ? "re_settings_key" : null
    );
    sendMock.mockResolvedValue({ data: { id: "email-3" }, error: null });

    await sendProposalAcceptedEmail(accepted);

    expect(mockGetSetting).toHaveBeenCalledWith("resend_api_key");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
