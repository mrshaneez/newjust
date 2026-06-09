// ─── Calendar — unified view of every dated event across the docket ──────────
// Aggregates: scheduled sittings (bookings), recorded hearings, task due-dates,
// target deadlines, and filed requests — into a month grid + agenda list.
// Role-aware: shows only what the current user is allowed to see.

const CAL_TYPES = {
  hearing: { label: "Hearings", color: "var(--accent)", soft: "var(--accent-soft)" },
  task: { label: "Tasks", color: "var(--warn)", soft: "var(--warn-soft)" },
  target: { label: "Deadlines", color: "#6b46c1", soft: "color-mix(in srgb, #6b46c1 14%, transparent)" },
  request: { label: "Requests", color: "var(--danger)", soft: "var(--danger-soft)" }
};

const ymd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const parseDate = (s) => {const d = new Date(s);return isNaN(d) ? null : d;};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Build the full event list the current session may see
function buildCalendarEvents({ cases, bookings, targets, session, dirs }) {
  const ev = [];
  let visibleIds;
  try {
    visibleIds = new Set(window.visibleCases(session, cases, dirs.judges, dirs.staff, dirs.sections, dirs.accessGrants).map((c) => c.id));
  } catch {visibleIds = new Set(cases.map((c) => c.id));}
  const caseById = new Map(cases.map((c) => [c.id, c]));
  const seesCase = (id) => !id || visibleIds.has(id);

  // Scheduled sittings (bookings)
  (bookings || []).forEach((b) => {
    if (!seesCase(b.caseId) || b.status === "Cancelled") return;
    const d = parseDate(b.date);if (!d) return;
    ev.push({ id: `bk-${b.id}`, type: "hearing", date: ymd(d),
      time: b.timeStart || "", endTime: b.timeEnd || "",
      title: b.caseTitle || b.caseId, sub: `${b.courtroom || "Courtroom"}${b.judges && b.judges.length ? " · " + b.judges.length + "-judge bench" : ""}`,
      caseId: b.caseId, status: b.status });
  });
  // Recorded hearings, task due dates, target deadlines, requests
  cases.forEach((c) => {
    if (!seesCase(c.id)) return;
    (c.hearings || []).forEach((h, i) => {
      const d = parseDate(h.date);if (!d) return;
      // skip if a booking already covers this date+case (avoid duplicates)
      ev.push({ id: `hr-${c.id}-${i}`, type: "hearing", date: ymd(d), time: "",
        title: c.title, sub: `${h.court || h.courtroom || "Hearing"}${h.outcome ? " · " + h.outcome : ""}`,
        caseId: c.id, past: true });
    });
    (c.tasks || []).forEach((t) => {
      const d = parseDate(t.due);if (!d) return;
      ev.push({ id: `tk-${c.id}-${t.id}`, type: "task", date: ymd(d), time: "",
        title: t.text, sub: `${c.id} · ${t.assignee || "Unassigned"}`,
        caseId: c.id, done: t.done, priority: t.priority });
    });
    (c.requests || []).forEach((r, i) => {
      const d = parseDate(r.submittedAt || r.date);if (!d) return;
      ev.push({ id: `rq-${c.id}-${i}`, type: "request", date: ymd(d), time: "",
        title: `${r.type || "Request"}${r.status ? " — " + r.status : ""}`, sub: `${c.id}${r.filedBy ? " · " + r.filedBy : ""}`,
        caseId: c.id });
    });
  });
  // Target deadlines (internal only — targets aren't case-scoped for visibility)
  if (["admin", "judge", "staff"].includes(session.role)) {
    (targets || []).forEach((t) => {
      const d = parseDate(t.deadline);if (!d) return;
      const linked = (t.caseIds || [])[0] || null;
      ev.push({ id: `tg-${t.id}`, type: "target", date: ymd(d), time: "",
        title: t.description, sub: `${t.type} · ${t.current || 0}/${t.metric}`,
        caseId: linked });
    });
  }
  return ev;
}

const CalendarPage = ({ cases, bookings, targets, judges, staff, sections, accessGrants, setModal, goCase }) => {
  const { session } = useAuth();
  const toast = typeof useToast === "function" ? useToast() : null;
  const dirs = { judges, staff, sections, accessGrants };
  const [cursor, setCursor] = React.useState(() => {const d = new Date();return { y: d.getFullYear(), m: d.getMonth() };});
  const [view, setView] = React.useState("month"); // month | agenda
  const [filters, setFilters] = React.useState(() => new Set(Object.keys(CAL_TYPES)));
  const [selected, setSelected] = React.useState(ymd(new Date()));

  const events = React.useMemo(() => buildCalendarEvents({ cases, bookings, targets, session, dirs }),
  [cases, bookings, targets, session]);
  const shown = events.filter((e) => filters.has(e.type));

  const byDay = React.useMemo(() => {
    const m = {};
    shown.forEach((e) => {(m[e.date] = m[e.date] || []).push(e);});
    Object.values(m).forEach((list) => list.sort((a, b) => (a.time || "99").localeCompare(b.time || "99")));
    return m;
  }, [shown]);

  const toggleFilter = (k) => setFilters((prev) => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    if (next.size === 0) return new Set(Object.keys(CAL_TYPES)); // never empty
    return next;
  });

  const go = (delta) => setCursor((c) => {
    let m = c.m + delta,y = c.y;
    if (m < 0) {m = 11;y--;}if (m > 11) {m = 0;y++;}
    return { y, m };
  });
  const goToday = () => {const d = new Date();setCursor({ y: d.getFullYear(), m: d.getMonth() });setSelected(ymd(d));};

  // Build the 6-week grid (Mon-first)
  const grid = React.useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    let startDow = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(cursor.y, cursor.m, 1 - startDow);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const todayStr = ymd(new Date());
  const openEvent = (e) => {if (e.caseId) {const c = cases.find((x) => x.id === e.caseId);if (c && goCase) return goCase(c);}};

  // Agenda: upcoming events grouped by day, from today forward
  const agenda = React.useMemo(() => {
    const days = Object.keys(byDay).filter((d) => d >= todayStr).sort();
    return days.map((d) => ({ date: d, items: byDay[d] }));
  }, [byDay, todayStr]);

  const counts = Object.keys(CAL_TYPES).reduce((acc, k) => {acc[k] = events.filter((e) => e.type === k).length;return acc;}, {});

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => go(-1)} style={navArrow} title="Previous month"><I.chevronL size={16} /></button>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", minWidth: 180, textAlign: "center" }}>
            {MONTHS[cursor.m]} {cursor.y}
          </div>
          <button onClick={() => go(1)} style={navArrow} title="Next month"><I.chevronR size={16} /></button>
          <Btn size="sm" variant="outline" onClick={goToday} style={{ marginLeft: 6 }}>Today</Btn>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Type filters */}
          <div style={{ display: "flex", gap: 5 }}>
            {Object.entries(CAL_TYPES).map(([k, t]) => {
              const on = filters.has(k);
              return (
                <button key={k} onClick={() => toggleFilter(k)} style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px",
                  borderRadius: 99, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
                  border: `1px solid ${on ? t.color : "var(--line)"}`,
                  background: on ? t.soft : "var(--paper)",
                  color: on ? t.color : "var(--text-3)"
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? t.color : "var(--line-2)" }} />
                  {t.label} <span style={{ opacity: 0.7 }}>{counts[k]}</span>
                </button>);

            })}
          </div>
          {/* View toggle */}
          <div style={{ display: "flex", padding: 2, background: "var(--paper-2)", borderRadius: 7, border: "1px solid var(--line)" }}>
            {["month", "agenda"].map((v) =>
            <button key={v} onClick={() => setView(v)} style={{
              padding: "5px 12px", borderRadius: 5, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: view === v ? 600 : 400, textTransform: "capitalize",
              background: view === v ? "var(--paper)" : "transparent",
              color: view === v ? "var(--text)" : "var(--text-3)",
              boxShadow: view === v ? "var(--shadow-sm)" : "none"
            }}>{v}</button>
            )}
          </div>
          <Btn size="sm" variant="outline" leading={<I.download size={12} />}
          onClick={() => {exportICS(shown, `${MONTHS[cursor.m]} ${cursor.y}`);toast && toast(`${shown.length} events exported to .ics`);}}>
            Export
          </Btn>
        </div>
      </div>

      {view === "month" ?
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
          <Card padding="0" style={{ overflow: "hidden" }}>
            {/* DOW header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--line)" }}>
              {DOW.map((d) =>
            <div key={d} style={{ padding: "9px 0", textAlign: "center", fontSize: 10.5, fontWeight: 600,
              color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{d}</div>
            )}
            </div>
            {/* Day grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "minmax(96px, 1fr)" }}>
              {grid.map((d, i) => {
              const ds = ymd(d);
              const inMonth = d.getMonth() === cursor.m;
              const isToday = ds === todayStr;
              const isSel = ds === selected;
              const dayEvents = byDay[ds] || [];
              return (
                <button key={i} onClick={() => setSelected(ds)} style={{
                  textAlign: "left", border: "none", cursor: "pointer",
                  borderRight: i % 7 !== 6 ? "1px solid var(--line-soft)" : "none",
                  borderBottom: i < 35 ? "1px solid var(--line-soft)" : "none",
                  background: isSel ? "var(--accent-soft)" : inMonth ? "var(--paper)" : "var(--paper-2)",
                  padding: "6px 7px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0,
                  outline: isSel ? "1px solid var(--accent)" : "none", outlineOffset: -1
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{
                      fontSize: 11.5, fontWeight: isToday ? 700 : 500,
                      color: !inMonth ? "var(--text-3)" : isToday ? "var(--paper)" : "var(--text)",
                      background: isToday ? "var(--accent)" : "transparent",
                      width: isToday ? 19 : "auto", height: isToday ? 19 : "auto", borderRadius: "50%",
                      display: "inline-flex", alignItems: "center", justifyContent: "center"
                    }}>{d.getDate()}</span>
                      {dayEvents.length > 0 &&
                    <span style={{ fontSize: 9.5, color: "var(--text-3)", fontWeight: 500 }}>{dayEvents.length}</span>
                    }
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      {dayEvents.slice(0, 3).map((e) => {
                      const t = CAL_TYPES[e.type];
                      return (
                        <div key={e.id} onClick={(ev) => {ev.stopPropagation();openEvent(e);}} title={e.title}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, minWidth: 0,
                          padding: "1px 5px", borderRadius: 4, background: t.soft,
                          borderLeft: `2px solid ${t.color}`, cursor: e.caseId ? "pointer" : "default"
                        }}>
                            {e.time && <span style={{ fontSize: 9, color: t.color, fontWeight: 600, flexShrink: 0 }}>{e.time}</span>}
                            <span style={{ fontSize: 10, color: "var(--text)", overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: e.done ? "line-through" : "none",
                            opacity: e.done ? 0.55 : 1 }}>{e.title}</span>
                          </div>);

                    })}
                      {dayEvents.length > 3 &&
                    <span style={{ fontSize: 9.5, color: "var(--text-3)", paddingLeft: 5 }}>+{dayEvents.length - 3} more</span>
                    }
                    </div>
                  </button>);

            })}
            </div>
          </Card>

          {/* Selected-day detail */}
          <DayDetail date={selected} items={byDay[selected] || []} openEvent={openEvent}
        canSchedule={["admin", "staff", "judge"].includes(session.role)}
        onSchedule={() => setModal({ type: "newBooking" })} />
        </div> :

      <Card padding="0">
          {agenda.length === 0 ?
        <Empty title="Nothing upcoming" body="No events match the current filters from today onward." /> :
        agenda.map(({ date, items }) => {
          const d = new Date(date);
          const isToday = date === todayStr;
          return (
            <div key={date} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "11px 18px 8px",
                position: "sticky", top: 0, background: "var(--paper)" }}>
                      <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: isToday ? "var(--accent)" : "var(--text)" }}>{d.getDate()}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{DOW[(d.getDay() + 6) % 7]}, {MONTHS[d.getMonth()]}{isToday && <span style={{ color: "var(--accent)", marginLeft: 6 }}>· Today</span>}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{items.length} event{items.length === 1 ? "" : "s"}</div>
                      </div>
                    </div>
                    <div style={{ padding: "0 14px 12px" }}>
                      {items.map((e) => <AgendaRow key={e.id} e={e} openEvent={openEvent} />)}
                    </div>
                  </div>);

        })}
        </Card>
      }
    </div>);

};

const DayDetail = ({ date, items, openEvent, canSchedule, onSchedule }) => {
  const d = new Date(date);
  const isToday = date === ymd(new Date());
  return (
    <Card padding="0" style={{ position: "sticky", top: 0 }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            {DOW[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}
            {isToday && <span style={{ color: "var(--accent)", marginLeft: 6, fontSize: 11.5 }}>Today</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{items.length} event{items.length === 1 ? "" : "s"}</div>
        </div>
        {canSchedule && <button onClick={onSchedule} title="Schedule hearing" style={navArrow}><I.plus size={15} /></button>}
      </div>
      <div style={{ maxHeight: 460, overflowY: "auto", padding: items.length ? "8px" : 0 }}>
        {items.length === 0 ?
        <div style={{ padding: "36px 18px", textAlign: "center", color: "var(--text-3)", fontSize: 12.5 }}>Nothing scheduled.</div> :
        items.map((e) => <AgendaRow key={e.id} e={e} openEvent={openEvent} compact />)}
      </div>
    </Card>);

};

const AgendaRow = ({ e, openEvent, compact }) => {
  const t = CAL_TYPES[e.type];
  return (
    <button onClick={() => openEvent(e)} disabled={!e.caseId} style={{
      width: "100%", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
      padding: compact ? "9px 9px" : "9px 4px", marginBottom: 2, borderRadius: 7, border: "none",
      background: "transparent", cursor: e.caseId ? "pointer" : "default"
    }}
    onMouseEnter={(ev) => {if (e.caseId) ev.currentTarget.style.background = "var(--paper-2)";}}
    onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}>
      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: t.color, flexShrink: 0, minHeight: 34 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
          <span style={{ fontSize: 9.5, fontWeight: 600, color: t.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t.label.replace(/s$/, "")}</span>
          {e.time && <span className="mono" style={{ fontSize: 10.5, color: "var(--text-2)" }}>{e.time}{e.endTime ? `–${e.endTime}` : ""}</span>}
          {e.priority && <Pill label={e.priority} size="xs" />}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35,
          textDecoration: e.done ? "line-through" : "none", opacity: e.done ? 0.6 : 1 }}>{e.title}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{e.sub}</div>
      </div>
      {e.caseId && <I.arrowR size={13} stroke="var(--text-3)" style={{ marginTop: 4, flexShrink: 0 }} />}
    </button>);

};

const navArrow = {
  width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center",
  border: "1px solid var(--line)", borderRadius: 7, background: "var(--paper)",
  color: "var(--text-2)", cursor: "pointer"
};

// Export shown events to an .ics file (RFC 5545) so they sync to any calendar app
function exportICS(events, label) {
  const pad = (n) => String(n).padStart(2, "0");
  const toICSDate = (dateStr, timeStr) => {
    const [Y, M, D] = dateStr.split("-").map(Number);
    if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
      const [h, mi] = timeStr.split(":").map(Number);
      return { dt: `${Y}${pad(M)}${pad(D)}T${pad(h)}${pad(mi)}00`, allDay: false };
    }
    return { dt: `${Y}${pad(M)}${pad(D)}`, allDay: true };
  };
  const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//JusticeDesk//Calendar//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:JusticeDesk — ${esc(label)}`];
  events.forEach((e) => {
    const start = toICSDate(e.date, e.time);
    lines.push("BEGIN:VEVENT", `UID:${e.id}@justicedesk`, `DTSTAMP:${stamp}`);
    if (start.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${start.dt}`);
    } else {
      lines.push(`DTSTART:${start.dt}`);
      const end = e.endTime ? toICSDate(e.date, e.endTime) : null;
      if (end && !end.allDay) lines.push(`DTEND:${end.dt}`);
    }
    const typeLabel = (CAL_TYPES[e.type]?.label || "Event").replace(/s$/, "");
    lines.push(`SUMMARY:${esc(`[${typeLabel}] ${e.title}`)}`);
    if (e.sub) lines.push(`DESCRIPTION:${esc(e.sub + (e.caseId ? ` (${e.caseId})` : ""))}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;a.download = `justicedesk-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

window.CalendarPage = CalendarPage;