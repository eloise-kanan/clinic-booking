# Cost & Financial Risk Analysis

## Dental Operations SaaS — Worst-case projections and break-even logic

**For:** Internal planning · Business-partner discussion
**By:** Goodcare Dental Booking Platform
**Date:** May 2026

---

## Executive Summary

This memo lays out every cost line item we will face running a multi-clinic dental operations SaaS, projects scale economics from 1 to 200 clinics, and identifies six *cost cliffs* where the bill steps up unexpectedly. The goal is to ensure no cost surprises and to align on a "subsidy budget" before scaling sales.

**Key numbers to remember:**

- **RM 922 / month** is the fixed monthly burn once we go live on proper Pro tiers.
- **Break-even sits at clinic #7–8** on a mixed tier portfolio. At friend-rate (RM 80) only, it climbs to clinic #12.
- **Multi-tenant refactor must happen at clinic #4** — every month delayed costs RM 120 per additional clinic on single-tenant.
- **Worst realistic loss over 6 months if no client converts: ~RM 14,000**, mostly Claude Code + infrastructure baseline.

---

## 1 · Fixed Monthly Costs

These are paid regardless of clinic count. They begin the day the first paying clinic stores real patient data and we must upgrade off free tiers.

| Item | Monthly cost (RM) | Notes |
|---|---|---|
| Claude Code subscription | 470 | Developer tooling. Required for ongoing maintenance. |
| Vercel Pro (team plan) | 95 | Required for commercial use. Hosts all clinic instances. |
| Supabase Pro (1st project) | 120 | First clinic / multi-tenant DB. PITR backups, 30-day retention. |
| Domain registration (`.com`, amortised) | 4 | ~RM 50/year × 1 primary domain. |
| Google Workspace (business email) | 33 | For `name@yourbrand.com`. |
| **Fixed monthly burn (core)** | **RM 722** | |

Plus the following amortised one-time costs:

| Item | Cost (RM) | Amortised monthly equivalent |
|---|---|---|
| Legal DPA template + Terms of Service | 2,000–3,000 once | ~50/mo over 5 years |
| Professional indemnity insurance | 1,500–3,000/year | ~200/mo |
| **Amortised legal & insurance** | | **~RM 250/mo** |

**Realistic fixed monthly burn: RM 722 + RM 200 = ~RM 922 per month.**

---

## 2 · Per-Clinic Variable Costs

### 2.1 Single-tenant model (today)

Each clinic owns its own Supabase project. This is our current setup until the multi-tenancy refactor.

| Item | Per clinic | Why |
|---|---|---|
| Supabase Pro | RM 120 / month | Each clinic owns a Supabase project |
| Vercel | RM 0 | Shared team plan; unlimited projects |
| Subdomain | RM 0 | `clinic-name.yourapp.com` is free under the main domain |
| Custom domain (optional) | ~RM 8 / month | If clinic wants their own domain, ~RM 100/year |
| **Per-clinic cost** | **RM 120–128 / month** | |

### 2.2 Multi-tenant model (after refactor)

All clinics share one Supabase database with row-level isolation. Cost per clinic flattens dramatically.

| Item | Per clinic | Why |
|---|---|---|
| Supabase incremental | RM 5–15 / month | DB + bandwidth growth. Within Pro plan up to ~500 clinics. |
| Vercel incremental | RM 0–2 / month | Function invocations within Pro plan up to ~1,000 clinics |
| Custom domain (optional) | ~RM 8 / month | Same as above |
| **Per-clinic cost** | **RM 5–25 / month** | |

### 2.3 The refactor break-even

At 4–5 clinics, single-tenant Supabase bills (4 × RM 120 = RM 480–600/month) cost about the same as paying for the 1–2 week multi-tenancy refactor. After the refactor, costs flatten and we can scale to hundreds of clinics on the same flat infrastructure cost.

**Decision rule: trigger the refactor when the fourth clinic signs.**

---

## 3 · Patient Volume Assumptions

Based on Malaysian dental clinic realities. Used to estimate Supabase usage per clinic.

| Clinic size | Active patients | Bookings / month | Active staff | DB use | Bandwidth / month |
|---|---|---|---|---|---|
| Small (1–2 doctors) | 100–500 | 30–150 | 1–3 | ~3–8 MB | ~20–60 MB |
| Medium (2–4 doctors) | 500–2,000 | 150–500 | 3–6 | ~10–30 MB | ~80–250 MB |
| Large (4–8 doctors) | 2,000–6,000 | 500–1,500 | 6–12 | ~40–120 MB | ~300 MB – 1 GB |
| Franchise (per branch) | Same as Large | 500–1,500 | 6–12 | ~50–150 MB | ~400 MB – 1.5 GB |

**Worst-case per clinic**: a large dental chain with 8,000 patients, 2,000 bookings/month, 15 staff, with photo uploads. Estimated usage: ~200 MB DB, ~2 GB bandwidth. This remains well within Supabase Pro limits up to ~30 such heavy clinics.

---

## 4 · Scale Projections (Multi-Tenant)

Assuming typical tier mix: 30% Basic (RM 80), 50% Standard (RM 150), 20% Pro (RM 250). Weighted-average revenue per clinic = RM 137 / month.

| # clinics | Monthly revenue (RM) | Infrastructure cost (RM) | Net profit / loss (RM) | Notes |
|---|---|---|---|---|
| 1 (friend, free 3 months) | 0 → 80 | 922 | −842 | The "subsidise to learn" phase |
| 3 | 411 | 952 | −541 | Still bleeding; multi-tenant not yet worth it |
| 5 | 685 | 972 | −287 | Refactor multi-tenant NOW |
| 10 | 1,370 | 1,022 | +348 | First profitable month |
| 15 | 2,055 | 1,072 | +983 | Comfortable |
| 25 | 3,425 | 1,172 | +2,253 | Good business |
| 50 | 6,850 | 1,200 | +5,650 | Plan ops support or another engineer |
| 100 | 13,700 | 1,600 | +12,100 | Hiring needed |
| 200 | 27,400 | 2,500 | +24,900 | Consider Supabase Team plan upgrade |

### 4.1 Break-even points

- **Mixed-tier portfolio:** ~clinic #7–8.
- **Friend-rate (RM 80) only:** ~clinic #12.
- **Pro tier only (RM 250):** ~clinic #4.

Below break-even, we subsidise out of pocket. Plan accordingly.

---

## 5 · Six Cost Cliffs to Watch For

These are points where costs step up unexpectedly. Each is preventable with the right trigger rule.

### Cliff 1 · Multi-tenant refactor delayed past clinic #4

If we stay single-tenant longer than the refactor break-even:

| Clinics | Single-tenant infrastructure cost (RM / month) |
|---|---|
| 5 | 922 + 5 × 120 = 1,522 |
| 10 | 922 + 10 × 120 = 2,122 |
| 15 | 922 + 15 × 120 = 2,722 |
| 20 | 922 + 20 × 120 = 3,322 |

Every Supabase project past the fourth is RM 120/month of pure cost. **Trigger rule: refactor at clinic #4. Hard stop.**

### Cliff 2 · Supabase plan upgrade at high scale

Supabase Pro plan includes 100 GB egress and 100k Monthly Active Users. Projected exhaustion:

| Scale | Egress per month | MAU | Pro plan adequate? |
|---|---|---|---|
| 50 clinics (~5 staff each) | ~10 GB | ~500 | Yes |
| 200 clinics | ~80 GB | ~2,000 | Yes, just barely |
| 500 clinics | ~300 GB | ~5,000 | Overage: ~RM 100/month extra |
| 1,000 clinics | ~800 GB | ~10,000 | **Move to Supabase Team plan: ~RM 2,800/month** |

The Team plan upgrade lifts limits dramatically. Trigger between clinics 500–800.

### Cliff 3 · WhatsApp Business API (if ever added)

Current model is free — wa.me links open the nurse's WhatsApp. **Keep this model as long as possible.**

If a clinic ever demands fully-automated messages (no human in loop), Meta charges per message:

| Conversation type | Cost per message (RM) | Per clinic per month (500 patients × 5 msgs) |
|---|---|---|
| Service conversation | 0.06–0.10 | 150–250 |
| Marketing conversation | 0.30–0.50 | 750–1,250 |

**Verdict**: WhatsApp API is a *per-clinic* cost. If offered, price as a paid add-on (~RM 200/month), not bundled into the base tier.

### Cliff 4 · SMS fallback

For patients without WhatsApp. From Malaysian gateways:

| Volume | Cost per SMS (RM) | Per clinic per month (200 reminders × RM 0.15) |
|---|---|---|
| Standard SMS | 0.10–0.20 | ~30 (small clinic) |
| 5,000 reminders | 0.10–0.20 | ~750 (large clinic) |

**Verdict**: Same as WhatsApp API. Paid add-on, not bundled.

### Cliff 5 · Domain proliferation

Per clinic, the domain choice:

| Choice | Annual cost (RM) | Who pays |
|---|---|---|
| Subdomain (`clinic.yourapp.com`) | 0 (under your domain) | You — already paid |
| Their existing domain via CNAME | 0 to us | The clinic |
| New domain we register for them | 50–150/year | Us, unless we charge through |

**Recommendation**: subdomain by default. Custom domain = RM 100 one-time setup pass-through.

### Cliff 6 · External support tools as we scale

These become necessary at known scale milestones:

| Tool | Monthly (RM) | When to add |
|---|---|---|
| Error tracking (Sentry) | ~120 | At clinic #10. Catches production bugs before clients call. |
| Customer support (Freshdesk / Intercom) | 0 → 350 | Free tier OK until clinic #20. Paid when nurses need real chat support. |
| Product analytics (PostHog free / Mixpanel) | 0 → 250 | At clinic #30. Track which features get used. |
| Freelance dev support (10 hrs/month) | ~1,000 | At clinic #20. So you can sleep. |

All optional but recommended for sanity.

---

## 6 · Hidden & One-Time Costs

| Item | Cost (RM) | When |
|---|---|---|
| Legal DPA template + Terms of Service (MY lawyer) | 2,000–3,000 once | Before first paying clinic signs |
| Professional indemnity insurance | 1,500–3,000 / year | At first real patient data |
| SSM business registration (if not already) | 1,500 once | Before invoicing |
| Bookkeeping (Wave free, or accountant) | 0 → 200 / month | After clinic #5 |
| GST / SST registration | 0 | Only at RM 500k annual revenue (≈ clinic 300+) |
| Marketing budget (Google Ads, Facebook) | 500–2,000 / month | When ready to scale beyond friends |
| Cloudflare DNS + DDoS (free tier) | 0 | At launch |

**One-time hardening required before invoicing first paying clinic: ~RM 5,000.**

---

## 7 · Best Case vs Worst Case Scenarios

### 7.1 Best case (everything goes right)

- Friend signs at month 1. RM 80/month.
- Word-of-mouth produces 2 more clinics at month 4 (RM 150/month each).
- Multi-tenant refactor completed at month 3.
- At month 12: 8 clinics across all tiers = ~RM 1,200/month revenue.
- **Year 1 P&L**: revenue ~RM 8,000, costs ~RM 11,000 → **loss RM 3,000**.
- **Year 2** (20 clinics): revenue ~RM 33,000, costs ~RM 14,000 → **profit RM 19,000**.

### 7.2 Worst case (slow validation)

- Friend uses free for 6 months then walks away. Zero revenue.
- Claude Code + Vercel Pro + Supabase Pro = RM 922/month fixed burn.
- Plus amortised legal & insurance: ~RM 250/month.
- **12 months of bleed = approximately RM 14,000 out of pocket.**
- Plus unrecovered build time (3+ weeks of unpaid engineering).

This is survivable but painful. The mitigation is conservative: stay on free tiers as long as possible. The day no real patient data exists, RM 922/month is **not yet** a required spend.

---

## 8 · Cost-Control Recommendations

1. **Stay on free tiers until first real patient data enters the system.** Vercel Hobby + Supabase free = RM 0/month. Upgrade only the day the friend's clinic actually goes live with real patients.

2. **Set a subsidy budget upfront.** Suggested cap: **RM 8,000 over 6 months**. Anything beyond that means the model is not validating and we should pause sales rather than keep optimistically burning.

3. **Charge a setup fee aggressively.** RM 1,000 setup × 3 clinics = RM 3,000 of cushion before recurring costs begin biting.

4. **Trigger the multi-tenant refactor at clinic #4, not #10.** Every month of delay costs RM 120 per additional clinic.

5. **Don't bundle WhatsApp API or SMS into base tiers.** Make both paid add-ons. Otherwise we lose money on high-volume clinics.

6. **Set a quarterly review.** Every 3 months: count clinics, revenue, costs. If costs exceed revenue × 1.5, pause and adjust before continuing.

---

## 9 · Decisions Needed from Business Partner

To finalise the financial plan, the following decisions are owed:

1. **What is our maximum subsidy budget?** Suggested RM 8,000 over 6 months. Could go higher (e.g. RM 15,000 over a year) if we are confident the product needs that much runway to validate.
2. **Setup fee policy.** RM 1,000 standard, or sliding scale by tier?
3. **Friend pricing.** Is RM 80/month plus first 3 months free for the friend clinic acceptable? Or should we lock in revenue from day one?
4. **Cap on Pro-tier upgrades.** Do we upgrade Vercel + Supabase Pro the moment the first real patient lands, or wait until paid revenue covers it?
5. **Do we split costs between partners?** What is the equity / cost-share arrangement?
6. **At what clinic count do we hire?** Suggested: at clinic #20 we bring in part-time freelance support. At clinic #50 a full-time engineer.

---

## 10 · The One Number to Remember

**RM 922 / month is the baseline burn** once we go live on Pro tiers.

That is the minimum we owe regardless of having 0 or 50 clinics. Sales pipeline must produce roughly 8 mixed-tier clinics, or 12 friend-rate clinics, simply to break even.

Below that count, we subsidise. Above it, the business compounds nicely.

— End of memo —
