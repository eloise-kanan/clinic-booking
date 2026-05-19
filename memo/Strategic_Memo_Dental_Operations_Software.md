# Strategic Memo

## The Operations Gap in Malaysian Dental Practice

**For:** Internal planning · Customer conversations
**By:** Goodcare Dental Booking Platform
**Date:** May 2026

---

## Executive Summary

Malaysian dental clinics already have software for **patient records and billing** — DoctorPartner, Aoikumo, Kreloses, kumoDoc. Those tools cover the clinical side. They do *not* cover the **operational side** of running a clinic, and they certainly do not cover the **business side** of running a franchise.

We are not replacing patient management software. We are building the layer that runs everything else: bookings, staff scheduling, payroll, compliance, marketing, recall, multi-branch reporting. The clinic keeps DoctorPartner. They add us.

This memo identifies the operational pain points that dental owners — especially those running multiple branches — quietly absorb today, ranks them by urgency, and proposes a tiered product roadmap that can be sold immediately on Tier 1 features while signalling the larger vision.

---

## 1 · How Owners Currently Work (the spreadsheet stack)

Talk to any dental clinic owner in Malaysia and the back-office workflow looks like this:

- **Bookings** — phone calls, WhatsApp messages, paper diary. *Already covered by our existing product.*
- **Staff schedule** — WhatsApp group, Excel sheet, occasional shouting at lunch.
- **Payroll** — calculator + accountant's spreadsheet, deductions estimated by hand.
- **Doctor commissions** — manual end-of-month tally from the billing software, disputes common.
- **Compliance** — calendar reminders on the owner's phone (if at all). MMC renewal forgotten until the regulator calls.
- **Recall** — non-existent. Patients who don't come back simply churn.
- **Marketing** — Facebook posts when the owner remembers, no idea which ads bring patients.
- **Multi-branch coordination** — Monday morning WhatsApp asking each branch for an Excel summary.

Each of these is a known pain. None has a quality Malaysian-built solution. Most clinics simply absorb the cost as "running a clinic is hard."

---

## 2 · The Two Strategic Bets

We are betting on two things being simultaneously true:

1. **Generic global SaaS (Calendly, SimplyBook.me) is too generic** to serve a Malaysian dental clinic well. No IC validation, no PDPA awareness, no MMC tracking, no Bahasa templates.
2. **Local full-suite players (Aoikumo, kumoDoc) are too heavy** — they require migrating an entire practice into their EMR + billing. Most clinics are happy with DoctorPartner; they will not migrate.

We sit in the gap: **modern, branded, Malaysian, deep on operations — but staying out of clinical records and payments.**

That gap is the entire opportunity.

---

## 3 · What Franchise Dental Bosses Actually Lose Sleep Over

The following table maps the operational pain points dental owners experience, ranked by **frequency × financial impact × current tooling gap.**

### 3.1 HR & People management

| Pain | Frequency | Cost when missed |
|---|---|---|
| Doctor commission disputes | Monthly | Trust erosion, doctor leaves |
| Payroll deductions (EPF/SOCSO/EIS) calculated wrong | Monthly | Penalties from KWSP/PERKESO |
| Leave balance arguments ("I have 5 days left, no you have 3") | Weekly | Morale damage |
| MMC renewal forgotten | Once | Doctor cannot legally practice |
| AELB radiology cert expired | Once | RM 50,000 fine + equipment seized |
| Professional indemnity insurance lapsed | Once | No coverage on next claim |
| Locum coverage on short notice | Variable | Walk-in patients turned away |
| CE / CPD hours not tracked | Annual | Doctor registration risk |

**Conclusion:** Doctor commission, leave balance, and compliance reminders are the three HR features that would justify upgrading from a free spreadsheet within the first week.

### 3.2 Compliance & Regulatory (Malaysia-specific)

Dental clinics in Malaysia must keep track of, at minimum, **nine separate renewal calendars**:

| Renewal | Cadence | Consequence of missing |
|---|---|---|
| Practice license (KKM) | Annual | Forced closure |
| Doctor MMC registration | Annual | Doctor cannot practice |
| MDA membership | Annual | Network access lost |
| Radiology cert (AELB) per X-ray unit | Annual | RM 50k fine + equipment seized |
| Professional indemnity insurance | Annual | No coverage on next claim |
| Fire safety inspection (BOMBA) | Annual | Penalties, possible closure |
| Sterilisation cycle logs (autoclave) | Daily | Audit findings, KKM warnings |
| Biohazard waste disposal manifests | Per pickup | RM 10k+ fines |
| SSM annual return | Annual | Late penalties, struck off |
| PDPA consent register | Continuous | Up to RM 500k fine per breach |

**No competitor handles this dental-specifically in Malaysia.** A simple "Compliance dashboard" with 60/30/7-day advance reminders would, on its own, justify the entire subscription. One near-miss saved pays for thirty years of platform fees.

### 3.3 Marketing & Patient Retention

The single largest under-tapped revenue lever in dental: **patients who came once and never returned**.

| Capability | Revenue impact |
|---|---|
| **Recall reminders** (6-month / 12-month auto-WhatsApp to lapsed patients) | Industry data: clinics with active recall systems see 30–50% more visits per patient lifetime |
| Win-back campaigns (no visit in > 12 months) | High — recovers churned revenue |
| Birthday / anniversary auto-greetings | Indirect — patient trust + retention |
| Lead source tracking (which channel brought this patient?) | Medium — sharpens marketing spend |
| Loyalty / referral rewards | Medium — drives word-of-mouth |
| Bulk WhatsApp campaigns with PDPA consent | Medium |
| Review monitoring (Google, Facebook) | Medium |
| Patient NPS post-visit | Medium — quality signal |

**Recall alone funds the platform.** A clinic seeing 100 patients/month who would otherwise lose 50% to non-return is missing out on RM 50,000+/year in repeat scaling appointments. RM 150/month subscription is a rounding error against that.

### 3.4 Financial / Business Intelligence (without touching payments)

Reports derived from already-captured booking and attendance data, with no payment-processing footprint:

- Revenue per doctor / per chair / per branch
- Treatment-mix analysis (margin by procedure)
- Cash-flow forecast for next 30 days based on confirmed bookings
- Outstanding receivables aging *(if owner enters invoice status — not actual payments)*
- No-show financial impact dashboard
- Cost per patient acquisition by channel
- Patient lifetime value
- Chair utilisation rate

DoctorPartner generates some of these for the clinical side. None offer cross-branch consolidation or marketing-ROI attribution.

### 3.5 Operations

- **Inventory with auto-reorder** — running out of gloves mid-day, ordering anaesthetic the day it expires
- **Lab work tracking** — crown sent to lab, ETA, lab invoice reconciliation against patient charge
- **Equipment maintenance schedule** — autoclave service intervals, compressor checks, X-ray calibration
- **Asset register** — every chair, X-ray, sterilizer with serial, warranty, depreciation
- **Daily checklists** — opening / closing routines, sterile pouch stock
- **Walk-in queue management** — visible to receptionist and doctor
- **Shift handover notes** — morning to evening team continuity

### 3.6 Multi-Branch / Franchise (the strategic differentiator)

These features only matter once a clinic has two or more branches — but at that point they are *impossible to live without*, and nothing in the Malaysian market handles them well:

- **Cross-branch dashboard** — all branches' revenue, bookings, no-show rate at a glance
- **Patient transfer** between branches with full history continuity
- **Centralised staff roster** — assign locum to whichever branch needs cover
- **Centralised purchasing** — group volume discount on consumables across branches
- **Royalty fee tracking** — franchisor's % of each franchisee's revenue, auto-calculated
- **Brand compliance audits** — logo, signage, uniform, mystery shopper results
- **Per-franchisee onboarding workflow** — new branch open in three weeks not three months
- **Marketing fund pool** — each branch contributes a percentage; spend tracked centrally
- **Inter-branch reporting** — franchisor sees per-branch P&L

### 3.7 Vendor & Supplier Management

- Vendor directory with contacts, pricing, lead times
- Pricing comparison across suppliers
- Auto-PO generation when stock low
- Lab invoice reconciliation (lab cost vs patient charge — margin per procedure)
- Service contracts (compressor maintenance, autoclave servicing, etc.)

### 3.8 Customer Experience

- Wait time tracking (booked at 10:00, actually seen at 10:35)
- NPS / patient feedback collection post-visit
- Complaint logs with resolution tracking
- Patient retention rate over time

---

## 4 · Proposed Product Roadmap (Tiered Pricing)

### Basic — RM 80 / month per clinic
**Positioning:** *"DoctorPartner sidekick — solve the booking and WhatsApp pain"*

Already built and shipping:
- Online booking, slot management, attendance
- WhatsApp templates + reminders, send tracking
- Mobile home-screen app (PWA)
- Branding & theme customisation
- 1–3 staff accounts

### Standard — RM 150 / month per clinic
**Positioning:** *"Run your clinic, not your spreadsheets"*

Basic, plus the daily operations layer:
- Multiple doctors with individual working hours
- Leave & shift change request workflows
- Duty calendar (week + month views)
- Audit log
- **NEW:** Compliance reminders dashboard ✨
- **NEW:** Patient recall (6-month / 12-month auto-flag) ✨
- **NEW:** Doctor commission tracking ✨

### Pro — RM 250 / month per clinic
**Positioning:** *"Manage like a real business"*

Standard, plus analytics and light HR:
- Revenue by doctor / chair / branch
- Treatment-mix analysis
- No-show financial impact dashboard
- Win-back campaigns
- Lead source tracking
- Patient feedback / NPS
- Locum scheduling
- Certifications expiry alerts
- Light payroll (EPF/SOCSO/EIS calc → payslip PDF generation)

### Franchise — RM 400 / month per branch
**Positioning:** *"Run multiple clinics like one"*

All Pro features per branch + the franchise layer:
- Cross-branch dashboard
- Centralised staff roster
- Patient transfer between branches
- Royalty fee tracking
- Centralised purchasing
- Brand compliance audits
- Per-franchisee onboarding wizard
- Marketing fund pool

### Enterprise — Custom
For ten-plus branch operators:
- All Franchise features
- Custom integrations (existing accounting, EMR)
- Dedicated support, SLA-backed
- White-label option

---

## 5 · Build Priorities After Current Scope

Ranked by **(value to clinic) × (low build complexity) × (selling power):**

1. **Compliance reminders dashboard.** Small build, mission-critical feel, RM 50k+ annual savings on one near-miss.
2. **Patient recall reminders.** Directly drives clinic revenue; justifies the subscription on the first returning patient.
3. **Doctor commission tracking.** The single most common dispute between owner and doctor. Bringing transparency builds trust.
4. **Treatment-mix + revenue dashboard.** Once attendance data accumulates, this is data nobody else has.
5. **Light payroll.** EPF/SOCSO/EIS deductions, payslip PDF — without actual money movement, no banking license needed.

After these five, the product is defensible against both generic SaaS and full-suite EMR competitors.

---

## 6 · Why This Is Defensible (the Malaysian Moat)

Several features are essentially **impossible for global SaaS to clone profitably:**

1. EPF / SOCSO / EIS auto-calculation with current rates and salary bands
2. MMC / MDA / AELB / KKM renewal calendar tracking
3. PDPA consent register with audit trail for marketing communications
4. SST exemption awareness (medical services are zero-rated under MY tax)
5. Bahasa Malaysia and Chinese WhatsApp templates as defaults
6. Bank Negara data residency guidelines (we host in Singapore region — defensible)
7. HRDF levy tracking for clinics with > 10 staff

A global player will never invest in any of this for the size of the Malaysian market. We will. That gap compounds the longer we operate.

---

## 7 · Customer Conversation Talking Points

When meeting a dental owner or franchise group, the structure that lands:

1. **Open with the gap.** *"You probably already use DoctorPartner for patient records. That's not what we replace. We handle the parts DoctorPartner doesn't — bookings, your nurses' day, staff scheduling, compliance, recall, multi-branch reporting."*

2. **Probe their pain.** *"How do you currently track when your MMC needs to be renewed? Your AELB cert? Your insurance? Doctor commissions?"* — almost always, the answer is "my own calendar" or "the accountant tells me".

3. **Anchor on revenue impact.** *"Industry data says clinics with recall systems see 30–50% more visits per patient. If you see 100 patients a month and half don't come back, you're leaving roughly RM 50k a year on the table."*

4. **De-risk the decision.**
   - Cancel any month — no contract, no termination fees.
   - 60-day money-back guarantee on the setup fee.
   - Data exports as CSV anytime — never trapped.
   - Doesn't replace DoctorPartner or accounting — runs alongside.

5. **Single ask.** *"Want to try Basic for free for the first month? We'll set up your clinic; you tell me on day 30 if it's helping. Worst case you've lost nothing."*

---

## 8 · What to Expect from Customer Conversations

Most owners will ask three things:

| Question | Honest answer |
|---|---|
| *"Can you do everything DoctorPartner does?"* | No, and we don't want to. We do everything around it. |
| *"What about payroll?"* | On the roadmap. We start with the calculation (deductions, commissions); actual disbursement stays in your accountant's hands. |
| *"How long to set up?"* | 3–5 working days. Onboarding includes training your nurse and importing existing patient list. |

The disqualifier we should hear cleanly:
- *"I don't use WhatsApp."* → Different product fit. Move on.
- *"I want one system for everything including EMR."* → Aoikumo / Kreloses fit them better. Move on.

The ideal customer:
- 1–10 doctors, 1–5 branches, already on DoctorPartner or similar
- Owner who spends Mondays consolidating WhatsApp updates from branches
- Loses sleep over compliance deadlines, leave fights, and doctor commissions

---

## 9 · Open Questions for Founder

To finalise pricing and roadmap, decisions needed:

1. **Confirm tier names + prices.** Basic RM 80 / Standard RM 150 / Pro RM 250 / Franchise RM 400/branch?
2. **Compliance reminders — Standard or Pro tier?** Recommend Standard (it's the killer feature).
3. **Recall reminders — same question.** Recommend Standard.
4. **Doctor commission tracking — Standard or Pro?** Could go either way; Standard makes a stronger story.
5. **Free trial length.** 30 days, 60 days, or specifically 3 months for first 10 customers?
6. **Setup fee — fixed RM 1,000, or sliding by tier?**

---

## 10 · Closing

The patient-management software market in Malaysia is crowded. The clinic-operations software market is almost empty. We are not the second-best Aoikumo. We are the first proper operations layer for clinics already using a clinical product they like.

Sell the gap. Build the moat. Charge for the time saved, the compliance averted, and the patients recalled.

— End of memo —
