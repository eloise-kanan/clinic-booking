# Pricing With Hardware Bundle

## Setup fee, device lease, software-only option, and contract structure

**For:** Business partner discussion
**By:** Goodcare Dental Booking Platform
**Date:** May 2026

---

## Executive Summary

We are considering bundling a **device** (iPad or Android tablet) with the platform subscription, secured under a **3 to 5 year contract**, to give clinics a turnkey appliance feel. This memo evaluates four pricing structures — including a **software-only** path for clinics that already own iPads — and lays out the full operating cost baseline on our side.

**Key numbers:**

- **Our fixed monthly operating cost: ~RM 922 / month** once we move off free tiers.
- **Software-only break-even**: ~clinic #8 (mixed tiers).
- **Hardware-bundled break-even**: similar ~#8 in net profit, but ~2× higher gross revenue per clinic.
- **Recommended default**: offer **all four options**, default to **Modular (Option C)** in the pitch.
- **Recommended contract length**: 3 years on hardware leases; 30-day cancellation on software-only.

---

## 1 · Our Operating Costs (the bills we pay)

This is what *we* pay every month to run the SaaS, regardless of how clinics are billed.

### 1.1 Core fixed costs (mandatory once live)

These hit the day the first real patient data goes into the system.

| Tool / service | Monthly cost (RM) | Purpose |
|---|---|---|
| Claude Code | 470 | Developer tooling. Required for ongoing maintenance + new features. |
| Vercel Pro | 95 | Hosting. Required for commercial use. Hosts all clinic instances. |
| Supabase Pro | 120 | Database + auth. PITR backups, 30-day retention. |
| Domain (`.com`, amortised) | 4 | Primary domain hosting all subdomains. RM 50 / year. |
| Google Workspace (business email) | 33 | `name@yourbrand.com` for credibility. |
| **Core fixed subtotal** | **RM 722 / month** | |

### 1.2 Amortised one-time costs

These are one-time spends, spread across their useful life.

| Item | One-time cost (RM) | Monthly equivalent (amortised) |
|---|---|---|
| Legal: DPA template + Terms of Service (MY lawyer) | 2,000–3,000 | ~50 over 5 years |
| Professional indemnity insurance | 1,500–3,000 / year | ~200 |
| SSM business registration (if not already) | 1,500 | trivial |
| **Amortised legal & insurance subtotal** | | **~RM 250 / month** |

### 1.3 Scaling costs (add as we grow)

These come online at specific clinic-count milestones.

| Tool / service | Monthly cost (RM) | When to add |
|---|---|---|
| Sentry (error tracking) | ~120 | At clinic #10. Catches production bugs before customers call. |
| Freshdesk / Intercom (support) | 0 → 350 | Free tier OK until ~clinic #20 |
| PostHog / Mixpanel (analytics) | 0 → 250 | At clinic #30 |
| Resend / SendGrid (email delivery) | 0 → 95 | When email reminders are added; free up to 100 / day |
| Freelance dev support (10 hrs / month) | ~1,000 | At clinic #20, for sanity |
| Marketing budget (Google Ads, FB Ads) | 500–2,000 | When scaling beyond friends-of-friends |

### 1.4 Per-clinic variable costs

#### Single-tenant model (today — each clinic has its own Supabase project)

| Item | Per clinic (RM) | Why |
|---|---|---|
| Supabase Pro | 120 / month | Each clinic owns a Supabase project |
| Vercel | 0 | Shared team plan |
| Subdomain | 0 | Free under main domain |
| Custom domain (optional) | ~8 / month | Pass-through to customer |

#### Multi-tenant model (after refactor — all clinics in one Supabase)

| Item | Per clinic (RM) | Why |
|---|---|---|
| Supabase incremental | 5–15 / month | DB + bandwidth growth |
| Vercel incremental | 0–2 / month | Function invocations |

**The refactor pays for itself at clinic #4.** Every clinic above that on single-tenant adds RM 120 / month of pure cost.

### 1.5 Total operating cost summary

| Phase | Monthly cost (RM) |
|---|---|
| **Today — free tiers, no real patients** | 0 (only Claude Code: 470) |
| **Live with 1 paying clinic, Pro tiers, multi-tenant** | 922 + 250 = ~1,172 |
| **10 clinics, multi-tenant** | 1,172 + 120 (Sentry) + 100 (incremental infra) = ~1,400 |
| **20 clinics, multi-tenant** | + 1,000 (freelance dev) = ~2,400 |
| **50 clinics, multi-tenant** | + 350 (support tool) + 250 (analytics) = ~3,000 |
| **100 clinics, multi-tenant** | + scaling = ~3,800 |

**The one number to remember: RM 1,172 / month is our real baseline burn once we have one live clinic.**

---

## 2 · Device Cost Assumptions

For partners who choose a hardware-bundled option. Final cost owed by partner — assumed prices below.

| Package | Device | Bundled accessories | Total cost (RM) |
|---|---|---|---|
| Basic | Lenovo Tab M10 (or similar 10" Android) | Case + wall mount + charger | 1,300 |
| Standard | iPad 10.9" Wi-Fi (10th gen) | Case + counter stand + charger | 2,500 |
| Premium | iPad Pro 11" Wi-Fi | Case + counter stand + Pencil + charger | 4,800 |

**Recommended default: Standard.** iPadOS reliability, 5+ years of OS updates, better PWA experience.

### 2.1 Recurring device cost (per device per month)

| Item | 3-year contract (RM) | 5-year contract (RM) |
|---|---|---|
| Device amortisation (Standard iPad) | 69 | 42 |
| Device insurance | 30 | 30 |
| Replacement reserve (5–8 % / yr of device cost) | 18 | 12 |
| Delivery + setup logistics | 2 | 2 |
| **Effective monthly cost per device** | **~RM 119** | **~RM 86** |

Basic device: ~RM 70 / month (3-yr). Premium: ~RM 195 / month (3-yr).

---

## 3 · Four Pricing Options To Offer

### Option A · Fully Bundled

One monthly price covers software + hardware + training + support. Clinic pays one number.

| Tier | Bundled monthly (RM) | Setup fee (RM) | What's included |
|---|---|---|---|
| Basic | 200 | 1,500 | Basic software + Standard iPad + training |
| Standard | 280 | 1,500 | Standard software + Standard iPad + training |
| Pro | 380 | 1,500 | Pro software + Standard iPad + training |
| Franchise | 520 / branch | 2,500 / branch | Franchise software + Standard iPad / branch |

- 3-year contract on the hardware portion.
- Customer pays the same price each month, predictable.
- Margin on Basic tier is thin (software RM 80 + hardware RM 119 = RM 199 cost vs RM 200 charge).

### Option B · Setup-Loaded

Large one-off fee absorbs device cost; clean software-only monthly thereafter.

| Tier | Setup fee (RM) | Monthly (RM) | What setup includes |
|---|---|---|---|
| Basic | 2,500 | 80 | Standard iPad + training + onboarding |
| Standard | 2,500 | 150 | Standard iPad + training + onboarding |
| Pro | 2,500 | 250 | Standard iPad + training + onboarding |
| Franchise | 3,500 / branch | 400 / branch | Standard iPad + training + per-branch setup |

- Clean monthly easy to compare vs Calendly.
- RM 2,500 upfront is a real ask — some clinics may want to spread payments.
- We get hardware capital recovered on day one (no amortisation risk).

### Option C · Modular (recommended default)

Software tier and hardware lease are independent line items. Maximum flexibility.

| Component | Monthly cost (RM) |
|---|---|
| **Software tiers** | Basic 80 · Standard 150 · Pro 250 · Franchise 400 / branch |
| **Hardware lease (3-year)** | Basic device 70 · Standard 119 · Premium 195 |
| **Setup fee (one-off)** | 1,500 — training + onboarding only (no device) |

**Sample monthly bills**:

- Small clinic, Basic software + Standard iPad → RM 80 + RM 119 = **RM 199 / month**
- Mid clinic, Standard software + Standard iPad → RM 150 + RM 119 = **RM 269 / month**
- Large clinic, Pro software + Premium iPad → RM 250 + RM 195 = **RM 445 / month**

Why this is the default in the pitch:

- Clinics with their own iPads save money (Option D path below).
- Clinics that want turnkey get hardware in one line item.
- Upsell path is clear (upgrade device or software tier independently).

### Option D · Software-Only (new — no hardware)

For clinics that already own a tablet, or only need the dashboard on staff laptops/phones.

| Tier | Monthly (RM) | Setup fee (RM) | Contract |
|---|---|---|---|
| Basic | 80 | 1,500 | 30-day cancellation |
| Standard | 150 | 1,500 | 30-day cancellation |
| Pro | 250 | 1,500 | 30-day cancellation |
| Franchise | 400 / branch | 1,500 + 500 / additional branch | 30-day cancellation |

- No hardware obligation, so no multi-year lock-in needed.
- Lowest entry price — best for cautious clinics, friend rate, and trial conversions.
- Setup fee still covers training, onboarding, customisation.
- Most flexible — clinic can install on existing devices, dentist's personal iPhone, the receptionist's PC.

---

## 4 · Scale Projections — All Four Options

Assumes the same mix in each scenario: 30 % Basic, 50 % Standard, 20 % Pro. Operating cost line follows the multi-tenant model after the refactor.

### 4.1 Revenue per clinic by option (mixed tier average)

| Option | Average revenue per clinic per month (RM) | Composition |
|---|---|---|
| A · Bundled | 281 | Software 137 + Device 119 + premium margin 25 |
| B · Setup-Loaded | 137 | Software-only monthly, but RM 2,500 / clinic upfront |
| C · Modular | 256 | Software 137 + Device 119 |
| D · Software-Only | 137 | Software only |

### 4.2 Scale table — 100 % Option D (software-only)

| # clinics | Revenue (RM) | Operating cost (RM) | Net profit (RM) |
|---|---|---|---|
| 1 | 137 | 1,172 | −1,035 |
| 3 | 411 | 1,202 | −791 |
| 5 | 685 | 1,222 | −537 |
| 10 | 1,370 | 1,400 | −30 |
| 15 | 2,055 | 1,450 | +605 |
| 25 | 3,425 | 1,550 | +1,875 |
| 50 | 6,850 | 2,000 | +4,850 |
| 100 | 13,700 | 2,800 | +10,900 |
| 200 | 27,400 | 3,800 | +23,600 |

**Software-only break-even: ~clinic #11.** Heaviest path to break-even but lowest customer acquisition friction.

### 4.3 Scale table — 100 % Option C (modular with hardware)

| # clinics | Revenue (RM) | Hardware true cost (RM) | Software op cost (RM) | Net profit (RM) |
|---|---|---|---|---|
| 1 | 256 | 119 | 1,172 | −1,035 |
| 3 | 768 | 357 | 1,202 | −791 |
| 5 | 1,280 | 595 | 1,222 | −537 |
| 10 | 2,560 | 1,190 | 1,400 | −30 |
| 15 | 3,840 | 1,785 | 1,450 | +605 |
| 25 | 6,400 | 2,975 | 1,550 | +1,875 |
| 50 | 12,800 | 5,950 | 2,000 | +4,850 |
| 100 | 25,600 | 11,900 | 2,800 | +10,900 |

**Modular break-even: ~clinic #11**, same as software-only in net profit terms — but gross revenue is ~2× higher, which matters for working capital and valuation.

### 4.4 Scale table — 100 % Option A (fully bundled)

| # clinics | Revenue (RM) | Hardware true cost (RM) | Software op cost (RM) | Net profit (RM) |
|---|---|---|---|---|
| 1 | 281 | 119 | 1,172 | −1,010 |
| 5 | 1,405 | 595 | 1,222 | −412 |
| 10 | 2,810 | 1,190 | 1,400 | +220 |
| 25 | 7,025 | 2,975 | 1,550 | +2,500 |
| 50 | 14,050 | 5,950 | 2,000 | +6,100 |
| 100 | 28,100 | 11,900 | 2,800 | +13,400 |

**Bundled break-even: ~clinic #9.** Higher gross margin per clinic (built-in premium of RM 25), but harder sell on Basic tier (RM 200 sticker).

### 4.5 Scale table — 100 % Option B (setup-loaded)

This is unique because the RM 2,500 setup fee per clinic is a *cash injection*, not recurring revenue. Monthly economics are identical to Option D — but cash flow front-loaded.

| Year | New clinics signed | Setup fee revenue (RM) | Subscription revenue (RM) | Total revenue (RM) |
|---|---|---|---|---|
| Year 1: 10 clinics | 10 | 25,000 | 137 × 12 × ~5 = 8,220 | 33,220 |
| Year 2: 25 clinics | +15 | 37,500 | 137 × 12 × 18 = 29,592 | 67,092 |
| Year 3: 50 clinics | +25 | 62,500 | 137 × 12 × 37 = 60,828 | 123,328 |

**Option B advantage**: heavy cash injection in early years funds the operational burn. The trade-off: each clinic represents a single big sale negotiation instead of repeating monthly billings.

### 4.6 The realistic mix scenario

Most clinics won't all pick the same option. Realistic mix:

- 40 % choose Option D (software-only) — cautious clinics, friend rate, trials
- 40 % choose Option C (modular) — turnkey but flexible
- 15 % choose Option A (bundled) — clinics that want one number
- 5 % choose Option B (setup-loaded) — clinics with budget for upfront

Weighted-average revenue per clinic per month: **~RM 200**

| # clinics | Revenue (RM) | Hardware cost (RM) | Software op cost (RM) | Net profit (RM) |
|---|---|---|---|---|
| 1 | 200 | 71 | 1,172 | −1,043 |
| 5 | 1,000 | 357 | 1,222 | −579 |
| 10 | 2,000 | 714 | 1,400 | −114 |
| 15 | 3,000 | 1,071 | 1,450 | +479 |
| 25 | 5,000 | 1,785 | 1,550 | +1,665 |
| 50 | 10,000 | 3,570 | 2,000 | +4,430 |
| 100 | 20,000 | 7,140 | 2,800 | +10,060 |

**Realistic-mix break-even: ~clinic #11.** Same as the pure cases — this number is robust across mix variations.

---

## 5 · Contract Length: 3 vs 5 Years (hardware only)

For software-only (Option D), there is no need for a multi-year commitment. Software is 30-day cancellation, no penalty.

For hardware-bundled options (A, B, C), the question matters:

| Aspect | 3-year contract | 5-year contract |
|---|---|---|
| Monthly device cost (Standard iPad) | RM 119 | RM 86 |
| Customer total contract value (Standard tier, Option C) | (150 + 119) × 36 + 1,500 = ~RM 11,200 | (150 + 86) × 60 + 1,500 = ~RM 15,700 |
| Device age at end of contract | 3 years (still usable, refresh option) | 5 years (close to iOS EOL) |
| Customer commitment | Moderate | Strong |

**Recommendation: 3-year hardware contract** with Year-3 refresh option (we ship a new iPad, customer re-signs for another 3 years). Aligns with iPad's useful life and gives a recurring upsell event every three years.

**Early termination on hardware**: remaining device amortisation balance + 1 month software fee. Standard SaaS+hardware practice.

---

## 6 · New Cost Cliffs With Hardware

### Cliff 1 · Device damage at scale

Realistic rate: ~5 % per year (drops, splashes, accidents in clinic environment).

| Clinics | Devices in field | Yearly damaged (5 %) | Yearly replacement cost (RM) |
|---|---|---|---|
| 10 | 10 | 0–1 | 0 – 2,500 |
| 50 | 50 | 2–3 | 5,000 – 7,500 |
| 100 | 100 | 5 | 12,500 |
| 200 | 200 | 10 | 25,000 |

Mitigation: replacement reserve of RM 15–20 / month per device covers this. Above 50 clinics, formalise a hardware insurance partnership.

### Cliff 2 · iOS / Android EOL during contract

Ship only devices launched in the last 2 years — leaves 3+ years of OS support remaining. Stay on iPad over Android (longer support window).

### Cliff 3 · Supply chain shocks

Hardware can spike 20–30 % on tariffs, weak ringgit, or shortages. Mitigation:

- Lock device cost with partner via quarterly orders.
- Build 15 % margin into hardware lease price.
- Keep 5–10 device buffer once we exceed 20 clinics (~RM 25k working capital).

---

## 7 · Setup Fee Composition

Recommended setup fee: **RM 1,500** (Option C, D — modular / software-only) or **RM 2,500–3,500** (Option A, B with hardware).

What it covers in time and value:

| Item | Hours | Cost equivalent (RM) |
|---|---|---|
| Initial kickoff (site visit or Zoom) | 1 | 100 |
| Clinic onboarding: doctors, working hours, templates configured | 3 | 300 |
| Patient list import | 2 | 200 |
| Staff training (nurse, doctor, owner) | 3 | 300 |
| WhatsApp template customisation | 1 | 100 |
| Branding + theme setup | 1 | 100 |
| First-month support and tweaks | 4 | 400 |
| **Total time investment** | **15 hours** | **RM 1,500** |

For hardware-bundled (A, B): add RM 1,000–2,000 to cover device pass-through + delivery + on-site install.

---

## 8 · Decision Matrix For The Partner

| Question | Recommended answer |
|---|---|
| Which pricing options should we offer? | **All four (A, B, C, D)**. Lead with C in the pitch; let customer pick. |
| Default device package? | Standard (iPad 10.9", RM 2,500 cost) |
| Contract length on hardware? | 3 years with Year-3 refresh option |
| Software-only contract length? | Monthly, 30-day cancellation |
| Setup fee? | RM 1,500 (no device) / RM 2,500–3,500 (with device) |
| Damage policy? | Excess paid by customer; reserve covers most cases |
| Device sourcing? | Partner supplies; we resell at a 15 % margin |
| Equity / cost-share split? | To be agreed |

---

## 9 · One-Page Summary

| Item | Recommendation |
|---|---|
| Lead with | Option C (Modular) in the sales pitch |
| Also offer | Option D (Software-only) for budget-sensitive clinics |
| Reserve for | Options A and B for clinics asking for "one number" |
| Default device | iPad 10.9" Wi-Fi (~RM 2,500 cost) |
| Hardware lease | 3-year contract, RM 119 / month effective |
| Software tiers | Basic 80 · Standard 150 · Pro 250 · Franchise 400 / branch |
| Setup fee | RM 1,500 (software-only or modular) |
| Our fixed monthly burn (Pro tiers, 1+ clinic) | ~RM 1,172 |
| Realistic break-even point | clinic #11 in net profit (across all options) |
| First-year cash injection from setup fees | ~RM 15,000 (assuming 10 clinics signed) |

— End of memo —
