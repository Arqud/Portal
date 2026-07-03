# Arno Meta Lead Launch Pack

**Date:** 2026-07-03
**Owner:** Morne (ARQUD) · **SMS partner:** Duan · **Client:** Arno Gustafson (Sparkling + We Wash)
**Status:** code side complete; Meta forms/ads + connector + Duan endpoint pending.

This is the one document that takes the Arno launch from "code shipped" to "leads texting
customers." Everything here is drawn from the live portal code, so the strings are exact.

---

## 1. The pipeline (end to end)

```
Meta Lead Form (per brand page)
      │  customer submits
      ▼
Make.com scenario  ── holds Meta leads_retrieval via Morne's personal FB page-admin login
      │  HTTP POST (Meta-shaped body)
      ▼
Portal webhook  POST https://arqudportal.co.za/api/leads/webhook
      │  ingest: brand (campaign name → page_id fallback), branch (form slug), contact
      ▼
CRM  (Supabase `leads`, attached to Arno's client record, brand badge per lead)
      │  guarded real-time signed POST — fires for EVERY lead, never blocks ingestion
      ▼
Duan's endpoint  ── verifies HMAC, dedupes on lead_id, filters to pilot branches
      │
      ▼
Speed-to-lead SMS
```

**Golden rule:** the portal forwards **100% of leads** to Duan (all 4 ads, both brands). Duan
filters on his side. Nothing in the portal caps forwarding to one ad/brand.

---

## 2. The 2 lead forms — EXACT branch labels (the linchpin)

The `branch` value stored in the CRM and sent to Duan is **verbatim** the dropdown option the
customer picks. These strings must match `src/lib/leads/branches.ts` character-for-character, or
the branch filter pills and Duan's filter will miss.

### Branch question (both forms)
Phrase the question **exactly**: `Which branch is closest to you?`
→ Meta slugs this to `which_branch_is_closest_to_you`, which is the primary key our extractor reads.
(If the slug ever differs, a fuzzy fallback still catches any field containing "branch" — but use
the exact wording to be safe.)

### We Wash form — 7 options (in this order)
1. `Eldo Glen (Centurion)`
2. `Old Farm Road / Faerie Glen (Pretoria)`
3. `Sunnyside (Pretoria)`
4. `Greenhills (Randfontein)`
5. `Maraisburg (Roodepoort)`
6. `Sunward (Boksburg)`
7. `Lagoon / Stamford Hill (Durban)`

### Sparkling form — 5 options (in this order)
1. `Menlyn (Pretoria)`
2. `Glen Village / Faerie Glen (Pretoria)`
3. `Rustenburg`
4. `Amanzimtoti (Durban)`
5. `Somerset West (Cape Town)`

### Contact fields (both forms)
Use Meta's built-in prefill fields — their slugs are fixed and our extractor reads them:
- **Full name** → slug `full_name`
- **Phone number** → slug `phone_number`
- **Email** → slug `email`

### Form → page attachment
- We Wash form → attach to **We Wash Cars** page (`1147234435130456`)
- Sparkling form → attach to **Sparkling Auto Care Centres** page (`459272044104015`)

---

## 3. The 4 campaigns — naming = brand routing

Brand is decided by campaign name first, page_id as fallback. **Name every campaign brand-first:**

- `We Wash — <special>`  (e.g. `We Wash — Four of a Kind R599`)
- `Sparkling — <special>` (e.g. `Sparkling — Full Monty R1750`)

The 4 ads: We Wash static + We Wash video (both → all 7 We Wash branches via location pins);
Sparkling static + Sparkling video (both → all 5 Sparkling branches). Budget R150/day per ad.

**Safety net (now live, committed 2026-07-03):** even if Make can't pass the campaign name, brand
still resolves correctly from page_id — We Wash page → "We Wash", Sparkling page → "Sparkling".
So a lead can never silently become "Other".

---

## 4. Make.com scenario (the connector)

One scenario per page (or one combined). Trigger = **Facebook Lead Ads › Watch Leads** (auth with
Morne's personal FB login — page admin, holds `leads_retrieval`). Action = **HTTP › Make a request**.

- **URL:** `https://arqudportal.co.za/api/leads/webhook`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (map Make lead fields into this Meta-shaped JSON):**

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "leadgen_id": "{{lead.id}}",
            "page_id": "{{lead.page_id}}",
            "form_id": "{{lead.form_id}}",
            "ad_id": "{{lead.ad_id}}",
            "campaign_name": "{{lead.campaign_name}}",
            "ad_name": "{{lead.ad_name}}",
            "field_data": [
              { "name": "full_name", "values": ["{{lead.full_name}}"] },
              { "name": "phone_number", "values": ["{{lead.phone_number}}"] },
              { "name": "email", "values": ["{{lead.email}}"] },
              { "name": "which_branch_is_closest_to_you", "values": ["{{lead.branch}}"] }
            ]
          }
        }
      ]
    }
  ]
}
```

**Minimum required fields:** `leadgen_id`, `page_id`, and `field_data`. `campaign_name`/`ad_name`
are bonus (they populate the `service` field and the CRM performance card). If Make can't easily
provide the campaign name, that's fine — brand still routes via `page_id`.

**Notes**
- The webhook dedupes on `leadgen_id`, so a duplicate delivery won't create a second lead.
- Inbound POSTs are currently unauthenticated (`META_APP_SECRET` unset in prod). Fine for launch;
  hardening a shared secret on the inbound side is a future task.

---

## 5. Duan's endpoint spec (outbound: portal → Duan)

Send Duan this contract. He returns a **URL + shared secret**; you paste both into portal Settings.

**Request** — one signed POST per lead, real time:
```
POST <Duan URL>
Headers:
  Content-Type: application/json
  X-ARQUD-Signature: sha256=<HMAC-SHA256 hex of the RAW body, keyed with the shared secret>
Body:
{
  "lead_id":   "<CRM UUID — stable idempotency key>",
  "full_name": "Thabo M",
  "phone":     "0821234567",                       // any format; he normalises
  "brand":     "We Wash",                          // "We Wash" | "Sparkling" | "Other"
  "branch":    "Eldo Glen (Centurion)",            // exact form label; his routing key
  "service":   "We Wash — Four of a Kind R599"     // campaign/package, or null
}
```

**Verify (Node):**
```js
const crypto = require("crypto");
const expected = "sha256=" + crypto.createHmac("sha256", SECRET)
                                   .update(rawBody)   // RAW bytes as received — do not re-serialise
                                   .digest("hex");
const ok = crypto.timingSafeEqual(
  Buffer.from(expected),
  Buffer.from(req.header("X-ARQUD-Signature"))
);
```

**Duan's side:** dedupe on `lead_id` → filter to pilot branches → SMS → return `200` fast
(portal is fire-and-forget, aborts after 8s, ignores his response body).

### Pilot branches Duan texts (exact strings)
- `Menlyn (Pretoria)`
- `Rustenburg`
- All 7 We Wash: `Eldo Glen (Centurion)`, `Old Farm Road / Faerie Glen (Pretoria)`,
  `Sunnyside (Pretoria)`, `Greenhills (Randfontein)`, `Maraisburg (Roodepoort)`,
  `Sunward (Boksburg)`, `Lagoon / Stamford Hill (Durban)`

---

## 6. Portal Settings → Integrations (what Morne pastes)

| Key                   | Value                                  | Effect                          |
|-----------------------|----------------------------------------|---------------------------------|
| `lead_forward_url`    | Duan's receiving URL                   | Turns on real-time forwarding   |
| `lead_forward_secret` | Shared secret (same string as Duan)    | Signs each forward (X-ARQUD-Signature) |
| Google iCal address   | Google Calendar secret address         | Turns on Calendar (separate feature) |

All take effect on save — no deploy needed. If `lead_forward_url` is blank, forwarding is simply
skipped (ingestion unaffected).

---

## 7. End-to-end test checklist (do before going live)

Run **Meta Lead Ads Testing Tool** once per ad (4 ads). For each:

- [ ] Submit a test lead, choosing a **specific branch** from the dropdown.
- [ ] Lead appears in CRM (`arno.arqudportal.co.za/leads`) within seconds.
- [ ] **Brand badge correct** (Sparkling ad → Sparkling; We Wash ad → We Wash).
- [ ] **Branch correct** and matches the dropdown label exactly.
- [ ] Duan confirms he received the POST, signature verified.
- [ ] Duan's SMS fires (for a pilot-branch test lead) / is correctly ignored (non-pilot branch).

Only after all 4 pass → **launch the ads live.**

---

## 8. State snapshot (2026-07-03)

**Done (code, committed + pushed to main):**
- `SPARKLING_PAGE_ID = 459272044104015` wired as brand safety net (`src/lib/leads/ingest.ts`), tested.
- `WE_WASH_PAGE_ID = 1147234435130456` (already live).
- Forward + HMAC signing (`src/lib/leads/forward.ts`), guarded webhook forward (`api/leads/webhook`).
- Branch rosters (`src/lib/leads/branches.ts`) = the labels in §2.

**Pending (external, not code):**
- Duan returns URL + secret (he hit a 4h session limit 2026-07-03; spec already sent).
- Morne builds the 2 forms (§2) + 4 campaigns (§3), adds payment method, gets Arno copy approval.
- Morne sets up Make scenario (§4).
- Morne pastes Settings values (§6).
- End-to-end test (§7), then launch.
