// The clinic-terminal home view — a kiosk-style dashboard the receptionist
// PC sits on all day. Anyone walking past can SEE the state of the clinic;
// any WRITE action (confirm, attend, send reminder, send recall) requires
// PIN unlock (added in Phase 4). Read-only here.

import Link from "next/link";

type PendingBooking = {
  id: string;
  slot_start: string;
  service: string;
  patient_name: string;
  doctor_name: string;
};

type TodayBooking = {
  id: string;
  slot_start: string;
  service: string;
  attended: boolean;
  no_show: boolean;
  patient_name: string;
  doctor_id: string | null;
  doctor_name: string;
};

type RecallPatient = {
  id: string;
  full_name: string;
  last_visit_at: string | null;
  recall_due_at: string | null;
};

type DoctorOnDuty = {
  id: string;
  display_name: string;
  default_slot_minutes: number;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDayRel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return "Today";
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  ) {
    return "Tomorrow";
  }
  return `${String(d.getDate()).padStart(2, "0")} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`;
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function ClinicConsole({
  clinicName,
  pending,
  today,
  recalls,
  doctors,
}: {
  clinicName: string;
  pending: PendingBooking[];
  today: TodayBooking[];
  recalls: RecallPatient[];
  doctors: DoctorOnDuty[];
}) {
  // Per-doctor today counters (seen vs total, next slot time)
  const perDoctor = doctors.map((d) => {
    const own = today.filter((t) => t.doctor_id === d.id);
    const seen = own.filter((t) => t.attended).length;
    const noShow = own.filter((t) => t.no_show).length;
    const upcoming = own.find((t) => !t.attended && !t.no_show && new Date(t.slot_start) >= new Date());
    return {
      ...d,
      total: own.length,
      seen,
      noShow,
      nextSlot: upcoming ? fmtTime(upcoming.slot_start) : null,
      nextPatient: upcoming ? upcoming.patient_name : null,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{clinicName} — Clinic console</h2>
          <p className="text-xs text-stone-500">
            Read-only overview. Confirming bookings, sending reminders, opening HR pages require your 6-digit PIN.
          </p>
        </div>
        <div className="text-xs text-stone-500">
          {new Date().toLocaleString("en-GB", { weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
        </div>
      </div>

      {/* Pending bookings */}
      <section className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-medium">
            Pending bookings <span className="text-stone-400 font-normal">({pending.length})</span>
          </h3>
          <Link href="/nurse" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-stone-400">Nothing pending. ✓</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {pending.map((b) => (
              <li key={b.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{b.patient_name}</div>
                  <div className="text-xs text-stone-500 truncate">
                    {b.service} · {fmtDayRel(b.slot_start)} {fmtTime(b.slot_start)} · {b.doctor_name}
                  </div>
                </div>
                <span className="pill pill-pending text-[10px]">pending</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recalls due today */}
      <section className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-medium">
            Recalls due today <span className="text-stone-400 font-normal">({recalls.length})</span>
          </h3>
          <Link href="/staff/recalls" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
        {recalls.length === 0 ? (
          <p className="text-xs text-stone-400">No recalls due. ✓</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {recalls.map((p) => {
              const since = daysAgo(p.last_visit_at);
              return (
                <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.full_name}</div>
                    <div className="text-xs text-stone-500 truncate">
                      {since != null ? `Last visit ${since} days ago` : "No previous visit"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Today's appointments */}
      <section className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-medium">
            Today&apos;s appointments <span className="text-stone-400 font-normal">({today.length})</span>
          </h3>
          <Link href="/owner/calendar" className="text-xs text-blue-600 hover:underline">Calendar →</Link>
        </div>
        {today.length === 0 ? (
          <p className="text-xs text-stone-400">Nothing scheduled. ✓</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {today.map((b) => (
              <li key={b.id} className="py-2 flex items-center gap-3">
                <span className="text-xs tabular-nums w-12 text-stone-500">{fmtTime(b.slot_start)}</span>
                <div className="min-w-0 flex-1">
                  <div className={`font-medium truncate ${b.attended ? "line-through text-stone-400" : ""}`}>
                    {b.patient_name}
                  </div>
                  <div className="text-xs text-stone-500 truncate">{b.service} · {b.doctor_name}</div>
                </div>
                {b.attended && <span className="pill pill-confirmed text-[10px]">seen</span>}
                {b.no_show && <span className="pill pill-cancelled text-[10px]">no-show</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Doctors on duty */}
      <section className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Doctors on duty</h3>
        {perDoctor.length === 0 ? (
          <p className="text-xs text-stone-400">No active doctors.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {perDoctor.map((d) => (
              <div key={d.id} className="border border-stone-200 rounded-lg p-3 bg-stone-50">
                <div className="text-sm font-medium truncate">{d.display_name}</div>
                <div className="text-[11px] text-stone-500 mb-1.5">
                  {d.seen}/{d.total} seen{d.noShow > 0 ? ` · ${d.noShow} no-show` : ""}
                </div>
                {d.nextSlot ? (
                  <div className="text-xs">
                    <span className="text-stone-500">Next:</span>{" "}
                    <span className="tabular-nums font-medium">{d.nextSlot}</span>{" "}
                    <span className="text-stone-500 truncate inline-block max-w-[80%] align-bottom">{d.nextPatient}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 italic">
                    {d.total === 0 ? "Off / no bookings" : "Day done"}
                  </div>
                )}
                <div className="mt-2 text-[10px] text-stone-400 uppercase tracking-wider">
                  Tap to unlock
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
