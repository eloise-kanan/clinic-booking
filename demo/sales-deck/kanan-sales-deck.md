# Kanan Clinic Booking — Sales Deck (14 slides)

Source of truth for the slide content. Edit here, then re-run `build_kanan_sales_deck.py` to regenerate the PPTX. Brand follows Kanan guidelines (navy `#1B2A4A` + gold `#C9A227` + warm-white `#F4F1EA`, 60/30/10).

Audience: dental clinic owners in Malaysia (Klang Valley first). Tone: plain English, MY-friendly, operator voice, zero jargon, no AI buzzwords. Every feature framed as "no more X, now you Y."

---

## Slide 1 — Cover

**Title:** A booking system built for Malaysian dental clinics
**Subtitle:** by Kanan Digital Enterprise
**Tagline strip (bottom):** Your trusted right hand · kanan.my
**Visual:** Kanan wordmark, centered, large.
**Speaker note:** Open with: "We're Kanan. Two operators based in Malaysia. We built this for a friend's clinic that was drowning in WhatsApp reminders — and it stuck. Now we're offering it to clinics like yours."

---

## Slide 2 — The reality of running a small clinic

**Title:** Short-staffed and stretched thin?
**Lead:** Most days end the same way at a small dental clinic:
**Pain bullets:**
- 50+ WhatsApp messages a day, just to confirm and remind appointments
- A no-show wastes a whole 1-hour slot — and the patient never paid a deposit
- The owner has no idea who's actually busy and who's coasting
- Patient records live half in a notebook, half in a Google Sheet, half in someone's head
- When a doctor or nurse takes leave, the schedule unravels for a week

**Speaker note:** Let them nod. Don't oversell. Ask: "Which of these sounds like your Tuesday?"

---

## Slide 3 — Meet Kanan

**Title:** We've been there. So we built the right hand.
**Lead:** Kanan ("KAH-nahn") means *right* in Malay — as in *right hand*. The dependable hand on the right side of your business.
**Founders strip (2 boxes):**
- [Founder name 1] — [role / one-line bio]
- [Founder name 2] — [role / one-line bio]
**Position line:** A Malaysian software studio. We build for the businesses around us — not for venture capital.
**Speaker note:** Personalize. Use first names. Don't say "we leverage AI" — say "we built a thing that does X."

---

## Slide 4 — What we built

**Title:** One product. The whole booking lifecycle.
**3-column layout (each with icon + 1-line):**
- 📱 **Patient self-books** via your branded /book page — language toggle EN / CH / BM
- 💬 **Nurse runs the day** — pending queue, WhatsApp confirmation, reminders, recall
- 📊 **Owner sees everything** — bookings, doctor & nurse performance, audit log

**Visual cue:** Screenshot collage placeholder (3 panels: /book mobile · /nurse desktop · /owner dashboard)
**Speaker note:** This is the 30-second product. Three audiences, three views.

---

## Slide 5 — Patient flow (the /book page)

**Title:** Bookings without phone tag.
**Lead:** Your patient opens kanan.my/yourclinic/book on their phone. 4 taps to a request.
**Bullets:**
- Identity first (IC/passport + WhatsApp number), then they pick *what* they want — book / reschedule / cancel
- Language toggle: **EN · 中文 · BM** — the form translates, the name input stays Romanized for IC
- 5-week future window, real slot availability shown — no requests for slots that aren't actually free
- Submitted requests go to your nurse's queue, never directly into the calendar

**Visual:** Screenshot of /book on a phone (light) + /book in Chinese (right)
**Speaker note:** Show the live demo here if there's bandwidth.

---

## Slide 6 — Nurse workflow

**Title:** Your nurse stops being a router.
**Lead:** Today on Pending: every patient is one click away from confirmed, with the WhatsApp message pre-written.
**Bullets:**
- 6 WhatsApp templates editable by owner (check / confirm / cancel / reject / reminder / recall)
- Nurse clicks "Send" → opens WhatsApp with the message + slot already filled in — zero retyping
- Recall worklist surfaces patients overdue for their 6-month checkup automatically
- Every action audit-logged with the nurse's name + timestamp — so the owner can see who did what

**Visual:** Screenshot of /nurse with the Pending queue + a wa.me preview overlay
**Speaker note:** Highlight the audit log angle — owners love that they can verify.

---

## Slide 7 — Doctor workflow

**Title:** Your doctor sees the day, marks attendance, that's it.
**Bullets:**
- Clean today view of their bookings, in 9-9 grid
- One-tap "Attended" or "No-show" after each patient
- Block time (lunch / surgery prep / personal) without bothering the nurse
- See their own utilization heatmap (Premium)

**Visual:** Screenshot of /doctor today view
**Speaker note:** Doctors get value too — less admin interruptions during chair time.

---

## Slide 8 — Owner dashboard

**Title:** Finally, you can see the clinic.
**Bullets (with Premium-only callouts):**
- This week's bookings + repeat rate + pending count — at a glance
- 🔓 **Doctor performance** (Premium): bookings, attended, no-show, attendance % per doctor — last 7/30/90 days
- 🔓 **Nurse performance** (Premium): bookings created, approvals, reminders + recalls sent, attendance marks — per nurse
- 🔓 **Utilization heatmap** (Premium): which chair-hours are actually filled
- Full audit log — who did what, when, with before/after snapshots

**Visual:** Screenshot grid: doctor-perf + nurse-perf + utilization
**Speaker note:** This is where the upgrade pressure to Premium happens organically.

---

## Slide 9 — Standard tier

**Title:** Standard — RM 150 / month
**Seat caps headline (large):** 1 owner · 2 doctors · 3 nurses
**What's included (checklist):**
- ✅ Patient self-book + reschedule + cancel
- ✅ Nurse pending queue + WhatsApp templates
- ✅ Recall reminders (every 6 months, configurable)
- ✅ Duty calendar — doctor schedules
- ✅ Clinical calendar + working hours editor
- ✅ Branding (your logo, colors, font)
- ✅ Daily/weekly/monthly CSV email backup
- ✅ Overview dashboard (basic)
- ✅ Mobile-friendly throughout

**Footer line:** Need more seats? WhatsApp us — we top up without forcing an upgrade.

---

## Slide 10 — Premium tier

**Title:** Premium — RM 280 / month
**Seat caps headline (large):** 1 owner · 4 doctors · 6 nurses
**Lead:** Everything in Standard, plus the visibility you stop being able to live without:
**What's new (checklist):**
- ✨ Doctor performance dashboard (per-doctor attendance + no-show metrics)
- ✨ Nurse performance dashboard (per-nurse activity from the audit log)
- ✨ Chair utilization heatmap
- ✨ Duty calendar — **nurses included**, not just doctors
- ✨ Audit log access
- 🔜 Internal review system (post-visit star rating + Google review prompt) — *roadmap*
- 🔜 Payroll handoff (PayrollPanda integration) — *roadmap*

**Footer line:** Seat cap reached? We top up on WhatsApp. Don't force-upgrade just to add one nurse.

---

## Slide 11 — Side-by-side

**Title:** Standard vs Premium at a glance

| | Standard | Premium |
|---|---|---|
| **Monthly** | RM 150 | RM 280 |
| **Owner / Doctor / Nurse seats** | 1 / 2 / 3 | 1 / 4 / 6 |
| **Booking + WhatsApp templates** | ✅ | ✅ |
| **Recall reminders** | ✅ | ✅ |
| **Duty calendar — doctors** | ✅ | ✅ |
| **Duty calendar — nurses** | — | ✅ |
| **Doctor performance analytics** | — | ✅ |
| **Nurse performance analytics** | — | ✅ |
| **Chair utilization** | — | ✅ |
| **Audit log** | — | ✅ |
| **CSV backup** | ✅ | ✅ |
| **Mobile** | ✅ | ✅ |

**Speaker note:** Let them stare at this for 10 seconds. Don't talk through it line by line.

---

## Slide 12 — How we work (8 steps)

**Title:** Start to finish — no surprises
**Grid 4×2:**
1. **Talk to our team** — WhatsApp or a quick call. Tell us what's slowing you down.
2. **Schedule a discussion** — longer working session at a time that suits you. No sales deck.
3. **Workflow & framework** — a few short rounds mapping your current ops + where software fits.
4. **Proposal & strategic review** — 1-page scope, timeline, price. You push back where it doesn't fit.
5. **Demo** — working prototype on your real data, in weeks not months.
6. **Commercial discussion** — once the demo proves out, full commercial agreed.
7. **Setup & training** — go-live, team trained, real users on the system. We're on WhatsApp throughout.
8. **Done — and still here** — support continues. We don't disappear after handover.

**Speaker note:** Step 8 is the differentiator. Lead with it: "We don't ghost you after launch."

---

## Slide 13 — Data + trust

**Title:** Your data stays yours
**Bullets:**
- Hosted in Malaysia wherever possible (Supabase + Vercel)
- **PDPA-aware** — patient data export available any time, schema visible on request
- We don't train external AI models on your operational data
- Owner can download a full CSV backup any day. Daily auto-email backup if you want it.
- Sterilization log, X-rays, treatment records — **stay in your EMR**, not in our system

**Footer:** Kanan Digital Enterprise (SSM Enterprise registration in progress) · KL, Malaysia
**Speaker note:** Address the "but my patient data" objection head-on. The boundary line (what's NOT in our system) is reassuring, not a weakness.

---

## Slide 14 — Try it / Get in touch

**Title:** Try the demos. We'll get you set up in 4 weeks.
**Two demo cards (large):**
- 🟢 **Standard demo** — standard-demo.kanan.my
- 🟡 **Premium demo** — premium-demo.kanan.my
**Contact block:**
- 💬 **WhatsApp** — +60 12-347 8126
- ✉ **Email** — hello@kanan.my
- 🌐 **Web** — kanan.my

**Speaker note:** Don't ask for the sale on this slide. Ask if they have 30 seconds to try the demo on their phone right now.

---

## Production notes (for whoever runs build_kanan_sales_deck.py)

- All prices are **indicative** — confirm before any prospect-facing version
- All seat caps confirmed: Standard 1+2D+3N · Premium 1+4D+6N
- Founder names + roles still placeholder — fill before sending
- Screenshots are placeholders — capture from `standard-demo.kanan.my` and `premium-demo.kanan.my` once those exist
- Logo: `kanan_logo_dark.png` for the cover (on warm-white), `kanan_logo_light.png` for body slides
- WhatsApp number is set: `+6012-347 8126` → `wa.me/60123478126`
