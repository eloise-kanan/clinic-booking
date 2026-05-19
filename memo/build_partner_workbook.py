"""Generate the partner-discussion workbook.

Output: memo/Partner_Discussion_Worksheet.xlsx

Sheets:
  1. Overview       — landing tab with instructions and table of contents
  2. Checklist      — exhaustive list of items to settle with the partner
  3. Cost Inputs    — every cost line item, editable
  4. Tier Pricing   — tier mix and revenue per clinic
  5. Projection     — monthly model for 36 months; plug in clinic acquisitions
  6. Profit Split   — partner share scenarios driven by Projection
"""

from pathlib import Path
import xlsxwriter

OUT = Path(__file__).resolve().parent / "Partner_Discussion_Worksheet.xlsx"

# ---------- Brand palette ----------
BRAND = "#0d9488"
BRAND_DARK = "#0f766e"
BRAND_LIGHT = "#ccfbf1"
PAPER = "#fafaf7"
INK = "#1a1a1a"
MUTED = "#78716c"
PALE = "#f5f4f3"
INPUT_BG = "#fff7ed"     # warm pale for editable cells
INPUT_BORDER = "#fb923c"
GREEN = "#059669"
RED = "#c0392b"
AMBER = "#b45309"

wb = xlsxwriter.Workbook(str(OUT))

# ---------- Reusable formats ----------
title_fmt = wb.add_format({
    "bold": True, "font_size": 22, "font_color": INK,
    "valign": "vcenter", "font_name": "Helvetica",
})
subtitle_fmt = wb.add_format({
    "italic": True, "font_size": 12, "font_color": MUTED,
    "valign": "vcenter", "font_name": "Helvetica",
})
section_fmt = wb.add_format({
    "bold": True, "font_size": 13, "font_color": "white",
    "bg_color": BRAND_DARK, "align": "left", "valign": "vcenter",
    "border": 0, "font_name": "Helvetica",
})
subsection_fmt = wb.add_format({
    "bold": True, "font_size": 11, "font_color": BRAND_DARK,
    "bg_color": BRAND_LIGHT, "align": "left", "valign": "vcenter",
    "border": 0, "font_name": "Helvetica",
})
header_fmt = wb.add_format({
    "bold": True, "font_size": 10, "font_color": "white",
    "bg_color": BRAND, "align": "center", "valign": "vcenter",
    "border": 1, "border_color": "white", "font_name": "Helvetica",
})
body_fmt = wb.add_format({
    "font_size": 10, "font_color": INK,
    "valign": "top", "text_wrap": True, "font_name": "Helvetica",
    "border": 1, "border_color": "#e7e5e4",
})
body_alt_fmt = wb.add_format({
    "font_size": 10, "font_color": INK,
    "valign": "top", "text_wrap": True, "font_name": "Helvetica",
    "border": 1, "border_color": "#e7e5e4", "bg_color": PALE,
})
muted_fmt = wb.add_format({
    "font_size": 9, "font_color": MUTED, "italic": True,
    "valign": "top", "text_wrap": True, "font_name": "Helvetica",
})
note_fmt = wb.add_format({
    "font_size": 10, "font_color": MUTED, "italic": True,
    "valign": "top", "text_wrap": True, "font_name": "Helvetica",
})
input_fmt = wb.add_format({
    "font_size": 11, "font_color": INK, "bold": True,
    "bg_color": INPUT_BG, "border": 1, "border_color": INPUT_BORDER,
    "num_format": "#,##0", "align": "right", "font_name": "Helvetica",
})
input_pct_fmt = wb.add_format({
    "font_size": 11, "font_color": INK, "bold": True,
    "bg_color": INPUT_BG, "border": 1, "border_color": INPUT_BORDER,
    "num_format": "0.0%", "align": "right", "font_name": "Helvetica",
})
input_int_fmt = wb.add_format({
    "font_size": 11, "font_color": INK, "bold": True,
    "bg_color": INPUT_BG, "border": 1, "border_color": INPUT_BORDER,
    "num_format": "0", "align": "right", "font_name": "Helvetica",
})
calc_fmt = wb.add_format({
    "font_size": 10, "font_color": INK,
    "bg_color": "white", "border": 1, "border_color": "#e7e5e4",
    "num_format": "#,##0", "align": "right", "font_name": "Helvetica",
})
calc_emphasised_fmt = wb.add_format({
    "font_size": 11, "font_color": BRAND_DARK, "bold": True,
    "bg_color": BRAND_LIGHT, "border": 1, "border_color": BRAND,
    "num_format": "#,##0", "align": "right", "font_name": "Helvetica",
})
profit_pos_fmt = wb.add_format({
    "font_size": 10, "font_color": GREEN, "bold": True,
    "bg_color": "white", "border": 1, "border_color": "#e7e5e4",
    "num_format": "#,##0;-#,##0", "align": "right", "font_name": "Helvetica",
})
profit_neg_fmt = wb.add_format({
    "font_size": 10, "font_color": RED, "bold": True,
    "bg_color": "white", "border": 1, "border_color": "#e7e5e4",
    "num_format": "#,##0;-#,##0", "align": "right", "font_name": "Helvetica",
})
label_fmt = wb.add_format({
    "font_size": 10, "font_color": INK, "bold": True,
    "valign": "vcenter", "font_name": "Helvetica",
})
label_indented_fmt = wb.add_format({
    "font_size": 10, "font_color": INK,
    "valign": "vcenter", "font_name": "Helvetica", "indent": 1,
})
checkbox_fmt = wb.add_format({
    "font_size": 12, "font_color": MUTED,
    "align": "center", "valign": "vcenter", "font_name": "Helvetica",
    "border": 1, "border_color": "#e7e5e4",
})
tab_link_fmt = wb.add_format({
    "font_size": 12, "font_color": BRAND_DARK, "bold": True, "underline": 1,
    "valign": "vcenter", "font_name": "Helvetica",
})


# =============================================================
# SHEET 1: Overview
# =============================================================
o = wb.add_worksheet("Overview")
o.set_tab_color(BRAND)
o.hide_gridlines(2)
o.set_column("A:A", 4)
o.set_column("B:B", 36)
o.set_column("C:C", 80)
o.set_row(1, 38)

o.write("B2", "Partner Discussion Worksheet", title_fmt)
o.write("B3", "Goodcare Dental Booking Platform — May 2026", subtitle_fmt)

o.merge_range("B5:C5", "Welcome", section_fmt)
o.set_row(4, 22)
o.merge_range("B6:C6",
    "This workbook is for you and your business partner to walk through together. It contains everything we still need to "
    "decide before going live with paying customers, plus a fully editable financial model. Yellow-highlighted cells "
    "are editable inputs — change them and the projections update everywhere.",
    note_fmt)
o.set_row(5, 64)

o.merge_range("B8:C8", "Sheets in this workbook", section_fmt)
o.set_row(7, 22)
sheets_info = [
    ("1. Overview",      "This page. Instructions and table of contents."),
    ("2. Checklist",     "Every topic you need to settle with your partner — business formation, roles, equity, legal, ops. ~60 items."),
    ("3. Cost Inputs",   "All cost line items as editable cells. Software subscriptions, device costs, scaling tools."),
    ("4. Tier Pricing",  "Tier prices, mix percentages, weighted-average revenue per clinic. Editable."),
    ("5. Projection",    "36-month financial model. Plug in clinic acquisitions per month → see revenue, costs, profit, cash balance."),
    ("6. Profit Split",  "Partner share scenarios driven by the projection. Adjust splits to model take-home per partner."),
]
for i, (tab, desc) in enumerate(sheets_info):
    row = 8 + i
    o.write(row, 1, tab, label_fmt)
    o.write(row, 2, desc, note_fmt)
    o.set_row(row, 22)

o.merge_range("B16:C16", "How to use this workbook", section_fmt)
o.set_row(15, 22)
how_to = [
    "1. Read through the Checklist together; tick what you've already agreed.",
    "2. On Cost Inputs, adjust any cost line that doesn't match your current contracts.",
    "3. On Tier Pricing, agree on tier prices and the expected customer mix.",
    "4. On Projection, plug in realistic new-clinic counts per month for the next 12-36 months.",
    "5. On Profit Split, adjust each partner's share to model take-home.",
    "6. Re-read Checklist and circle items that block go-live.",
]
for i, line in enumerate(how_to):
    o.merge_range(16 + i, 1, 16 + i, 2, line, note_fmt)
    o.set_row(16 + i, 20)

o.merge_range("B24:C24", "Yellow cells = editable inputs", section_fmt)
o.set_row(23, 22)
o.merge_range("B25:C25",
    "Throughout this workbook, any cell with a warm yellow background is an editable input. Change those — formulas "
    "everywhere else recalculate automatically. White cells are calculated; do not type into them.",
    note_fmt)
o.set_row(24, 48)


# =============================================================
# SHEET 2: Checklist
# =============================================================
c = wb.add_worksheet("Checklist")
c.set_tab_color(BRAND_DARK)
c.hide_gridlines(2)
c.set_column("A:A", 4)
c.set_column("B:B", 6)     # checkbox
c.set_column("C:C", 50)    # item
c.set_column("D:D", 70)    # notes / owner

c.merge_range("B2:D2", "Checklist — what you and your partner must settle", title_fmt)
c.set_row(1, 32)
c.merge_range("B3:D3",
    "Tick (insert ✓ in column B) as you agree on each item. Use column D for notes, decisions, or who's responsible. "
    "Everything here should be settled before signing your first paid contract.",
    subtitle_fmt)
c.set_row(2, 44)

checklist = [
    # (section_title, [(item, suggested_note)])
    ("A · Business formation", [
        ("Entity type — Sole Prop, Partnership, LLP, or Sdn Bhd?", "Sdn Bhd recommended for liability separation and tax flexibility"),
        ("SSM business registration", "RM 1,500 once. Required before invoicing."),
        ("Business name reservation", "Brand name + .com.my domain availability check"),
        ("Memorandum and Articles of Association", "For Sdn Bhd. Engage company secretary."),
        ("Shareholders agreement (separate from M&A)", "Covers what M&A doesn't — vesting, drag-along, etc."),
        ("Company secretary appointment", "RM ~1,200/year. Required for Sdn Bhd."),
        ("Company bank account (joint or single signatory?)", "CIMB, Maybank, Public Bank all offer SME accounts"),
        ("Initial capital injection — how much, from whom?", "Recommend RM 10,000–20,000 starting capital"),
        ("Capital structure — ordinary vs preference shares", "Default: all ordinary for 2-person founder team"),
        ("Tax filing arrangement (LHDN)", "Engage an accountant; ~RM 200–500/month"),
    ]),
    ("B · Roles & responsibilities", [
        ("Who handles product and engineering?", "Currently you. Will it stay that way at clinic #20?"),
        ("Who handles sales and customer pitching?", "Field-time intensive. Decide who fields the calls."),
        ("Who handles customer support and onboarding?", "Initially shared; will need ownership at clinic #10"),
        ("Who handles operations (devices, deliveries, training)?", "Especially relevant given hardware bundle"),
        ("Who handles legal, compliance, and finance?", "DPA, ToS, PDPA, insurance renewals, LHDN"),
        ("Time commitment per partner (full-time vs part-time)?", "Affects equity logic"),
        ("Salary payable, or pure equity until profitable?", "Most founders go pure equity until profit allows draws"),
        ("Decision-making process — who has final say on what?", "Product, pricing, hiring, big spends each need an owner"),
        ("Weekly working rhythm (sync calls, shared dashboards)?", "Suggest weekly 1-hour partner sync"),
    ]),
    ("C · Equity & profit sharing", [
        ("Equity split percentage between partners", "50/50 is simplest. Skewed splits should be justified by contribution."),
        ("Vesting schedule (cliff + linear)?", "Standard: 1-year cliff, 4-year vest. Protects against early exit."),
        ("Dilution policy if future investors / employees join", "ESOP pool typically 10–15%"),
        ("Voting rights (per-share, or special control?)", "1 share = 1 vote standard"),
        ("Drag-along and tag-along rights", "Useful if either party may want to sell stake"),
        ("Profit distribution frequency (monthly, quarterly, annual)?", "Monthly works for small founder team; quarterly for tax"),
        ("Profit distribution policy (% retained vs paid out)?", "Recommend retain 30–50% for growth"),
        ("Reserve fund policy (months of runway to keep on hand)", "6 months of fixed costs minimum"),
        ("Buyout / shotgun clause if partnership fails", "Pre-agree the formula"),
        ("Death / disability provisions", "Insurance policy or company-paid buyout"),
    ]),
    ("D · Pricing & product strategy", [
        ("Final pricing tiers — Basic / Standard / Pro / Franchise?", "See Tier Pricing sheet for current numbers"),
        ("Setup fee level (RM 1,500 / RM 2,500 / variable)?", "Modular: RM 1,500. Bundled: RM 2,500–3,500."),
        ("Hardware bundle policy — required, optional, or no?", "Recommend: optional (offer all 4 pricing options)"),
        ("Discount / friend rate policy", "Document who gets discounts and by how much"),
        ("Free trial duration (30 / 60 / 90 days)?", "60-day money-back guarantee on setup recommended"),
        ("Feature roadmap priorities for next 6 months", "See strategic memo: compliance, recall, commission"),
        ("Multi-tenant refactor trigger point", "Recommend: at clinic #4"),
        ("Domain handling — subdomain by default or custom?", "Subdomain default; custom for RM 100 one-off"),
    ]),
    ("E · Operations", [
        ("Customer support hours (e.g. Mon–Fri 9–6)", "Define SLA expectations"),
        ("Response time SLA (e.g. 24h email, 4h critical)?", "Set realistic numbers"),
        ("Onboarding process (steps + who does what)", "Should be documented as a runbook"),
        ("Device sourcing arrangement with partner", "Volume discount? Quarterly orders? Buffer stock?"),
        ("Damage / replacement policy for devices", "Excess paid by customer; reserve covers rest"),
        ("Backup and disaster recovery procedures", "Supabase PITR + monthly CSV exports off-site"),
        ("Hosting decisions — region, redundancy", "Supabase Singapore region; defensible under PDPA"),
        ("Customer data export commitment (right to portability)", "CSV export self-serve or staff-assisted?"),
    ]),
    ("F · Legal & compliance", [
        ("Data Processing Agreement (DPA) template", "Engage MY lawyer; RM 2,000–3,000 one-off"),
        ("Terms of Service drafted", "Often paired with DPA work"),
        ("Privacy Policy", "PDPA-compliant; required on /book page footer"),
        ("PDPA consent register implementation", "Audit trail for marketing communications"),
        ("Professional indemnity insurance", "RM 1,500–3,000/year — required for healthcare-adjacent software"),
        ("IP ownership clause — who owns the code?", "Recommend: company owns; founders licence indefinitely"),
        ("Non-compete / non-solicit between partners", "Standard 1–2 year clause"),
        ("Customer contract templates ready", "Service agreement per tier; subscription terms"),
        ("Data breach response plan", "Required under PDPA"),
    ]),
    ("G · Sales & marketing", [
        ("Target customer segment (size, geography)", "Recommend: 1–5 doctor MY dental clinics, year 1"),
        ("Lead generation channels", "Referral, FB ads, direct outreach, dental association events"),
        ("Sales process (intro → demo → trial → close)", "Document and refine"),
        ("Pricing presentation — who shows it?", "Sales partner handles pricing; tech partner sits in for trust"),
        ("Marketing budget per month", "Suggest RM 500 starting; scale to RM 2,000 at clinic #20"),
        ("Brand assets — logo, slide template, email signatures", "Centralise in a shared Drive folder"),
        ("Case studies and testimonials process", "Ask the friend clinic for one at month 6"),
        ("Referral / partner rewards", "Existing clinic refers a new one = 1 month free?"),
    ]),
    ("H · Risk & exit", [
        ("Maximum subsidy budget (RM bleed before pulling back)", "Recommend cap at RM 8,000–15,000"),
        ("Pivot / sunset criteria (clinic count by month X)", "If <5 clinics by month 9, reassess approach"),
        ("Insurance coverage (PI, public liability, cyber)", "Underwriters: AIG, Allianz, MSIG"),
        ("Acquisition / sale process if approached", "Both partners must consent"),
        ("Dispute resolution mechanism", "Default to mediation, then arbitration"),
        ("Non-compete period after exit", "12–24 months in MY dental sector"),
        ("Wind-down procedure (data, refunds, communications)", "60-day customer notice; full data export; refund unused months"),
    ]),
]

row = 4
for section_title, items in checklist:
    c.merge_range(row, 1, row, 3, section_title, subsection_fmt)
    c.set_row(row, 24)
    row += 1
    # header
    c.write(row, 1, "✓", header_fmt)
    c.write(row, 2, "Item", header_fmt)
    c.write(row, 3, "Notes / Owner / Decision", header_fmt)
    c.set_row(row, 22)
    row += 1
    for i, (item, note) in enumerate(items):
        fmt = body_fmt if i % 2 == 0 else body_alt_fmt
        c.write(row, 1, "☐", checkbox_fmt)
        c.write(row, 2, item, fmt)
        c.write(row, 3, note, fmt)
        c.set_row(row, 34)
        row += 1
    row += 1  # spacer


# =============================================================
# SHEET 3: Cost Inputs
# =============================================================
ci = wb.add_worksheet("Cost Inputs")
ci.set_tab_color("#fb923c")
ci.hide_gridlines(2)
ci.set_column("A:A", 4)
ci.set_column("B:B", 44)
ci.set_column("C:C", 18)
ci.set_column("D:D", 64)

ci.merge_range("B2:D2", "Cost Inputs — edit yellow cells", title_fmt)
ci.set_row(1, 32)
ci.merge_range("B3:D3",
    "These are the costs WE pay. Yellow cells are editable. Other sheets pull from these — change a number here and the "
    "projection updates everywhere.",
    subtitle_fmt)
ci.set_row(2, 36)

# Section: Core fixed costs
row = 4
ci.merge_range(row, 1, row, 3, "A · Core fixed costs (paid once live)", section_fmt)
ci.set_row(row, 24); row += 1

ci.write(row, 1, "Item", header_fmt)
ci.write(row, 2, "RM / month", header_fmt)
ci.write(row, 3, "Notes", header_fmt)
ci.set_row(row, 22); row += 1

# Editable rows. Track named cells.
core_costs = [
    ("Claude Code subscription", 470, "Developer tooling. Required for maintenance + new features."),
    ("Vercel Pro (team plan)", 95,  "Required for commercial use. Hosts all clinic instances."),
    ("Supabase Pro (1st project)", 120, "Database + auth. PITR backups, 30-day retention."),
    ("Domain (.com, amortised RM 50/year)", 4, "Primary domain for subdomains"),
    ("Google Workspace (business email)", 33, "name@yourbrand.com for credibility"),
    ("Legal & insurance amortised (one-time RM 5k + RM 1.5–3k/yr)", 250, "Includes DPA + ToS + PI insurance"),
]
ci.cost_refs = {}
for label, val, note in core_costs:
    ci.write(row, 1, label, label_fmt)
    ci.write_number(row, 2, val, input_fmt)
    ci.write(row, 3, note, note_fmt)
    ci.set_row(row, 24)
    ci.cost_refs[label] = f"'Cost Inputs'!$C${row + 1}"
    row += 1

# Subtotal
ci.write(row, 1, "Fixed monthly subtotal", label_fmt)
ci.write_formula(row, 2,
                 f"=SUM(C{row - len(core_costs) + 1}:C{row})",
                 calc_emphasised_fmt)
ci.write(row, 3, "Sum of A. Once a paying clinic goes live, this is your minimum.", note_fmt)
ci.set_row(row, 24)
ci.fixed_subtotal_ref = f"'Cost Inputs'!$C${row + 1}"
row += 2

# Section: Scaling tools
ci.merge_range(row, 1, row, 3, "B · Scaling tools (added at clinic-count milestones)", section_fmt)
ci.set_row(row, 24); row += 1

ci.write(row, 1, "Item", header_fmt)
ci.write(row, 2, "RM / month", header_fmt)
ci.write(row, 3, "When to add", header_fmt)
ci.set_row(row, 22); row += 1

scaling_costs = [
    ("Sentry (error tracking)", 120, "Add when clinic count >= 10"),
    ("Customer support tool (Freshdesk / Intercom)", 350, "Add when clinic count >= 20"),
    ("Product analytics (PostHog / Mixpanel)", 250, "Add when clinic count >= 30"),
    ("Freelance dev support (~10 hrs/month)", 1000, "Add when clinic count >= 20"),
    ("Email service (Resend / SendGrid)", 95, "Add when email reminders launch"),
    ("Marketing budget (Google Ads, FB Ads)", 1000, "Add when actively scaling"),
]
scaling_thresholds = [10, 20, 30, 20, 999, 999]   # 999 means "never auto-trigger; toggle manually"
ci.scaling_refs = []
for (label, val, when), thr in zip(scaling_costs, scaling_thresholds):
    ci.write(row, 1, label, label_fmt)
    ci.write_number(row, 2, val, input_fmt)
    ci.write(row, 3, when, note_fmt)
    ci.set_row(row, 22)
    ci.scaling_refs.append((thr, f"'Cost Inputs'!$C${row + 1}"))
    row += 1
row += 1

# Section: Per-clinic variable costs
ci.merge_range(row, 1, row, 3, "C · Per-clinic variable costs", section_fmt)
ci.set_row(row, 24); row += 1

ci.write(row, 1, "Item", header_fmt)
ci.write(row, 2, "RM / clinic / mo", header_fmt)
ci.write(row, 3, "Notes", header_fmt)
ci.set_row(row, 22); row += 1

# Single-tenant (until refactor)
ci.write(row, 1, "Supabase per clinic (single-tenant, before refactor)", label_fmt)
ci.write_number(row, 2, 120, input_fmt)
ci.write(row, 3, "Each clinic owns its own Supabase project. Multiplied by clinic count BELOW refactor threshold.", note_fmt)
ci.single_tenant_cost_ref = f"'Cost Inputs'!$C${row + 1}"
ci.set_row(row, 28); row += 1

ci.write(row, 1, "Supabase incremental per clinic (multi-tenant, after refactor)", label_fmt)
ci.write_number(row, 2, 10, input_fmt)
ci.write(row, 3, "Shared DB. Per-clinic resource consumption.", note_fmt)
ci.multi_tenant_cost_ref = f"'Cost Inputs'!$C${row + 1}"
ci.set_row(row, 24); row += 1

ci.write(row, 1, "Multi-tenant refactor — clinic count when triggered", label_fmt)
ci.write_number(row, 2, 4, input_int_fmt)
ci.write(row, 3, "At this clinic count, switch from single-tenant per-clinic Supabase cost to multi-tenant incremental.", note_fmt)
ci.refactor_threshold_ref = f"'Cost Inputs'!$C${row + 1}"
ci.set_row(row, 28); row += 1
row += 1

# Section: Device costs
ci.merge_range(row, 1, row, 3, "D · Hardware (optional bundle)", section_fmt)
ci.set_row(row, 24); row += 1

ci.write(row, 1, "Item", header_fmt)
ci.write(row, 2, "RM", header_fmt)
ci.write(row, 3, "Notes", header_fmt)
ci.set_row(row, 22); row += 1

device_inputs = [
    ("Basic device (Android tablet) — total cost incl. accessories", 1300, "Lenovo Tab M10 or similar"),
    ("Standard device (iPad 10.9\") — total cost incl. accessories", 2500, "Recommended default"),
    ("Premium device (iPad Pro 11\") — total cost incl. accessories", 4800, "For Pro / Franchise upsell"),
    ("Device contract length (months)", 36, "Standard 3-year hardware lease"),
    ("Device insurance (RM / month / device)", 30, "Damage, theft, accidental drops"),
    ("Replacement reserve (RM / month / device)", 18, "~8% of device cost annually"),
    ("Delivery + setup logistics (RM / month / device amortised)", 2, "First-year delivery + on-site install"),
]
ci.device_refs = {}
for label, val, note in device_inputs:
    ci.write(row, 1, label, label_fmt)
    ci.write_number(row, 2, val, input_int_fmt if "months" in label else input_fmt)
    ci.write(row, 3, note, note_fmt)
    ci.set_row(row, 24)
    ci.device_refs[label] = f"'Cost Inputs'!$C${row + 1}"
    row += 1

# Effective monthly cost calc for Standard device
row += 1
ci.write(row, 1, "Standard device — effective monthly cost (amortised + insurance + reserve)", label_fmt)
std_device_key = 'Standard device (iPad 10.9") — total cost incl. accessories'
contract_key = "Device contract length (months)"
insurance_key = "Device insurance (RM / month / device)"
reserve_key = "Replacement reserve (RM / month / device)"
delivery_key = "Delivery + setup logistics (RM / month / device amortised)"
std_dev = ci.device_refs[std_device_key]
contract_months = ci.device_refs[contract_key]
insurance = ci.device_refs[insurance_key]
reserve = ci.device_refs[reserve_key]
delivery = ci.device_refs[delivery_key]
ci.write_formula(row, 2,
                 f"=ROUND({std_dev}/{contract_months}+{insurance}+{reserve}+{delivery},0)",
                 calc_emphasised_fmt)
ci.write(row, 3, "Used in Projection for hardware-bundled scenarios.", note_fmt)
ci.standard_device_monthly_ref = f"'Cost Inputs'!$C${row + 1}"
ci.set_row(row, 28); row += 2

# Section: Setup fees
ci.merge_range(row, 1, row, 3, "E · Setup fees and one-offs", section_fmt)
ci.set_row(row, 24); row += 1

ci.write(row, 1, "Item", header_fmt)
ci.write(row, 2, "RM", header_fmt)
ci.write(row, 3, "Notes", header_fmt)
ci.set_row(row, 22); row += 1

setup_inputs = [
    ("Setup fee — software-only / modular", 1500, "Training + onboarding + customisation (no device)"),
    ("Setup fee — bundled with device", 2500, "Setup + device delivery + on-site install"),
]
ci.setup_refs = {}
for label, val, note in setup_inputs:
    ci.write(row, 1, label, label_fmt)
    ci.write_number(row, 2, val, input_fmt)
    ci.write(row, 3, note, note_fmt)
    ci.set_row(row, 24)
    ci.setup_refs[label] = f"'Cost Inputs'!$C${row + 1}"
    row += 1


# =============================================================
# SHEET 4: Tier Pricing
# =============================================================
tp = wb.add_worksheet("Tier Pricing")
tp.set_tab_color("#fb923c")
tp.hide_gridlines(2)
tp.set_column("A:A", 4)
tp.set_column("B:B", 18)
tp.set_column("C:C", 18)
tp.set_column("D:D", 18)
tp.set_column("E:E", 18)
tp.set_column("F:F", 60)

tp.merge_range("B2:F2", "Tier Pricing — edit yellow cells", title_fmt)
tp.set_row(1, 32)
tp.merge_range("B3:F3",
    "Set the price per tier and the expected mix of customers. Weighted-average revenue per clinic is calculated below "
    "and feeds the projection.",
    subtitle_fmt)
tp.set_row(2, 36)

row = 4
tp.merge_range(row, 1, row, 5, "A · Software tiers (monthly price)", section_fmt)
tp.set_row(row, 24); row += 1

tp.write(row, 1, "Tier", header_fmt)
tp.write(row, 2, "Monthly (RM)", header_fmt)
tp.write(row, 3, "Mix %", header_fmt)
tp.write(row, 4, "Weighted RM", header_fmt)
tp.write(row, 5, "Notes", header_fmt)
tp.set_row(row, 22); row += 1

tiers = [
    ("Basic",     80,  0.30, "DoctorPartner sidekick — booking, WhatsApp, attendance, mobile."),
    ("Standard",  150, 0.50, "Adds duty cal, leave/shift requests, audit, working hours, branding."),
    ("Pro",       250, 0.20, "Adds revenue analytics, light payroll, locum, certifications expiry."),
    ("Franchise", 400, 0.00, "Per-branch pricing. Cross-branch dashboard, royalty tracking, transfers."),
]
tp.tier_refs = []
first_tier_row = row + 1
for name, price, mix, desc in tiers:
    tp.write(row, 1, name, label_fmt)
    tp.write_number(row, 2, price, input_fmt)
    tp.write_number(row, 3, mix, input_pct_fmt)
    tp.write_formula(row, 4, f"=C{row+1}*D{row+1}", calc_fmt)
    tp.write(row, 5, desc, note_fmt)
    tp.set_row(row, 24)
    tp.tier_refs.append((f"'Tier Pricing'!$C${row+1}", f"'Tier Pricing'!$D${row+1}"))
    row += 1

# Mix total check
tp.write(row, 1, "Mix total", label_fmt)
tp.write_formula(row, 3, f"=SUM(D{first_tier_row}:D{row})", calc_fmt)
tp.write(row, 5, "Should equal 100%. If not, the projection will normalise.", muted_fmt)
tp.set_row(row, 22); row += 1

# Weighted average software revenue per clinic
tp.write(row, 1, "Weighted avg software revenue per clinic (RM / month)", label_fmt)
tp.write_formula(row, 4,
                 f"=SUMPRODUCT(C{first_tier_row}:C{row-1},D{first_tier_row}:D{row-1})/MAX(SUM(D{first_tier_row}:D{row-1}),0.0001)",
                 calc_emphasised_fmt)
tp.set_row(row, 24)
tp.avg_software_ref = f"'Tier Pricing'!$E${row + 1}"
row += 2

# Hardware mix
tp.merge_range(row, 1, row, 5, "B · Customer mix across pricing options", section_fmt)
tp.set_row(row, 24); row += 1

tp.write(row, 1, "Option", header_fmt)
tp.write(row, 2, "Description", header_fmt)
tp.write(row, 3, "% of clinics", header_fmt)
tp.write(row, 4, "Per clinic adj (RM/mo)", header_fmt)
tp.write(row, 5, "Notes", header_fmt)
tp.set_row(row, 22); row += 1

options = [
    ("Option A · Bundled",      "All-in monthly fee",                 0.15, 25,  "Premium on top of software. Includes device."),
    ("Option C · Modular",      "Software + separate hardware lease", 0.40, 0,   "Hardware billed at effective monthly cost."),
    ("Option B · Setup-loaded", "Big setup fee, lower monthly",       0.05, 0,   "Same monthly as software-only; large upfront."),
    ("Option D · Software-only","No hardware",                        0.40, 0,   "Pure SaaS. No multi-year contract."),
]
tp.option_refs = []
first_opt_row = row + 1
for name, desc, mix, adj, opt_note in options:
    tp.write(row, 1, name, label_fmt)
    tp.write(row, 2, desc, note_fmt)
    tp.write_number(row, 3, mix, input_pct_fmt)
    tp.write_number(row, 4, adj, input_fmt)
    tp.write(row, 5, opt_note, note_fmt)
    tp.set_row(row, 24)
    tp.option_refs.append((name, f"'Tier Pricing'!$D${row+1}", f"'Tier Pricing'!$E${row+1}"))
    row += 1

tp.write(row, 1, "Mix total", label_fmt)
tp.write_formula(row, 3, f"=SUM(D{first_opt_row}:D{row})", calc_fmt)
tp.write(row, 5, "Should equal 100%.", muted_fmt)
tp.set_row(row, 22); row += 1

# Hardware-attached % (Options A, B, C all have hardware)
# Build a formula: hardware-attached = A% + B% + C%; software-only = D%
# Use position-based references — A, C, B, D in our options list
A_pct = tp.option_refs[0][1]
C_pct = tp.option_refs[1][1]
B_pct = tp.option_refs[2][1]
D_pct = tp.option_refs[3][1]
A_adj = tp.option_refs[0][2]

row += 1
tp.write(row, 1, "Hardware-attached %", label_fmt)
tp.write_formula(row, 3, f"={A_pct}+{C_pct}+{B_pct}", calc_fmt)
tp.write(row, 5, "Share of clinics that have a hardware lease.", muted_fmt)
tp.hardware_share_ref = f"'Tier Pricing'!$D${row + 1}"
tp.set_row(row, 22); row += 1

# Weighted average revenue per clinic
tp.write(row, 1, "Weighted avg total revenue per clinic / month (RM)", label_fmt)
tp.write_formula(row, 4,
                 f"={tp.avg_software_ref}+{tp.hardware_share_ref}*{ci.standard_device_monthly_ref}+{A_pct}*{A_adj}",
                 calc_emphasised_fmt)
tp.write(row, 5, "Software avg + hardware (if attached) + premium (Option A only).", muted_fmt)
tp.avg_revenue_ref = f"'Tier Pricing'!$E${row + 1}"
tp.set_row(row, 28); row += 1


# =============================================================
# SHEET 5: Projection
# =============================================================
proj = wb.add_worksheet("Projection")
proj.set_tab_color(BRAND)
proj.hide_gridlines(2)
proj.set_column("A:A", 4)
proj.set_column("B:B", 9)        # month #
proj.set_column("C:C", 14)       # new clinics (input)
proj.set_column("D:D", 14)       # cumulative
proj.set_column("E:E", 14)       # setup fee revenue
proj.set_column("F:F", 14)       # subscription revenue
proj.set_column("G:G", 14)       # total revenue
proj.set_column("H:H", 14)       # fixed cost
proj.set_column("I:I", 14)       # variable cost
proj.set_column("J:J", 14)       # total cost
proj.set_column("K:K", 14)       # net profit
proj.set_column("L:L", 14)       # cumulative cash

proj.merge_range("B2:L2", "36-Month Financial Projection", title_fmt)
proj.set_row(1, 32)
proj.merge_range("B3:L3",
    "Enter your projected new clinic acquisitions in column C (yellow). Everything else calculates. Negative cumulative cash "
    "means subsidising from savings; positive means profitable cumulative.",
    subtitle_fmt)
proj.set_row(2, 36)

# Column headers
row = 5
proj.write(row, 1, "Month", header_fmt)
proj.write(row, 2, "New clinics", header_fmt)
proj.write(row, 3, "Total clinics", header_fmt)
proj.write(row, 4, "Setup fees (RM)", header_fmt)
proj.write(row, 5, "Subscription (RM)", header_fmt)
proj.write(row, 6, "Revenue total (RM)", header_fmt)
proj.write(row, 7, "Fixed cost (RM)", header_fmt)
proj.write(row, 8, "Variable cost (RM)", header_fmt)
proj.write(row, 9, "Cost total (RM)", header_fmt)
proj.write(row, 10, "Net profit (RM)", header_fmt)
proj.write(row, 11, "Cum. cash (RM)", header_fmt)
proj.set_row(row, 30)
row += 1
first_month_row = row + 1

# Default seeded values for the 36 months (you'd edit these)
default_acquisitions = [
    1, 0, 0, 1, 1, 0,        # months 1-6
    1, 1, 1, 2, 2, 2,        # months 7-12
    2, 2, 3, 3, 3, 3,        # 13-18
    3, 4, 4, 4, 4, 4,        # 19-24
    5, 5, 5, 5, 5, 5,        # 25-30
    6, 6, 6, 6, 6, 6,        # 31-36
]

for m in range(36):
    excel_row = row + m + 1  # 1-indexed in Excel formulas

    proj.write(row + m, 1, m + 1, calc_fmt)
    proj.write_number(row + m, 2, default_acquisitions[m], input_int_fmt)
    if m == 0:
        proj.write_formula(row + m, 3, f"=C{excel_row}", calc_fmt)
    else:
        proj.write_formula(row + m, 3, f"=D{excel_row-1}+C{excel_row}", calc_fmt)

    # Setup fee revenue = new clinics * average setup fee
    # Use modular setup fee as the default
    setup_fee_ref = ci.setup_refs["Setup fee — software-only / modular"]
    proj.write_formula(row + m, 4, f"=C{excel_row}*{setup_fee_ref}", calc_fmt)

    # Subscription = cumulative clinics * avg revenue
    proj.write_formula(row + m, 5, f"=D{excel_row}*{tp.avg_revenue_ref}", calc_fmt)

    # Total revenue
    proj.write_formula(row + m, 6, f"=E{excel_row}+F{excel_row}", calc_emphasised_fmt)

    # Fixed costs: base + conditional scaling tools
    scaling_terms = []
    for thr, ref in ci.scaling_refs:
        if thr < 999:
            scaling_terms.append(f"IF(D{excel_row}>={thr},{ref},0)")
        else:
            scaling_terms.append("0")  # manual-toggle items default off
    scaling_formula = "+".join(scaling_terms) if scaling_terms else "0"
    proj.write_formula(row + m, 7,
                       f"={ci.fixed_subtotal_ref}+{scaling_formula}",
                       calc_fmt)

    # Variable costs: per-clinic.
    # If cum clinics <= refactor threshold, use single-tenant cost per clinic.
    # Otherwise, refactor cost is paid for the cohort and ongoing is multi-tenant.
    # Also include hardware true cost: hardware-attached share * cumulative * standard device monthly cost
    proj.write_formula(row + m, 8,
                       f"=IF(D{excel_row}<={ci.refactor_threshold_ref},"
                       f"D{excel_row}*{ci.single_tenant_cost_ref},"
                       f"D{excel_row}*{ci.multi_tenant_cost_ref})"
                       f"+D{excel_row}*{tp.hardware_share_ref}*{ci.standard_device_monthly_ref}",
                       calc_fmt)

    # Total cost
    proj.write_formula(row + m, 9, f"=H{excel_row}+I{excel_row}", calc_fmt)

    # Net profit
    proj.write_formula(row + m, 10, f"=G{excel_row}-J{excel_row}",
                       profit_pos_fmt)
    # Apply conditional formatting (red if negative)
    proj.conditional_format(row + m, 10, row + m, 10, {
        "type": "cell", "criteria": "<", "value": 0,
        "format": profit_neg_fmt,
    })

    # Cumulative cash
    if m == 0:
        proj.write_formula(row + m, 11, f"=K{excel_row}", profit_pos_fmt)
    else:
        proj.write_formula(row + m, 11, f"=L{excel_row-1}+K{excel_row}",
                           profit_pos_fmt)
    proj.conditional_format(row + m, 11, row + m, 11, {
        "type": "cell", "criteria": "<", "value": 0,
        "format": profit_neg_fmt,
    })

    proj.set_row(row + m, 20)

# 36-month totals row
total_row = row + 36
proj.write(total_row, 1, "36-mo total", label_fmt)
proj.write_formula(total_row, 2, f"=SUM(C{first_month_row}:C{first_month_row+35})", calc_emphasised_fmt)
proj.write(total_row, 3, "", calc_fmt)  # no cumulative sum
proj.write_formula(total_row, 4, f"=SUM(E{first_month_row}:E{first_month_row+35})", calc_emphasised_fmt)
proj.write_formula(total_row, 5, f"=SUM(F{first_month_row}:F{first_month_row+35})", calc_emphasised_fmt)
proj.write_formula(total_row, 6, f"=SUM(G{first_month_row}:G{first_month_row+35})", calc_emphasised_fmt)
proj.write_formula(total_row, 7, f"=SUM(H{first_month_row}:H{first_month_row+35})", calc_emphasised_fmt)
proj.write_formula(total_row, 8, f"=SUM(I{first_month_row}:I{first_month_row+35})", calc_emphasised_fmt)
proj.write_formula(total_row, 9, f"=SUM(J{first_month_row}:J{first_month_row+35})", calc_emphasised_fmt)
proj.write_formula(total_row, 10, f"=SUM(K{first_month_row}:K{first_month_row+35})", calc_emphasised_fmt)
proj.write_formula(total_row, 11, f"=L{first_month_row+35}", calc_emphasised_fmt)
proj.set_row(total_row, 28)

# Save references for Profit Split sheet
proj.first_month_row = first_month_row
proj.last_month_row = first_month_row + 35
proj.total_row = total_row + 1   # 1-indexed
proj.net_profit_col = "K"
proj.cum_cash_col = "L"


# =============================================================
# SHEET 6: Profit Split
# =============================================================
ps = wb.add_worksheet("Profit Split")
ps.set_tab_color(BRAND)
ps.hide_gridlines(2)
ps.set_column("A:A", 4)
ps.set_column("B:B", 22)
ps.set_column("C:C", 16)
ps.set_column("D:D", 16)
ps.set_column("E:E", 16)
ps.set_column("F:F", 50)

ps.merge_range("B2:F2", "Profit Split Scenarios", title_fmt)
ps.set_row(1, 32)
ps.merge_range("B3:F3",
    "Set each partner's percentage share. Profit from the Projection is allocated each month according to these splits. "
    "Negative profit (loss) is also shared — meaning each partner contributes that share of the subsidy.",
    subtitle_fmt)
ps.set_row(2, 36)

row = 4
ps.merge_range(row, 1, row, 5, "A · Equity split between partners", section_fmt)
ps.set_row(row, 24); row += 1

ps.write(row, 1, "Partner", header_fmt)
ps.write(row, 2, "Equity %", header_fmt)
ps.write(row, 3, "Role", header_fmt)
ps.write(row, 5, "Notes", header_fmt)
ps.set_row(row, 22); row += 1

partner_names = ["Partner A (you)", "Partner B"]
default_splits = [0.50, 0.50]
default_roles = ["Tech + product", "Sales + hardware + ops"]

partner_refs = []
for i, (name, share, role) in enumerate(zip(partner_names, default_splits, default_roles)):
    ps.write(row, 1, name, label_fmt)
    ps.write_number(row, 2, share, input_pct_fmt)
    ps.write(row, 3, role, body_fmt)
    ps.write(row, 5, "Adjust % if non-50/50 split agreed", note_fmt)
    ps.set_row(row, 24)
    partner_refs.append(f"'Profit Split'!$C${row + 1}")
    row += 1

ps.write(row, 1, "Total", label_fmt)
ps.write_formula(row, 2, f"=SUM(C{row-1}:C{row})", calc_emphasised_fmt)
ps.write(row, 5, "Must equal 100%.", muted_fmt)
ps.set_row(row, 22); row += 2

# Annual / 36-month totals per partner
ps.merge_range(row, 1, row, 5, "B · Take-home per partner (from Projection sheet)", section_fmt)
ps.set_row(row, 24); row += 1

ps.write(row, 1, "Period", header_fmt)
ps.write(row, 2, "Net profit (RM)", header_fmt)
ps.write(row, 3, partner_names[0], header_fmt)
ps.write(row, 4, partner_names[1], header_fmt)
ps.write(row, 5, "Notes", header_fmt)
ps.set_row(row, 22); row += 1

# Year 1 (months 1-12)
y1_start = proj.first_month_row
y1_end = proj.first_month_row + 11
y2_start = proj.first_month_row + 12
y2_end = proj.first_month_row + 23
y3_start = proj.first_month_row + 24
y3_end = proj.first_month_row + 35
total_start = proj.first_month_row
total_end = proj.first_month_row + 35

periods = [
    ("Year 1 (months 1–12)",  y1_start, y1_end,  "First full year of operation"),
    ("Year 2 (months 13–24)", y2_start, y2_end,  ""),
    ("Year 3 (months 25–36)", y3_start, y3_end,  ""),
    ("36-month total",        total_start, total_end, "Total 3-year take-home per partner"),
]
for label, s, e, note in periods:
    ps.write(row, 1, label, label_fmt)
    profit_formula = f"=SUM('Projection'!{proj.net_profit_col}{s}:{proj.net_profit_col}{e})"
    ps.write_formula(row, 2, profit_formula, calc_emphasised_fmt)
    ps.write_formula(row, 3, f"=C{row+1}*{partner_refs[0]}", calc_emphasised_fmt)
    ps.write_formula(row, 4, f"=C{row+1}*{partner_refs[1]}", calc_emphasised_fmt)
    # red format if negative
    ps.conditional_format(row, 2, row, 4, {
        "type": "cell", "criteria": "<", "value": 0,
        "format": profit_neg_fmt,
    })
    ps.write(row, 5, note, note_fmt)
    ps.set_row(row, 26)
    row += 1

# Break-even insight
row += 1
ps.merge_range(row, 1, row, 5, "C · Subsidy budget tracking", section_fmt)
ps.set_row(row, 24); row += 1

ps.write(row, 1, "Subsidy cap (RM) — each partner agreed loss limit", label_fmt)
ps.write_number(row, 2, 8000, input_fmt)
ps.write(row, 5, "If cumulative cash drops below -2× this, reassess.", note_fmt)
subsidy_cap_ref = f"'Profit Split'!$C${row + 1}"
ps.set_row(row, 24); row += 1

ps.write(row, 1, "Worst cumulative cash position (RM)", label_fmt)
ps.write_formula(row, 2,
                 f"=MIN('Projection'!{proj.cum_cash_col}{first_month_row+1}:"
                 f"{proj.cum_cash_col}{proj.last_month_row+1})",
                 calc_emphasised_fmt)
ps.write(row, 5, "The biggest hole you'll be in. Should be smaller than -2× subsidy cap.", note_fmt)
ps.set_row(row, 28); row += 1

ps.write(row, 1, "Worst position vs cap", label_fmt)
ps.write_formula(row, 2,
                 f"=IF(B{row}<-2*{subsidy_cap_ref},\"OVER BUDGET\",\"OK\")",
                 calc_emphasised_fmt)
ps.set_row(row, 26); row += 1


wb.close()
print(f"Wrote {OUT}")
