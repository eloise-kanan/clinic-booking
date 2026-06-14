"""Generate mock screenshots for the Kanan clinic-booking sales decks.

Produces PNGs in ./demo/sales-deck/screenshots/ — designed to look like
real screen captures with realistic Malaysian dental clinic sample data.

These are mocks, not real screen captures. They reflect the app's actual
UI structure + the new tier system (1+2D+3N standard / 1+4D+6N premium).

Run:  python3 demo/sales-deck/build_mock_screenshots.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from sample_data import (
    CLINIC_NAME, OWNER, NURSES, DOCTORS,
    PENDING_BOOKINGS, TOMORROW_BOOKINGS, RECALL_DUE,
    DOCTOR_PERF, NURSE_PERF, OVERVIEW_STATS, AUDIT_LOG, TEMPLATES,
)

# ─── Brand + sizing ─────────────────────────────────────────────────────
NAVY        = (27, 42, 74)
NAVY_LIGHT  = (46, 67, 116)
GOLD        = (201, 162, 39)
GOLD_LIGHT  = (227, 199, 106)
WARM_WHITE  = (244, 241, 234)
WHITE       = (255, 255, 255)
INK         = (26, 26, 26)
MUTED       = (107, 114, 128)
HAIRLINE    = (231, 229, 228)        # stone-200
PANEL       = (250, 250, 247)        # stone-50
EMERALD     = (5, 150, 105)
EMERALD_BG  = (209, 250, 229)
RED         = (192, 57, 43)
RED_BG      = (254, 226, 226)
AMBER       = (180, 83, 9)
AMBER_BG    = (254, 243, 199)
BLUE        = (29, 78, 216)
BLUE_BG     = (219, 234, 254)

CANVAS_W = 1600
CANVAS_H = 1000

OUT_DIR = Path(__file__).parent / "screenshots"
OUT_DIR.mkdir(exist_ok=True)


# ─── Fonts ───────────────────────────────────────────────────────────────

def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
            if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size, index=1 if bold and p.endswith(".ttc") else 0)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


F_TINY    = font(11)
F_SMALL   = font(13)
F_BODY    = font(15)
F_LABEL   = font(13, bold=True)
F_HEAD    = font(18, bold=True)
F_BIG     = font(28, bold=True)
F_HUGE    = font(36, bold=True)


# ─── Primitives ──────────────────────────────────────────────────────────

def new_canvas(bg=WARM_WHITE):
    return Image.new("RGB", (CANVAS_W, CANVAS_H), bg)


def text(d, xy, s, *, size=F_BODY, fill=INK, anchor=None):
    d.text(xy, s, font=size, fill=fill, anchor=anchor)


def rect(d, xy, *, fill=None, outline=None, w=1, radius=0):
    if radius:
        d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=w)
    else:
        d.rectangle(xy, fill=fill, outline=outline, width=w)


def app_header(img, d, page_label, *, role_label="Owner"):
    """Top sticky bar — white background, hairline border, brand pill."""
    rect(d, [0, 0, CANVAS_W, 56], fill=WHITE)
    rect(d, [0, 55, CANVAS_W, 56], fill=HAIRLINE)
    # Hamburger placeholder
    for i, y in enumerate([22, 28, 34]):
        rect(d, [22, y, 36, y + 2], fill=NAVY)
    text(d, (50, 18), "Clinic Console", size=F_LABEL, fill=NAVY)
    # Role pill
    pill_x = 200
    rect(d, [pill_x, 18, pill_x + 70, 38], fill=AMBER_BG, radius=10)
    text(d, (pill_x + 35, 28), role_label, size=F_TINY, fill=AMBER, anchor="mm")
    # Right side: user name + sign out
    text(d, (CANVAS_W - 130, 28), OWNER["name"], size=F_SMALL, fill=MUTED, anchor="mm")
    text(d, (CANVAS_W - 30, 28), "Sign out", size=F_SMALL, fill=MUTED, anchor="mm")


SIDEBAR_W = 224
SIDEBAR_TOP = 56


def sidebar(img, d, sections, active_href):
    """Sidebar with sectioned accordion. `sections` is list of (title, [(href,label)])."""
    rect(d, [0, SIDEBAR_TOP, SIDEBAR_W, CANVAS_H], fill=WHITE)
    rect(d, [SIDEBAR_W - 1, SIDEBAR_TOP, SIDEBAR_W, CANVAS_H], fill=HAIRLINE)
    y = SIDEBAR_TOP + 20
    for sec_title, items in sections:
        if sec_title:
            text(d, (20, y), sec_title, size=F_SMALL, fill=NAVY)
            y += 22
        for href, label in items:
            is_active = href == active_href
            if is_active:
                rect(d, [0, y - 4, SIDEBAR_W, y + 20], fill=PANEL)
                rect(d, [0, y - 4, 2, y + 20], fill=NAVY)
                text(d, (20, y), label, size=F_SMALL, fill=NAVY)
            else:
                text(d, (20, y), label, size=F_SMALL, fill=MUTED)
            y += 26
        y += 12


def page_title(d, x, y, title, sub=None):
    text(d, (x, y), title, size=F_BIG, fill=NAVY)
    if sub:
        text(d, (x, y + 36), sub, size=F_SMALL, fill=MUTED)


def card(d, x, y, w, h, *, fill=WHITE, border=HAIRLINE):
    rect(d, [x, y, x + w, y + h], fill=fill, outline=border, w=1, radius=10)


def metric_card(d, x, y, w, h, label, value, *, value_color=NAVY):
    card(d, x, y, w, h)
    text(d, (x + 16, y + 14), label.upper(), size=F_TINY, fill=MUTED)
    text(d, (x + 16, y + 36), str(value), size=F_HUGE, fill=value_color)


def table_header(d, x, y, w, h, cols, *, col_widths):
    """Draw a navy header row with column labels."""
    rect(d, [x, y, x + w, y + h], fill=NAVY, radius=4)
    cx = x + 16
    for i, label in enumerate(cols):
        cw = col_widths[i]
        text(d, (cx, y + h // 2), label, size=F_TINY, fill=WARM_WHITE, anchor="lm")
        cx += cw


def table_row(d, x, y, w, h, cells, *, col_widths, row_bg=WHITE, separator=True):
    rect(d, [x, y, x + w, y + h], fill=row_bg)
    if separator:
        rect(d, [x, y + h - 1, x + w, y + h], fill=HAIRLINE)
    cx = x + 16
    for i, (val, color, bold) in enumerate(cells):
        f = F_LABEL if bold else F_SMALL
        text(d, (cx, y + h // 2), str(val), size=f, fill=color, anchor="lm")
        cx += col_widths[i]


def pill(d, x, y, text_s, *, bg, fg):
    w = max(50, len(text_s) * 7)
    rect(d, [x, y, x + w, y + 18], fill=bg, radius=9)
    text(d, (x + w / 2, y + 9), text_s, size=F_TINY, fill=fg, anchor="mm")
    return w


# ─── Sidebar definitions (mirror the actual nav) ─────────────────────────

OWNER_NAV_STANDARD = [
    ("", [("/home", "🏠 Home"), ("/owner", "📊 Overview")]),
    ("BOOKINGS", [
        ("/owner/bookings", "All bookings"),
        ("/staff/new", "New booking"),
        ("/staff/reminders", "Send reminders"),
        ("/staff/recalls", "Send recalls"),
        ("/owner/patients", "Patients"),
        ("/staff/templates", "WhatsApp templates"),
    ]),
    ("CALENDAR", [
        ("/owner/calendar", "Clinical calendar"),
        ("/staff/duty-calendar", "Duty calendar"),
    ]),
    ("STAFF", [
        ("/owner/staff", "Doctors & nurses"),
        ("/owner/working-hours", "Working hours"),
        ("/staff/duty", "Shift changes"),
        ("/staff/leave", "Leave"),
    ]),
    ("SETTINGS", [
        ("/owner/plan", "Plan & tier"),
        ("/owner/backup", "Backup & export"),
    ]),
]

OWNER_NAV_PREMIUM = [
    ("", [("/home", "🏠 Home"), ("/owner", "📊 Overview")]),
    ("BOOKINGS", OWNER_NAV_STANDARD[1][1]),
    ("CALENDAR", [
        ("/owner/calendar", "Clinical calendar"),
        ("/staff/duty-calendar", "Duty calendar"),
        ("/owner/utilization", "Utilization"),
    ]),
    ("STAFF", [
        ("/owner/staff", "Doctors & nurses"),
        ("/owner/working-hours", "Working hours"),
        ("/staff/duty", "Shift changes"),
        ("/staff/leave", "Leave"),
        ("/owner/doctor-performance", "Doctor performance"),
        ("/owner/nurse-performance", "Nurse performance"),
    ]),
    ("SETTINGS", [
        ("/owner/plan", "Plan & tier"),
        ("/owner/audit", "Audit log"),
        ("/owner/backup", "Backup & export"),
    ]),
]


CONTENT_X = SIDEBAR_W + 32
CONTENT_W = CANVAS_W - CONTENT_X - 32


# ─── Mock 1: /book (patient-facing) ──────────────────────────────────────

def mock_book():
    img = new_canvas(PANEL)
    d = ImageDraw.Draw(img)

    # Language toggle (top right)
    tx = CANVAS_W / 2 + 280
    ty = 30
    for i, (lbl, active) in enumerate([("EN", True), ("CH", False), ("BM", False)]):
        x = tx + i * 38
        fill = NAVY if active else WHITE
        fg = WARM_WHITE if active else MUTED
        rect(d, [x, ty, x + 36, ty + 22], fill=fill, outline=HAIRLINE, radius=4)
        text(d, (x + 18, ty + 11), lbl, size=F_TINY, fill=fg, anchor="mm")

    # Centered header
    text(d, (CANVAS_W / 2, 90), CLINIC_NAME, size=F_BIG, fill=NAVY, anchor="mm")
    text(d, (CANVAS_W / 2, 124), "Appointment booking", size=F_SMALL, fill=MUTED, anchor="mm")

    # Form card
    card_x = (CANVAS_W - 540) / 2
    card_y = 160
    card(d, card_x, card_y, 540, 790)

    # Identity section
    text(d, (card_x + 24, card_y + 24), "Full name (as per IC/passport)", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 24, card_y + 48, card_x + 516, card_y + 76], fill=PANEL, outline=HAIRLINE, radius=4)
    text(d, (card_x + 36, card_y + 62), "Tan Wei Ming", size=F_BODY, fill=INK, anchor="lm")

    text(d, (card_x + 24, card_y + 92), "Nationality", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 24, card_y + 116, card_x + 516, card_y + 144], fill=PANEL, outline=HAIRLINE, radius=4)
    text(d, (card_x + 36, card_y + 130), "Malaysia ▾", size=F_BODY, fill=INK, anchor="lm")

    text(d, (card_x + 24, card_y + 160), "IC number", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 24, card_y + 184, card_x + 264, card_y + 212], fill=PANEL, outline=HAIRLINE, radius=4)
    text(d, (card_x + 36, card_y + 198), "920311145421", size=F_BODY, fill=INK, anchor="lm")

    text(d, (card_x + 276, card_y + 160), "WhatsApp number", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 276, card_y + 184, card_x + 516, card_y + 212], fill=PANEL, outline=HAIRLINE, radius=4)
    text(d, (card_x + 312, card_y + 198), "+60  12-234 5678", size=F_BODY, fill=INK, anchor="lm")
    text(d, (card_x + 276, card_y + 220), "Please make sure this is correct — our", size=F_TINY, fill=MUTED)
    text(d, (card_x + 276, card_y + 234), "nurse will contact you on WhatsApp.", size=F_TINY, fill=MUTED)

    # Mode buttons
    text(d, (card_x + 24, card_y + 268), "What would you like to do?", size=F_TINY, fill=NAVY)
    bx = card_x + 24
    for i, (lbl, sub, active) in enumerate([
        ("Booking", "Book a new appointment", True),
        ("Reschedule", "Change existing one", False),
        ("Cancel", "Cancel existing one", False),
    ]):
        bx_i = bx + i * 168
        fill = NAVY if active else WHITE
        border = NAVY if active else HAIRLINE
        fg = WARM_WHITE if active else INK
        sub_fg = WARM_WHITE if active else MUTED
        rect(d, [bx_i, card_y + 290, bx_i + 156, card_y + 348], fill=fill, outline=border, radius=6)
        text(d, (bx_i + 78, card_y + 308), lbl, size=F_LABEL, fill=fg, anchor="mm")
        text(d, (bx_i + 78, card_y + 330), sub, size=F_TINY, fill=sub_fg, anchor="mm")

    # First-time?
    text(d, (card_x + 24, card_y + 376), "First-time patient?", size=F_TINY, fill=NAVY)
    for i, lbl in enumerate(["No", "Yes"]):
        bx_i = card_x + 24 + i * 252
        fill = NAVY if lbl == "No" else WHITE
        fg = WARM_WHITE if lbl == "No" else INK
        rect(d, [bx_i, card_y + 396, bx_i + 240, card_y + 432], fill=fill, outline=NAVY if lbl == "No" else HAIRLINE, radius=4)
        text(d, (bx_i + 120, card_y + 414), lbl, size=F_BODY, fill=fg, anchor="mm")

    # Reason for visit
    text(d, (card_x + 24, card_y + 458), "Reason for visit", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 24, card_y + 482, card_x + 516, card_y + 510], fill=PANEL, outline=HAIRLINE, radius=4)
    text(d, (card_x + 36, card_y + 496), "Normal treatment / scaling (30 min) ▾", size=F_BODY, fill=INK, anchor="lm")

    # Doctor + date
    text(d, (card_x + 24, card_y + 530), "Doctor", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 24, card_y + 554, card_x + 516, card_y + 582], fill=PANEL, outline=HAIRLINE, radius=4)
    text(d, (card_x + 36, card_y + 568), "Dr. Lee Chee Hong ▾", size=F_BODY, fill=INK, anchor="lm")

    # Calendar (mini)
    text(d, (card_x + 24, card_y + 600), "Date", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 24, card_y + 624, card_x + 516, card_y + 740], fill=WHITE, outline=HAIRLINE, radius=6)
    text(d, (card_x + 270, card_y + 638), "‹  June 2026  ›", size=F_SMALL, fill=NAVY, anchor="mm")
    days = ["M", "T", "W", "T", "F", "S", "S"]
    for i, dd in enumerate(days):
        text(d, (card_x + 60 + i * 64, card_y + 660), dd, size=F_TINY, fill=MUTED, anchor="mm")
    nums = list(range(9, 16))
    for i, n in enumerate(nums):
        x = card_x + 60 + i * 64
        is_today = i == 5  # mark 14 as today
        is_selected = i == 6
        if is_selected:
            rect(d, [x - 14, card_y + 678, x + 14, card_y + 706], fill=NAVY, radius=4)
            text(d, (x, card_y + 692), str(n), size=F_SMALL, fill=WARM_WHITE, anchor="mm")
        elif is_today:
            rect(d, [x - 14, card_y + 678, x + 14, card_y + 706], fill=WHITE, outline=GOLD, w=2, radius=4)
            text(d, (x, card_y + 692), str(n), size=F_SMALL, fill=NAVY, anchor="mm")
        else:
            text(d, (x, card_y + 692), str(n), size=F_SMALL, fill=INK, anchor="mm")

    # Submit button
    rect(d, [card_x + 24, card_y + 758, card_x + 516, card_y + 794], fill=NAVY, radius=4)
    text(d, (card_x + 270, card_y + 776), "Submit request", size=F_LABEL, fill=WARM_WHITE, anchor="mm")

    # Powered by Kanan footer
    text(d, (CANVAS_W / 2, card_y + 820), "Powered by Kanan · your trusted right hand",
         size=F_TINY, fill=MUTED, anchor="mm")

    img.save(OUT_DIR / "mock_book.png")
    print(f"✓ {OUT_DIR.name}/mock_book.png")


# ─── Common content layout (with sidebar) ────────────────────────────────

def render_with_sidebar(*, plan, active_href, render_content):
    img = new_canvas(PANEL)
    d = ImageDraw.Draw(img)
    nav = OWNER_NAV_PREMIUM if plan == "premium" else OWNER_NAV_STANDARD
    app_header(img, d, "")
    sidebar(img, d, nav, active_href)
    render_content(img, d)
    return img


# ─── Mock 2: /owner/staff (with seat meter) ──────────────────────────────

def mock_staff(plan):
    cap = (2, 3) if plan == "standard" else (4, 6)
    used_d = 2 if plan == "standard" else 3
    used_n = 3 if plan == "standard" else 5

    def content(img, d):
        page_title(d, CONTENT_X, 84, "Doctors & nurses",
                   "Add or deactivate staff accounts. New users receive credentials by email.")
        # Seat meters
        my = 160
        mw = (CONTENT_W - 16) // 2
        for i, (lbl, used, cap_n) in enumerate([("Doctors", used_d, cap[0]),
                                                 ("Nurses",  used_n, cap[1])]):
            x = CONTENT_X + i * (mw + 16)
            card(d, x, my, mw, 80)
            full = used >= cap_n
            text(d, (x + 16, my + 16), lbl, size=F_LABEL, fill=NAVY)
            color = RED if full else MUTED
            suffix = " · full" if full else ""
            text(d, (x + mw - 16, my + 18), f"{used} / {cap_n}{suffix}",
                 size=F_SMALL, fill=color, anchor="rt")
            # Progress bar
            rect(d, [x + 16, my + 50, x + mw - 16, my + 56], fill=HAIRLINE, radius=3)
            pct = used / cap_n
            rect(d, [x + 16, my + 50, x + 16 + int((mw - 32) * pct), my + 56],
                 fill=RED if full else EMERALD, radius=3)

        text(d, (CONTENT_X, my + 92), f"Plan: {plan.title()}. Need more seats? WhatsApp us — we top up without an upgrade.",
             size=F_TINY, fill=MUTED)

        # "+ Add staff" button
        rect(d, [CONTENT_X, my + 130, CONTENT_X + 100, my + 162], fill=NAVY, radius=4)
        text(d, (CONTENT_X + 50, my + 146), "+ Add staff", size=F_SMALL, fill=WARM_WHITE, anchor="mm")

        # Staff table
        ty = my + 184
        th = 40
        col_widths = [220, 100, 280, 100, 160]
        card(d, CONTENT_X, ty, CONTENT_W, 56 + th * (used_d + used_n + 1))
        table_header(d, CONTENT_X, ty, CONTENT_W, 36,
                     ["Name", "Role", "Email", "Status", ""],
                     col_widths=col_widths)
        rows = []
        rows.append((OWNER["name"], "owner", "aaron@democlinic.my", "Active", "—"))
        for doc in DOCTORS[:used_d]:
            rows.append((doc["name"], f"doctor · {doc['slot_min']} min slots",
                         doc["name"].lower().replace(" ", ".").replace("dr.", "") + "@democlinic.my",
                         "Active", "Reset / Deactivate"))
        for nurse in NURSES[:used_n]:
            rows.append((nurse["name"], "nurse",
                         nurse["name"].lower().split()[0] + "@democlinic.my",
                         "Active", "Reset / Deactivate"))
        for i, row in enumerate(rows):
            bg = WHITE if i % 2 == 0 else PANEL
            cells = [
                (row[0], INK, True),
                (row[1], MUTED, False),
                (row[2], MUTED, False),
                (row[3], EMERALD, False),
                (row[4], MUTED, False),
            ]
            table_row(d, CONTENT_X, ty + 36 + i * th, CONTENT_W, th, cells, col_widths=col_widths, row_bg=bg)

    img = render_with_sidebar(plan=plan, active_href="/owner/staff", render_content=content)
    name = f"mock_staff_{plan}.png"
    img.save(OUT_DIR / name)
    print(f"✓ screenshots/{name}")


# ─── Mock 3: nurse pending queue ─────────────────────────────────────────

def mock_pending():
    def content(img, d):
        page_title(d, CONTENT_X, 84, "Pending bookings",
                   f"{len(PENDING_BOOKINGS)} requests waiting for review.")
        ty = 156
        th = 70
        col_widths = [220, 200, 220, 220, 220]
        card(d, CONTENT_X, ty, CONTENT_W, 40 + th * len(PENDING_BOOKINGS))
        table_header(d, CONTENT_X, ty, CONTENT_W, 36,
                     ["Patient", "Treatment", "Slot", "Doctor", "Action"],
                     col_widths=col_widths)
        for i, b in enumerate(PENDING_BOOKINGS):
            y = ty + 36 + i * th
            bg = WHITE if i % 2 == 0 else PANEL
            rect(d, [CONTENT_X, y, CONTENT_X + CONTENT_W, y + th], fill=bg)
            rect(d, [CONTENT_X, y + th - 1, CONTENT_X + CONTENT_W, y + th], fill=HAIRLINE)
            text(d, (CONTENT_X + 16, y + 20), b["patient"], size=F_LABEL, fill=INK)
            text(d, (CONTENT_X + 16, y + 42), f"Submitted {b['submitted']}", size=F_TINY, fill=MUTED)
            text(d, (CONTENT_X + 16 + col_widths[0], y + 32), b["treatment"], size=F_SMALL, fill=INK, anchor="lm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1], y + 32), b["slot"], size=F_SMALL, fill=NAVY, anchor="lm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2], y + 32), b["doctor"], size=F_SMALL, fill=INK, anchor="lm")
            ax = CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2] + col_widths[3]
            rect(d, [ax, y + 18, ax + 90, y + 46], fill=EMERALD, radius=4)
            text(d, (ax + 45, y + 32), "✓ Confirm", size=F_TINY, fill=WHITE, anchor="mm")
            rect(d, [ax + 100, y + 18, ax + 170, y + 46], fill=WHITE, outline=RED, w=1, radius=4)
            text(d, (ax + 135, y + 32), "Reject", size=F_TINY, fill=RED, anchor="mm")

    img = render_with_sidebar(plan="standard", active_href="/nurse", render_content=content)
    img.save(OUT_DIR / "mock_pending.png")
    print(f"✓ screenshots/mock_pending.png")


# ─── Mock 4: recall worklist ─────────────────────────────────────────────

def mock_recalls():
    def content(img, d):
        page_title(d, CONTENT_X, 84, "Recalls due",
                   "Patients whose 6-month checkup interval has elapsed.")

        ty = 156
        th = 64
        col_widths = [240, 160, 140, 240, 200]
        card(d, CONTENT_X, ty, CONTENT_W, 40 + th * len(RECALL_DUE))
        table_header(d, CONTENT_X, ty, CONTENT_W, 36,
                     ["Patient", "Last visit", "Months ago", "WhatsApp", "Action"],
                     col_widths=col_widths)
        for i, r in enumerate(RECALL_DUE):
            y = ty + 36 + i * th
            bg = WHITE if i % 2 == 0 else PANEL
            rect(d, [CONTENT_X, y, CONTENT_X + CONTENT_W, y + th], fill=bg)
            rect(d, [CONTENT_X, y + th - 1, CONTENT_X + CONTENT_W, y + th], fill=HAIRLINE)
            # Name + overdue badge
            text(d, (CONTENT_X + 16, y + 16), r["patient"], size=F_LABEL, fill=INK)
            if r["overdue"] > 0:
                bg_c = RED_BG if r["overdue"] >= 6 else (AMBER_BG if r["overdue"] >= 3 else PANEL)
                fg_c = RED if r["overdue"] >= 6 else (AMBER if r["overdue"] >= 3 else MUTED)
                pill(d, CONTENT_X + 16, y + 38, f"{r['overdue']} mo overdue", bg=bg_c, fg=fg_c)
            text(d, (CONTENT_X + 16 + col_widths[0], y + 32), r["last_visit"], size=F_SMALL, fill=INK, anchor="lm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1], y + 32), f"{r['months']} months", size=F_SMALL, fill=MUTED, anchor="lm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2], y + 32), r["phone"], size=F_SMALL, fill=NAVY, anchor="lm")
            ax = CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2] + col_widths[3]
            if r["sent"]:
                rect(d, [ax, y + 18, ax + 110, y + 46], fill=WHITE, outline=HAIRLINE, w=1, radius=4)
                text(d, (ax + 55, y + 32), "Resend", size=F_TINY, fill=NAVY, anchor="mm")
                text(d, (ax + 116, y + 32), "✓ sent", size=F_TINY, fill=EMERALD, anchor="lm")
            else:
                rect(d, [ax, y + 18, ax + 140, y + 46], fill=NAVY, radius=4)
                text(d, (ax + 70, y + 32), "Send recall →", size=F_TINY, fill=WARM_WHITE, anchor="mm")

    img = render_with_sidebar(plan="standard", active_href="/staff/recalls", render_content=content)
    img.save(OUT_DIR / "mock_recalls.png")
    print(f"✓ screenshots/mock_recalls.png")


# ─── Mock 5: reminders page ──────────────────────────────────────────────

def mock_reminders():
    def content(img, d):
        page_title(d, CONTENT_X, 84, "Send reminders",
                   "Tomorrow's confirmed appointments. Tap Send to open WhatsApp.")

        ty = 156
        th = 70
        col_widths = [240, 100, 240, 240, 240]
        card(d, CONTENT_X, ty, CONTENT_W, 40 + th * len(TOMORROW_BOOKINGS))
        table_header(d, CONTENT_X, ty, CONTENT_W, 36,
                     ["Patient", "Slot", "Doctor", "Reason", "Status"],
                     col_widths=col_widths)
        for i, b in enumerate(TOMORROW_BOOKINGS):
            y = ty + 36 + i * th
            bg = WHITE if i % 2 == 0 else PANEL
            rect(d, [CONTENT_X, y, CONTENT_X + CONTENT_W, y + th], fill=bg)
            rect(d, [CONTENT_X, y + th - 1, CONTENT_X + CONTENT_W, y + th], fill=HAIRLINE)
            text(d, (CONTENT_X + 16, y + 32), b["patient"], size=F_LABEL, fill=INK, anchor="lm")
            text(d, (CONTENT_X + 16 + col_widths[0], y + 32), b["slot"], size=F_SMALL, fill=NAVY, anchor="lm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1], y + 32), b["doctor"], size=F_SMALL, fill=INK, anchor="lm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2], y + 32), b["reason"], size=F_SMALL, fill=MUTED, anchor="lm")
            ax = CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2] + col_widths[3]
            if b["sent"]:
                text(d, (ax, y + 24), f"✓ Sent by {b['sent_by']}", size=F_TINY, fill=EMERALD, anchor="lm")
                rect(d, [ax, y + 36, ax + 80, y + 60], fill=WHITE, outline=HAIRLINE, radius=4)
                text(d, (ax + 40, y + 48), "Resend", size=F_TINY, fill=NAVY, anchor="mm")
            else:
                rect(d, [ax, y + 22, ax + 150, y + 50], fill=NAVY, radius=4)
                text(d, (ax + 75, y + 36), "Send reminder →", size=F_TINY, fill=WARM_WHITE, anchor="mm")

    img = render_with_sidebar(plan="standard", active_href="/staff/reminders", render_content=content)
    img.save(OUT_DIR / "mock_reminders.png")
    print(f"✓ screenshots/mock_reminders.png")


# ─── Mock 6: duty calendar (two variants for Standard vs Premium) ───────

def mock_duty_calendar(plan):
    include_nurses = plan == "premium"
    def content(img, d):
        page_title(d, CONTENT_X, 84, "Duty calendar",
                   "Who's on duty this week. Approved leaves shown in red."
                   + ("" if include_nurses else "  (Doctors only — upgrade to Premium for nurses.)"))
        # Week strip
        ty = 170
        days = ["Mon 9", "Tue 10", "Wed 11", "Thu 12", "Fri 13", "Sat 14", "Sun 15"]
        col_w = (CONTENT_W - 120) / 7
        # Header
        for i, dd in enumerate(days):
            x = CONTENT_X + 120 + i * col_w
            text(d, (x + col_w / 2, ty + 18), dd, size=F_SMALL, fill=NAVY, anchor="mm")
        rect(d, [CONTENT_X, ty + 40, CONTENT_X + CONTENT_W, ty + 41], fill=HAIRLINE)

        # Staff rows
        staff = list(DOCTORS[:3])
        if include_nurses:
            staff += [{"id": n["id"], "name": n["name"], "role": "nurse"} for n in NURSES[:3]]
        else:
            for d2 in staff:
                d2["role"] = "doctor"
        row_h = 64
        for i, s in enumerate(staff):
            ry = ty + 50 + i * row_h
            rect(d, [CONTENT_X, ry + row_h - 1, CONTENT_X + CONTENT_W, ry + row_h], fill=HAIRLINE)
            # Name col with role badge
            badge_bg = BLUE_BG if s.get("role") == "doctor" else EMERALD_BG
            badge_fg = BLUE if s.get("role") == "doctor" else EMERALD
            badge = "Dr" if s.get("role") == "doctor" else "Nr"
            if include_nurses:
                pill(d, CONTENT_X + 8, ry + 22, badge, bg=badge_bg, fg=badge_fg)
                text(d, (CONTENT_X + 50, ry + 32), s["name"][:18], size=F_SMALL, fill=INK, anchor="lm")
            else:
                text(d, (CONTENT_X + 8, ry + 32), s["name"], size=F_SMALL, fill=INK, anchor="lm")
            # Cells
            for j in range(7):
                cx = CONTENT_X + 120 + j * col_w
                # Most days: default duty 9-9
                is_leave = (i == 1 and j == 3)  # Sarah on leave Thursday
                if is_leave:
                    rect(d, [cx + 4, ry + 8, cx + col_w - 4, ry + row_h - 8], fill=RED_BG, radius=4)
                    text(d, (cx + col_w / 2, ry + row_h / 2), "🏖 On leave", size=F_TINY, fill=RED, anchor="mm")
                else:
                    rect(d, [cx + 4, ry + 8, cx + col_w - 4, ry + row_h - 8], fill=PANEL, radius=4)
                    text(d, (cx + col_w / 2, ry + row_h / 2), "09:00–21:00", size=F_TINY, fill=NAVY, anchor="mm")

    img = render_with_sidebar(plan=plan, active_href="/staff/duty-calendar", render_content=content)
    name = f"mock_duty_{plan}.png"
    img.save(OUT_DIR / name)
    print(f"✓ screenshots/{name}")


# ─── Mock 7: doctor performance (Premium) ────────────────────────────────

def mock_doctor_perf():
    def content(img, d):
        page_title(d, CONTENT_X, 84, "Doctor performance",
                   "Per-doctor activity in the last 30 days.")
        # Window selector
        wy = 140
        for i, label in enumerate(["Last 7 days", "Last 30 days", "Last 90 days", "Last 180 days"]):
            x = CONTENT_X + i * 130
            active = i == 1
            fill = NAVY if active else WHITE
            fg = WARM_WHITE if active else MUTED
            rect(d, [x, wy, x + 120, wy + 28], fill=fill, outline=HAIRLINE if not active else NAVY, radius=4)
            text(d, (x + 60, wy + 14), label, size=F_TINY, fill=fg, anchor="mm")

        # Summary cards
        cy = 190
        tot_bookings = sum(d["bookings"] for d in DOCTOR_PERF)
        tot_attended = sum(d["attended"] for d in DOCTOR_PERF)
        tot_no_show = sum(d["no_show"] for d in DOCTOR_PERF)
        clinic_rate = round(tot_attended / (tot_attended + tot_no_show) * 100)
        cw = (CONTENT_W - 48) // 4
        cards_data = [
            ("Total bookings", tot_bookings, NAVY),
            ("Attended", tot_attended, EMERALD),
            ("No-shows", tot_no_show, RED),
            ("Attendance rate", f"{clinic_rate}%", NAVY),
        ]
        for i, (lbl, val, c) in enumerate(cards_data):
            x = CONTENT_X + i * (cw + 16)
            metric_card(d, x, cy, cw, 84, lbl, val, value_color=c)

        # Per-doctor table
        ty = 300
        th = 56
        col_widths = [260, 140, 140, 140, 140, 200]
        card(d, CONTENT_X, ty, CONTENT_W, 40 + th * len(DOCTOR_PERF))
        table_header(d, CONTENT_X, ty, CONTENT_W, 36,
                     ["Doctor", "Bookings", "Attended", "No-show", "Cancelled", "Attendance %"],
                     col_widths=col_widths)
        for i, doc in enumerate(DOCTOR_PERF):
            y = ty + 36 + i * th
            bg = WHITE if i % 2 == 0 else PANEL
            rect(d, [CONTENT_X, y, CONTENT_X + CONTENT_W, y + th], fill=bg)
            rect(d, [CONTENT_X, y + th - 1, CONTENT_X + CONTENT_W, y + th], fill=HAIRLINE)
            text(d, (CONTENT_X + 16, y + th / 2), doc["name"], size=F_LABEL, fill=INK, anchor="lm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1] / 2, y + th / 2), str(doc["bookings"]), size=F_BODY, fill=INK, anchor="mm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2] / 2, y + th / 2), str(doc["attended"]), size=F_BODY, fill=EMERALD, anchor="mm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2] + col_widths[3] / 2, y + th / 2), str(doc["no_show"]), size=F_BODY, fill=RED, anchor="mm")
            text(d, (CONTENT_X + 16 + col_widths[0] + col_widths[1] + col_widths[2] + col_widths[3] + col_widths[4] / 2, y + th / 2), str(doc["cancelled"]), size=F_BODY, fill=MUTED, anchor="mm")
            rate_color = EMERALD if doc["rate"] >= 85 else (AMBER if doc["rate"] >= 70 else RED)
            text(d, (CONTENT_X + 16 + sum(col_widths[:5]) + col_widths[5] / 2, y + th / 2), f"{doc['rate']}%", size=F_LABEL, fill=rate_color, anchor="mm")

    img = render_with_sidebar(plan="premium", active_href="/owner/doctor-performance", render_content=content)
    img.save(OUT_DIR / "mock_doctor_perf.png")
    print(f"✓ screenshots/mock_doctor_perf.png")


# ─── Mock 8: nurse performance (Premium) ─────────────────────────────────

def mock_nurse_perf():
    def content(img, d):
        page_title(d, CONTENT_X, 84, "Nurse performance",
                   "What each nurse has actually done in the last 30 days.")
        wy = 140
        for i, label in enumerate(["Last 7 days", "Last 30 days", "Last 90 days", "Last 180 days"]):
            x = CONTENT_X + i * 130
            active = i == 1
            fill = NAVY if active else WHITE
            fg = WARM_WHITE if active else MUTED
            rect(d, [x, wy, x + 120, wy + 28], fill=fill, outline=HAIRLINE if not active else NAVY, radius=4)
            text(d, (x + 60, wy + 14), label, size=F_TINY, fill=fg, anchor="mm")

        # Summary
        cy = 190
        tot_created = sum(n["created"] for n in NURSE_PERF)
        tot_approvals = sum(n["approvals"] for n in NURSE_PERF)
        tot_reminders = sum(n["reminders"] for n in NURSE_PERF)
        tot_recalls = sum(n["recalls"] for n in NURSE_PERF)
        tot_attendance = sum(n["attendance"] for n in NURSE_PERF)
        cw = (CONTENT_W - 64) // 5
        cards_data = [
            ("New bookings", tot_created),
            ("Approvals", tot_approvals),
            ("Reminders", tot_reminders),
            ("Recalls", tot_recalls),
            ("Attendance marks", tot_attendance),
        ]
        for i, (lbl, val) in enumerate(cards_data):
            x = CONTENT_X + i * (cw + 16)
            metric_card(d, x, cy, cw, 84, lbl, val)

        # Table
        ty = 300
        th = 50
        col_widths = [250, 100, 100, 110, 100, 130, 100, 160]
        card(d, CONTENT_X, ty, CONTENT_W, 40 + th * len(NURSE_PERF))
        table_header(d, CONTENT_X, ty, CONTENT_W, 36,
                     ["Nurse", "Bookings", "Approvals", "Reminders", "Recalls", "Attendance", "Total", "Share"],
                     col_widths=col_widths)
        max_total = max(n["created"] + n["approvals"] + n["reminders"] + n["recalls"] + n["attendance"] for n in NURSE_PERF)
        for i, n in enumerate(NURSE_PERF):
            y = ty + 36 + i * th
            bg = WHITE if i % 2 == 0 else PANEL
            rect(d, [CONTENT_X, y, CONTENT_X + CONTENT_W, y + th], fill=bg)
            rect(d, [CONTENT_X, y + th - 1, CONTENT_X + CONTENT_W, y + th], fill=HAIRLINE)
            total = n["created"] + n["approvals"] + n["reminders"] + n["recalls"] + n["attendance"]
            text(d, (CONTENT_X + 16, y + th / 2), n["name"], size=F_LABEL, fill=INK, anchor="lm")
            vals = [n["created"], n["approvals"], n["reminders"], n["recalls"], n["attendance"], total]
            for j, v in enumerate(vals):
                cx = CONTENT_X + 16 + col_widths[0] + sum(col_widths[1:j + 1])
                cw_j = col_widths[j + 1]
                bold = j == 5
                text(d, (cx + cw_j / 2, y + th / 2), str(v), size=F_LABEL if bold else F_BODY,
                     fill=NAVY if bold else INK, anchor="mm")
            # Share bar
            share_x = CONTENT_X + 16 + sum(col_widths[:7])
            share_w = col_widths[7] - 50
            rect(d, [share_x, y + th / 2 - 4, share_x + share_w, y + th / 2 + 4], fill=HAIRLINE, radius=2)
            rect(d, [share_x, y + th / 2 - 4, share_x + int(share_w * total / max_total), y + th / 2 + 4], fill=EMERALD, radius=2)
            text(d, (share_x + share_w + 8, y + th / 2), f"{n['share']}%", size=F_TINY, fill=MUTED, anchor="lm")

    img = render_with_sidebar(plan="premium", active_href="/owner/nurse-performance", render_content=content)
    img.save(OUT_DIR / "mock_nurse_perf.png")
    print(f"✓ screenshots/mock_nurse_perf.png")


# ─── Mock 9: utilization heatmap (Premium) ──────────────────────────────

def mock_utilization():
    def content(img, d):
        page_title(d, CONTENT_X, 84, "Utilization heatmap",
                   "Confirmed bookings in the last 30 days — by weekday and hour.")
        # Heatmap grid
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        hours = list(range(9, 21))
        gy = 170
        gx = CONTENT_X + 80
        cell_w = (CONTENT_W - 100) // len(hours)
        cell_h = 56
        # Hour labels
        for i, h in enumerate(hours):
            text(d, (gx + i * cell_w + cell_w / 2, gy - 10), f"{h:02d}", size=F_TINY, fill=MUTED, anchor="mm")
        # Sample heat values (0..1)
        import random
        random.seed(42)
        for di, day in enumerate(days):
            text(d, (CONTENT_X + 40, gy + 10 + di * cell_h + cell_h / 2), day, size=F_SMALL, fill=NAVY, anchor="mm")
            for hi, _ in enumerate(hours):
                v = random.uniform(0.05, 0.95) if di < 5 else (random.uniform(0.5, 0.9) if di == 5 else random.uniform(0, 0.3))
                x = gx + hi * cell_w
                y = gy + 10 + di * cell_h
                # purple gradient
                purple = (int(243 - v * 100), int(232 - v * 130), int(255 - v * 60))
                if v < 0.1:
                    purple = HAIRLINE
                rect(d, [x + 2, y + 2, x + cell_w - 2, y + cell_h - 2], fill=purple, radius=4)
                if v > 0.3:
                    text(d, (x + cell_w / 2, y + cell_h / 2), str(int(v * 20)), size=F_TINY,
                         fill=WHITE if v > 0.6 else NAVY, anchor="mm")

        # Legend
        ly = gy + len(days) * cell_h + 30
        text(d, (CONTENT_X, ly), "Less", size=F_TINY, fill=MUTED)
        for i, v in enumerate([0.1, 0.3, 0.5, 0.7, 0.9]):
            lx = CONTENT_X + 50 + i * 30
            purple = (int(243 - v * 100), int(232 - v * 130), int(255 - v * 60))
            rect(d, [lx, ly - 2, lx + 24, ly + 18], fill=purple, radius=3)
        text(d, (CONTENT_X + 50 + 5 * 30 + 5, ly), "More", size=F_TINY, fill=MUTED)

    img = render_with_sidebar(plan="premium", active_href="/owner/utilization", render_content=content)
    img.save(OUT_DIR / "mock_utilization.png")
    print(f"✓ screenshots/mock_utilization.png")


# ─── Mock 10: owner overview ─────────────────────────────────────────────

def mock_overview(plan):
    def content(img, d):
        page_title(d, CONTENT_X, 84, "Overview",
                   f"This week at {CLINIC_NAME}.")
        # 4 cards
        cy = 160
        cw = (CONTENT_W - 48) // 4
        cards_data = [
            ("Bookings this week", OVERVIEW_STATS["bookings_this_week"]),
            ("Pending review", OVERVIEW_STATS["pending"]),
            ("Patients (total)", OVERVIEW_STATS["total_patients"]),
            ("Repeat rate", f"{OVERVIEW_STATS['repeat_rate']}%"),
        ]
        for i, (lbl, val) in enumerate(cards_data):
            x = CONTENT_X + i * (cw + 16)
            metric_card(d, x, cy, cw, 100, lbl, val)

        # Today's bookings card
        ty = 290
        card(d, CONTENT_X, ty, CONTENT_W, 280)
        text(d, (CONTENT_X + 20, ty + 16), "Today's bookings", size=F_HEAD, fill=NAVY)
        row_h = 48
        for i, b in enumerate(TOMORROW_BOOKINGS[:4]):
            y = ty + 56 + i * row_h
            rect(d, [CONTENT_X + 20, y + row_h - 1, CONTENT_X + CONTENT_W - 20, y + row_h], fill=HAIRLINE)
            text(d, (CONTENT_X + 30, y + row_h / 2), b["slot"], size=F_LABEL, fill=NAVY, anchor="lm")
            text(d, (CONTENT_X + 120, y + row_h / 2), b["patient"], size=F_BODY, fill=INK, anchor="lm")
            text(d, (CONTENT_X + 380, y + row_h / 2), b["doctor"], size=F_SMALL, fill=MUTED, anchor="lm")
            text(d, (CONTENT_X + 650, y + row_h / 2), b["reason"], size=F_SMALL, fill=MUTED, anchor="lm")
            if i < 2:
                pill(d, CONTENT_X + CONTENT_W - 130, y + row_h / 2 - 9, "confirmed", bg=EMERALD_BG, fg=EMERALD)

        # Audit log preview
        ay = ty + 296
        card(d, CONTENT_X, ay, CONTENT_W, 264)
        text(d, (CONTENT_X + 20, ay + 16), "Recent activity", size=F_HEAD, fill=NAVY)
        for i, e in enumerate(AUDIT_LOG[:5]):
            y = ay + 56 + i * 40
            rect(d, [CONTENT_X + 20, y + 39, CONTENT_X + CONTENT_W - 20, y + 40], fill=HAIRLINE)
            text(d, (CONTENT_X + 30, y + 20), e["when"], size=F_TINY, fill=MUTED, anchor="lm")
            text(d, (CONTENT_X + 130, y + 20), e["actor"], size=F_SMALL, fill=NAVY, anchor="lm")
            text(d, (CONTENT_X + 400, y + 20), e["action"], size=F_TINY, fill=MUTED, anchor="lm")
            text(d, (CONTENT_X + 600, y + 20), e["entity"], size=F_SMALL, fill=INK, anchor="lm")

    img = render_with_sidebar(plan=plan, active_href="/owner", render_content=content)
    name = f"mock_overview_{plan}.png"
    img.save(OUT_DIR / name)
    print(f"✓ screenshots/{name}")


# ─── Mock 11: WhatsApp templates ─────────────────────────────────────────

def mock_templates():
    def content(img, d):
        page_title(d, CONTENT_X, 84, "WhatsApp templates",
                   "Edit the templates the nurse uses when sending WhatsApp messages.")
        # 2-column layout
        ty = 156
        col_w = (CONTENT_W - 16) // 2
        # Left: template list
        card(d, CONTENT_X, ty, col_w, 600)
        text(d, (CONTENT_X + 16, ty + 16), "Templates", size=F_LABEL, fill=NAVY)
        for i, t in enumerate(TEMPLATES):
            y = ty + 56 + i * 76
            is_active = i == 1
            bg = PANEL if is_active else WHITE
            rect(d, [CONTENT_X + 8, y, CONTENT_X + col_w - 8, y + 64], fill=bg, radius=6)
            text(d, (CONTENT_X + 24, y + 16), t["label"], size=F_LABEL, fill=NAVY)
            text(d, (CONTENT_X + 24, y + 38), f"key: {t['key']}", size=F_TINY, fill=MUTED)
        # Right: editor
        ex = CONTENT_X + col_w + 16
        card(d, ex, ty, col_w, 600)
        text(d, (ex + 16, ty + 16), "Editing: Booking confirmed", size=F_LABEL, fill=NAVY)
        # Body textarea
        rect(d, [ex + 16, ty + 56, ex + col_w - 16, ty + 360], fill=PANEL, outline=HAIRLINE, radius=4)
        lines = [
            "Hi {patient_name},",
            "",
            "Your appointment is confirmed:",
            "• Doctor: {doctor_name}",
            "• Date & time: {slot_label}",
            "",
            "Please arrive 10 minutes early.",
            "",
            "— {clinic_name}",
        ]
        for i, line in enumerate(lines):
            text(d, (ex + 32, ty + 72 + i * 26), line, size=F_SMALL, fill=INK)
        text(d, (ex + 16, ty + 380), "Available placeholders: {patient_name}, {doctor_name}, {slot_label}, {clinic_name}",
             size=F_TINY, fill=MUTED)
        rect(d, [ex + 16, ty + 540, ex + 150, ty + 568], fill=NAVY, radius=4)
        text(d, (ex + 83, ty + 554), "Save template", size=F_TINY, fill=WARM_WHITE, anchor="mm")

    img = render_with_sidebar(plan="standard", active_href="/staff/templates", render_content=content)
    img.save(OUT_DIR / "mock_templates.png")
    print(f"✓ screenshots/mock_templates.png")


# ─── Mock 12: /login ─────────────────────────────────────────────────────

def mock_login():
    img = new_canvas(PANEL)
    d = ImageDraw.Draw(img)
    text(d, (CANVAS_W / 2, CANVAS_H / 2 - 220), CLINIC_NAME, size=F_BIG, fill=NAVY, anchor="mm")
    text(d, (CANVAS_W / 2, CANVAS_H / 2 - 180), "Staff login", size=F_SMALL, fill=MUTED, anchor="mm")
    card_x = (CANVAS_W - 380) / 2
    card_y = CANVAS_H / 2 - 130
    card(d, card_x, card_y, 380, 280)
    text(d, (card_x + 20, card_y + 24), "Email", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 20, card_y + 48, card_x + 360, card_y + 76], fill=PANEL, outline=HAIRLINE, radius=4)
    text(d, (card_x + 32, card_y + 62), "norhaiza@democlinic.my", size=F_BODY, fill=INK, anchor="lm")
    text(d, (card_x + 20, card_y + 92), "Password", size=F_TINY, fill=NAVY)
    rect(d, [card_x + 20, card_y + 116, card_x + 360, card_y + 144], fill=PANEL, outline=HAIRLINE, radius=4)
    text(d, (card_x + 32, card_y + 130), "•••••••••••", size=F_BODY, fill=INK, anchor="lm")
    rect(d, [card_x + 20, card_y + 184, card_x + 360, card_y + 220], fill=NAVY, radius=4)
    text(d, (card_x + 200, card_y + 202), "Sign in", size=F_LABEL, fill=WARM_WHITE, anchor="mm")
    text(d, (CANVAS_W / 2, card_y + 320), "Powered by Kanan · your trusted right hand",
         size=F_TINY, fill=MUTED, anchor="mm")
    img.save(OUT_DIR / "mock_login.png")
    print(f"✓ screenshots/mock_login.png")


# ─── Build all ───────────────────────────────────────────────────────────

def build_all():
    mock_login()
    mock_book()
    mock_overview("standard")
    mock_overview("premium")
    mock_staff("standard")
    mock_staff("premium")
    mock_pending()
    mock_reminders()
    mock_recalls()
    mock_templates()
    mock_duty_calendar("standard")
    mock_duty_calendar("premium")
    mock_doctor_perf()
    mock_nurse_perf()
    mock_utilization()
    print(f"\nAll mocks in {OUT_DIR}")


if __name__ == "__main__":
    build_all()
