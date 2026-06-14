"""Realistic Malaysian dental clinic sample data, shared across mock screenshots.

Used by build_mock_screenshots.py to render dashboard panes that look like
real screen captures. Names + treatments + slot times are plausible but
fictional — no real clinic data is used.
"""

CLINIC_NAME = "DEMO CLINIC"

DOCTORS = [
    {"id": "d1", "name": "Dr. Lee Chee Hong",   "slot_min": 30},
    {"id": "d2", "name": "Dr. Sarah Wong",      "slot_min": 30},
    {"id": "d3", "name": "Dr. Aiman Rashid",    "slot_min": 45},
    {"id": "d4", "name": "Dr. Tan Mei Yee",     "slot_min": 30},
]

NURSES = [
    {"id": "n1", "name": "Norhaiza Binti Ismail"},
    {"id": "n2", "name": "Jenny Tan Hui Mei"},
    {"id": "n3", "name": "Priya Devi"},
    {"id": "n4", "name": "Aini Salleh"},
    {"id": "n5", "name": "Chong Li Wen"},
    {"id": "n6", "name": "Farah Liyana"},
]

OWNER = {"id": "o1", "name": "Dr. Aaron Lim",  "role": "owner"}

PATIENTS = [
    {"ic": "920311-14-5421", "name": "Tan Wei Ming",        "phone": "+60 12-234 5678", "visits": 5},
    {"ic": "880425-08-3217", "name": "Siti Aisyah Binti Hassan", "phone": "+60 17-455 1289", "visits": 3},
    {"ic": "950712-10-2245", "name": "Lim Hui Ling",        "phone": "+60 16-882 4471", "visits": 2},
    {"ic": "010305-06-1129", "name": "Muhammad Daniel",      "phone": "+60 11-2345 6789", "visits": 1},
    {"ic": "780921-14-7765", "name": "Rajesh A/L Subramaniam", "phone": "+60 19-664 0023", "visits": 8},
    {"ic": "991108-02-5544", "name": "Chong Mei Xuan",      "phone": "+60 13-998 7765", "visits": 4},
    {"ic": "850304-07-9912", "name": "Nurul Aini Abdullah", "phone": "+60 14-552 8821", "visits": 6},
    {"ic": "030519-09-3344", "name": "Aaron Cheong",         "phone": "+60 18-441 1122", "visits": 1},
    {"ic": "770618-08-1188", "name": "Ng Boon Keat",        "phone": "+60 12-887 6655", "visits": 7},
    {"ic": "961122-05-4476", "name": "Devi A/P Krishnan",   "phone": "+60 16-330 9981", "visits": 2},
]

# Today's pending queue — bookings nurse needs to action
PENDING_BOOKINGS = [
    {"patient": "Lim Hui Ling",         "treatment": "Scaling",            "slot": "Tomorrow 09:00", "doctor": "Dr. Lee Chee Hong",  "submitted": "Today 08:23"},
    {"patient": "Muhammad Daniel",      "treatment": "Wisdom tooth surgery", "slot": "Tomorrow 11:00", "doctor": "Dr. Sarah Wong",     "submitted": "Today 09:14"},
    {"patient": "Chong Mei Xuan",       "treatment": "Whitening",          "slot": "Tomorrow 14:30", "doctor": "Dr. Tan Mei Yee",    "submitted": "Today 10:02"},
    {"patient": "Aaron Cheong",         "treatment": "Scaling",            "slot": "Fri 15 Jun 10:30", "doctor": "Dr. Lee Chee Hong",  "submitted": "Today 10:47"},
    {"patient": "Devi A/P Krishnan",    "treatment": "Root canal",         "slot": "Fri 15 Jun 16:00", "doctor": "Dr. Aiman Rashid",   "submitted": "Today 11:15"},
]

# Confirmed bookings — for reminders page (tomorrow's lineup)
TOMORROW_BOOKINGS = [
    {"patient": "Tan Wei Ming",            "slot": "09:00", "doctor": "Dr. Lee Chee Hong",  "reason": "Scaling",          "sent": True,  "sent_by": "Jenny Tan"},
    {"patient": "Lim Hui Ling",            "slot": "09:00", "doctor": "Dr. Lee Chee Hong",  "reason": "Scaling",          "sent": False, "sent_by": None},
    {"patient": "Siti Aisyah Binti Hassan", "slot": "10:00", "doctor": "Dr. Sarah Wong",     "reason": "Root canal",       "sent": True,  "sent_by": "Norhaiza"},
    {"patient": "Rajesh A/L Subramaniam",  "slot": "11:00", "doctor": "Dr. Tan Mei Yee",    "reason": "Crown fitting",    "sent": False, "sent_by": None},
    {"patient": "Nurul Aini Abdullah",     "slot": "14:00", "doctor": "Dr. Aiman Rashid",   "reason": "Wisdom tooth surgery", "sent": False, "sent_by": None},
    {"patient": "Ng Boon Keat",            "slot": "15:30", "doctor": "Dr. Sarah Wong",     "reason": "Scaling",          "sent": False, "sent_by": None},
]

# Patients due for recall (last visit > 6 months ago)
RECALL_DUE = [
    {"patient": "Tan Wei Ming",            "last_visit": "5 Dec 2025", "months": 6, "overdue": 0,   "phone": "+60 12-234 5678", "sent": False},
    {"patient": "Siti Aisyah Binti Hassan","last_visit": "12 Nov 2025", "months": 7, "overdue": 1,  "phone": "+60 17-455 1289", "sent": False},
    {"patient": "Ng Boon Keat",            "last_visit": "3 Oct 2025",  "months": 8, "overdue": 2,  "phone": "+60 12-887 6655", "sent": True},
    {"patient": "Chong Mei Xuan",          "last_visit": "20 Aug 2025", "months": 10, "overdue": 4, "phone": "+60 13-998 7765", "sent": False},
    {"patient": "Rajesh A/L Subramaniam",  "last_visit": "5 May 2025",  "months": 13, "overdue": 7, "phone": "+60 19-664 0023", "sent": False},
]

# Doctor performance — last 30 days
DOCTOR_PERF = [
    {"name": "Dr. Lee Chee Hong",  "bookings": 142, "attended": 128, "no_show": 9,  "cancelled": 5, "rate": 93},
    {"name": "Dr. Sarah Wong",     "bookings": 118, "attended": 105, "no_show": 11, "cancelled": 2, "rate": 91},
    {"name": "Dr. Aiman Rashid",   "bookings":  87, "attended":  76, "no_show":  8, "cancelled": 3, "rate": 90},
    {"name": "Dr. Tan Mei Yee",    "bookings":  96, "attended":  84, "no_show": 10, "cancelled": 2, "rate": 89},
]

# Nurse performance — last 30 days
NURSE_PERF = [
    {"name": "Jenny Tan Hui Mei",   "created": 48, "approvals": 124, "reminders": 89, "recalls": 22, "attendance": 211, "share": 28},
    {"name": "Norhaiza Binti Ismail","created": 41, "approvals": 108, "reminders": 76, "recalls": 18, "attendance": 198, "share": 25},
    {"name": "Priya Devi",          "created": 32, "approvals":  87, "reminders": 64, "recalls": 14, "attendance": 156, "share": 20},
    {"name": "Aini Salleh",         "created": 24, "approvals":  61, "reminders": 48, "recalls": 11, "attendance": 112, "share": 14},
    {"name": "Chong Li Wen",        "created": 18, "approvals":  43, "reminders": 35, "recalls":  9, "attendance":  82, "share": 10},
    {"name": "Farah Liyana",        "created":  5, "approvals":  11, "reminders":  8, "recalls":  2, "attendance":  19, "share":  3},
]

# Audit log entries
AUDIT_LOG = [
    {"when": "Today 11:32", "actor": "Jenny Tan Hui Mei",    "action": "booking_attended",     "entity": "Tan Wei Ming"},
    {"when": "Today 11:15", "actor": "Devi A/P Krishnan",    "action": "booking_pending",       "entity": "self-submitted"},
    {"when": "Today 10:48", "actor": "Norhaiza Binti Ismail","action": "approve_booking",      "entity": "Aaron Cheong"},
    {"when": "Today 10:21", "actor": "Jenny Tan Hui Mei",    "action": "patient_recall_sent",  "entity": "Ng Boon Keat"},
    {"when": "Today 09:55", "actor": "Dr. Aaron Lim",        "action": "branding_update",       "entity": "primary_color"},
    {"when": "Today 09:14", "actor": "Muhammad Daniel",      "action": "booking_pending",       "entity": "self-submitted"},
    {"when": "Today 08:30", "actor": "Norhaiza Binti Ismail","action": "booking_no_show",      "entity": "Lim Hui Ling (yesterday)"},
]

# Templates the nurse uses (key + first line)
TEMPLATES = [
    {"key": "check",              "label": "Initial confirmation"},
    {"key": "confirm_booking",    "label": "Booking confirmed"},
    {"key": "confirm_reschedule", "label": "Reschedule confirmed"},
    {"key": "reject",             "label": "Slot rejected"},
    {"key": "reminder",           "label": "Day-before reminder"},
    {"key": "recall",             "label": "6-month recall"},
]

# Quick stats for the owner overview card
OVERVIEW_STATS = {
    "bookings_this_week": 87,
    "pending": 5,
    "total_patients": 412,
    "repeat_rate": 68,
}
