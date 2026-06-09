// ─── Dashboard ───────────────────────────────────────────────────────────────
// Role-aware AND user-customisable: the layout is a 12-column grid of widgets
// that each user can reorder, resize, recolour, and show/hide. See
// dashboard-custom.jsx for the customisation framework.

const COURT_HUE = {
  "Courtroom 1": { bar: "#1f3a3d", soft: "#e6ebe9" },
  "Courtroom 2": { bar: "#5a4a1f", soft: "#eee7d6" },
  "Courtroom 3": { bar: "#3a3a30", soft: "#e7e6df" },
};

const navBtnStyle = {
  width: 28, height: 28, borderRadius: 6,
  background: "transparent", border: "1px solid var(--line)",
  cursor: "pointer", color: "var(--text-2)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

// Shared card header for colourable widgets
const WidgetHeader = ({ title, hint, onMore, right }) => (
  <div style={{
    padding: "14px 18px", borderBottom: "1px solid var(--line)",
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, letterSpacing: "-0.005em" }}>{title}</div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 1 }}>{hint}</div>}
    </div>
    {right || (onMore && <button onClick={onMore} style={navBtnStyle}><I.arrowR size={13}/></button>)}
  </div>
);

// ── Reusable bits ───────────────────────────────────────────────────────────
const JudgeBucket = ({ label, hint, cases, goCase, tone = "neutral" }) => {
  const accentBg = tone === "accent" ? "var(--accent)" : tone === "judge" ? "#7a6a44" : "var(--text-2)";
  return (
    <div style={{
      background: "var(--paper)", border: "1px solid var(--line)",
      borderRadius: 10, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 10, minHeight: 174,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentBg }}/>
            <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em",
              textTransform: "uppercase", fontWeight: 500 }}>{label}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1 }}>
            {cases.length}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>{hint}</div>
        </div>
      </div>
      {cases.length === 0 && (
        <div style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic" }}>None right now.</div>
      )}
      {cases.slice(0, 3).map((c) => (
        <button key={c.id} onClick={() => goCase(c)} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          padding: "6px 0", background: "transparent", border: "none",
          borderTop: "1px solid var(--line-soft)",
          cursor: "pointer", textAlign: "left", color: "inherit",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", fontWeight: 500 }}>{c.title}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)" }} className="mono">{c.id}</div>
          </div>
          <I.arrowR size={11} stroke="var(--text-3)"/>
        </button>
      ))}
    </div>
  );
};

const QuickAction = ({ icon, label, onClick, tone }) => {
  const accent = tone === "accent";
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px",
      background: accent ? "var(--accent-soft)" : "var(--paper)",
      border: `1px solid ${accent ? "var(--accent-line)" : "var(--line)"}`,
      borderRadius: 7, fontSize: 12.5, fontWeight: 500,
      color: accent ? "var(--accent-strong)" : "var(--text)", cursor: "pointer",
      transition: "background 120ms ease, border-color 120ms ease",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = accent ? "var(--accent-soft-hover, var(--accent-soft))" : "var(--paper-3)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = accent ? "var(--accent-soft)" : "var(--paper)"; }}>
      {icon}<span>{label}</span>
    </button>
  );
};

const Stat = ({ value, label, hint, sub, onClick }) => (
  <button onClick={onClick} style={{
    background: "var(--paper)", border: "1px solid var(--line)",
    borderRadius: 10, padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 4,
    cursor: onClick ? "pointer" : "default", textAlign: "left", font: "inherit", color: "inherit",
    transition: "background .12s, border-color .12s",
  }}
  onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = "var(--line-2)"; }}
  onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = "var(--line)"; }}>
    <div style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
      {label}
      {onClick && <I.arrowR size={10} stroke="var(--text-3)" style={{ marginLeft: "auto", opacity: 0.5 }}/>}
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{hint}</div>}
    </div>
    {sub && <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{sub}</div>}
  </button>
);

const SparkBar = ({ data, height = 28 }) => {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ width: 6, flexShrink: 0,
          height: `${Math.max(2, (v / max) * height)}px`,
          background: i === data.length - 1 ? "var(--ink)" : "var(--line-2)", borderRadius: 1 }}/>
      ))}
    </div>
  );
};

// ── Widget: Greeting (bare) ──────────────────────────────────────────────────
const GreetingWidget = ({ ctx }) => {
  const { role, firstName, buckets, cases, openTasks } = ctx;
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4, fontWeight: 500 }}>
        {role === "admin" && "Registry · Court is in session"}
        {role === "judge" && "Bench · Court is in session"}
        {role === "staff" && "Registry — your section"}
        {role === "lawyer" && "Counsel · your appearances"}
        {role === "party" && "Your matters"}
        {role === "rep" && "Matters you represent"}
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
        {role === "admin" && `Welcome back, ${firstName}.`}
        {role === "judge" && `Good morning, ${firstName} J.`}
        {(role === "staff" || role === "lawyer") && `Welcome, ${firstName}.`}
        {(role === "party" || role === "rep") && `Hello, ${firstName}.`}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 4 }}>
        {role === "judge" && <>You're presiding on <b style={{ color: "var(--text)" }}>{buckets.presiding.length}</b> matter{buckets.presiding.length === 1 ? "" : "s"}, sitting on <b style={{ color: "var(--text)" }}>{buckets.sitting.length}</b>, and your section has <b style={{ color: "var(--text)" }}>{buckets.section.length}</b> more on the roll.</>}
        {role === "admin" && <>{cases.length} matters on the roll. {openTasks} open tasks across active matters.</>}
        {role === "staff" && <>{cases.length} matter{cases.length === 1 ? "" : "s"} routed to your section. {openTasks} open tasks.</>}
        {role === "lawyer" && <>You have appearances on {cases.length} matter{cases.length === 1 ? "" : "s"}.</>}
        {(role === "party" || role === "rep") && <>{cases.length} matter{cases.length === 1 ? "" : "s"} on file.</>}
      </div>
    </div>
  );
};

// ── Widget: Quick actions (bare) ─────────────────────────────────────────────
const QuickActionsWidget = ({ ctx }) => {
  const { role, setModal, setAiOpen } = ctx;
  if (!setModal) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {role === "admin" && <QuickAction icon={<I.cases size={13}/>} label="New case" onClick={() => setModal("newCase")}/>}
      {(role === "admin" || role === "judge" || role === "staff") && <QuickAction icon={<I.check size={13}/>} label="New task" onClick={() => setModal("newTask")}/>}
      {(role === "admin" || role === "staff") && <QuickAction icon={<I.court size={13}/>} label="Schedule hearing" onClick={() => setModal("newBooking")}/>}
      {(role === "admin" || role === "judge" || role === "staff") && <QuickAction icon={<I.doc size={13}/>} label="Issue summons" onClick={() => setModal({ type: "pickTemplate", filterCategory: "Summons" })}/>}
      {(role === "admin" || role === "judge") && <QuickAction icon={<I.doc size={13}/>} label="Stay order" onClick={() => setModal({ type: "pickTemplate", filterCategory: "Order", filterName: "Stay" })}/>}
      {role === "admin" && <QuickAction icon={<I.target size={13}/>} label="New target" onClick={() => setModal("newTarget")}/>}
      {role === "lawyer" && <QuickAction icon={<I.doc size={13}/>} label="File request" onClick={() => setModal("newRequest")}/>}
      {setAiOpen && <QuickAction icon={<I.sparkle size={13}/>} label="Ask the registry advisor" tone="accent" onClick={() => setAiOpen(true)}/>}
    </div>
  );
};

// ── Widget: Judge buckets (bare) ─────────────────────────────────────────────
const JudgeBucketsWidget = ({ ctx }) => {
  const { buckets, goCase } = ctx;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      <JudgeBucket label="Presiding" tone="accent" cases={buckets.presiding} goCase={goCase} hint="You're the lead judge"/>
      <JudgeBucket label="Sitting" tone="judge" cases={buckets.sitting} goCase={goCase} hint="On the panel"/>
      <JudgeBucket label="Section" tone="neutral" cases={buckets.section} goCase={goCase} hint="Your section's roll"/>
    </div>
  );
};

// ── Widget: Stats row (bare) ─────────────────────────────────────────────────
const StatsWidget = ({ ctx }) => {
  const { active, pending, openTasks, totalTasks, bookings, weekStart, setPage } = ctx;
  const thisWeek = bookings.filter((b) => {
    const bd = new Date(b.date), ws = new Date(weekStart);
    return bd >= ws && bd < addDays(ws, 7) && b.status !== "Cancelled";
  }).length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
      <Stat label="Active" value={active} sub={`${ctx.cases.length} total on roll`} onClick={() => setPage("cases")}/>
      <Stat label="Pending" value={pending} sub="awaiting registration" onClick={() => setPage("cases")}/>
      <Stat label="Open tasks" value={openTasks} sub={`${totalTasks.length - openTasks} completed`} onClick={() => setPage("tasks")}/>
      <Stat label="This week" value={thisWeek} sub="hearings scheduled" onClick={() => setPage("courtrooms")}/>
    </div>
  );
};

// ── Widget: Cause list (colourable) ──────────────────────────────────────────
const CauseListWidget = ({ ctx }) => {
  const { cases, goCase, setPage } = ctx;
  return (
    <>
      <WidgetHeader title="Cause list" hint="Most recently active matters"
        right={<button onClick={() => setPage("cases")} style={{
          fontSize: 12, color: "var(--text-2)", background: "transparent", border: "1px solid var(--line)",
          borderRadius: 6, padding: "5px 11px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>All cases <I.arrowR size={12}/></button>}/>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--paper-2)" }}>
              {["Case", "Bench", "Type", "Status", "Tasks", "Filed"].map((h) => (
                <th key={h} style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 500, textAlign: "left",
                  padding: "8px 18px", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--line)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.slice(0, 5).map((c) => {
              const done = c.tasks.filter((t) => t.done).length;
              const pct = c.tasks.length ? Math.round(done / c.tasks.length * 100) : 0;
              return (
                <tr key={c.id} onClick={() => goCase(c)} style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "13px 18px", borderBottom: "1px solid var(--line-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-3)", minWidth: 78 }}>{c.id}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "13px 18px", borderBottom: "1px solid var(--line-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {c.judges.slice(0, 3).map((j, i) => (
                        <div key={j} style={{ marginLeft: i ? -7 : 0, border: "2px solid var(--paper)", borderRadius: 6 }}>
                          <Avatar name={j} size={22} tone="judge"/>
                        </div>
                      ))}
                      {c.judges.length > 3 && (
                        <div style={{ marginLeft: -7, border: "2px solid var(--paper)", borderRadius: 6, width: 22, height: 22,
                          background: "var(--paper-3)", color: "var(--text-2)", fontSize: 9.5, fontWeight: 500,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>+{c.judges.length - 3}</div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "13px 18px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{c.type}</td>
                  <td style={{ padding: "13px 18px", borderBottom: "1px solid var(--line-soft)" }}><Pill label={c.status} dot/></td>
                  <td style={{ padding: "13px 18px", borderBottom: "1px solid var(--line-soft)" }}>
                    {c.tasks.length === 0 ? <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>—</span> : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 4, background: "var(--paper-3)", borderRadius: 2 }}>
                          <div style={{ width: `${pct}%`, height: 4, background: pct === 100 ? "var(--success)" : "var(--ink)", borderRadius: 2 }}/>
                        </div>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-2)" }}>{done}/{c.tasks.length}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "13px 18px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-3)" }}>{c.filed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ── Widget: Targets (colourable) ─────────────────────────────────────────────
const TargetsWidget = ({ ctx }) => {
  const { targets, setPage } = ctx;
  return (
    <>
      <WidgetHeader title="Targets" hint="Quarter-to-date" onMore={() => setPage("targets")}/>
      <div style={{ padding: "6px 18px 14px" }}>
        {targets.slice(0, 4).map((t) => {
          const pct = Math.min(100, Math.round((t.current / t.metric) * 100));
          return (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "10px 0",
              borderTop: "1px solid var(--line-soft)", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 5 }}>{t.description}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: "var(--paper-3)", borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: 4, borderRadius: 2,
                      background: pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--ink)" : "var(--warn)" }}/>
                  </div>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", minWidth: 32, textAlign: "right" }}>{t.current}/{t.metric}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 36 }}>
                <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.02em" }}>{pct}%</div>
              </div>
            </div>
          );
        })}
        {targets.length === 0 && <div style={{ padding: "16px 0", fontSize: 12, color: "var(--text-3)" }}>No targets set.</div>}
      </div>
    </>
  );
};

// ── Widget: Hearings completed (colourable) ──────────────────────────────────
const HearingsWidget = ({ ctx }) => {
  const { setPage } = ctx;
  return (
    <>
      <WidgetHeader title="Hearings completed" hint="Last 14 days" onMore={() => setPage("courtrooms")}/>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>38</div>
          <Pill label="+12% wow" tone="Active" size="xs"/>
        </div>
        <SparkBar data={[3,4,2,5,3,4,6,5,4,5,7,6,5,8]} height={42}/>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-3)", marginTop: 8 }}>
          <span>Apr 15</span><span>Apr 28</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
          {[["Adjourned","9","var(--warn)"],["Completed","26","var(--success)"],["Reserved","3","var(--accent)"]].map(([l, v, c]) => (
            <div key={l}>
              <div style={{ fontSize: 16, fontWeight: 500, color: c }}>{v}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ── Widget: Schedule (colourable, stateful) ──────────────────────────────────
const ScheduleWidget = ({ ctx }) => {
  const { bookings, cases, goCase, setPage, todayStr } = ctx;
  const [schedDate, setSchedDate] = React.useState(todayStr);
  const [weekStart, setWeekStart] = React.useState(() => { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); return d; });
  const weekDates = Array.from({ length: 7 }, (_, i) => fmt(addDays(weekStart, i)));
  const dayBookings = bookings.filter((b) => b.date === schedDate && b.status !== "Cancelled").sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  const SCHED_HOURS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"];
  return (
    <>
      <WidgetHeader title="Today's bench" hint={`${dayBookings.length} hearing${dayBookings.length !== 1 ? "s" : ""} listed`}
        right={<div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setWeekStart((p) => addDays(p, -7))} style={navBtnStyle}><I.chevronL size={13}/></button>
          <button onClick={() => setWeekStart((p) => addDays(p, 7))} style={navBtnStyle}><I.chevronR size={13}/></button>
        </div>}/>
      <div style={{ padding: "12px 14px 6px", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {weekDates.map((d) => {
          const dt = new Date(d + "T00:00:00");
          const isToday = d === todayStr, isSel = d === schedDate;
          const has = bookings.some((b) => b.date === d && b.status !== "Cancelled");
          return (
            <button key={d} onClick={() => setSchedDate(d)} style={{
              padding: "8px 0", borderRadius: 6,
              border: isToday && !isSel ? "1px solid var(--line-2)" : "1px solid transparent",
              background: isSel ? "var(--ink)" : "transparent", color: isSel ? "var(--paper)" : "var(--text)",
              cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column", gap: 2, alignItems: "center",
            }}>
              <span style={{ fontSize: 9.5, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{WEEK_DAYS[dt.getDay()]}</span>
              <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.02em" }}>{dt.getDate()}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: has ? (isSel ? "var(--paper)" : "var(--ink)") : "transparent", opacity: has ? 0.7 : 0 }}/>
            </button>
          );
        })}
      </div>
      <div style={{ padding: "8px 14px 14px", maxHeight: 380, overflowY: "auto" }}>
        {SCHED_HOURS.map((slot) => {
          const ev = dayBookings.find((b) => b.timeStart === slot || (timeToMins(slot) > timeToMins(b.timeStart) && timeToMins(slot) < timeToMins(b.timeEnd)));
          const isStart = ev && ev.timeStart === slot;
          const hue = ev ? COURT_HUE[ev.courtroom] : null;
          return (
            <div key={slot} style={{ display: "flex", gap: 10, marginBottom: 4, alignItems: "stretch" }}>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", width: 36, flexShrink: 0, paddingTop: 8, textAlign: "right" }}>{slot}</div>
              {ev && isStart ? (
                <button onClick={() => { const linked = cases.find((c) => c.id === ev.caseId) || cases.find((c) => c.title === ev.caseTitle); if (linked) goCase(linked); else setPage("courtrooms"); }}
                  style={{ flex: 1, background: hue.soft, borderLeft: `2px solid ${hue.bar}`, borderRadius: "0 6px 6px 0",
                    borderTop: "none", borderRight: "none", borderBottom: "none", padding: "8px 12px", textAlign: "left", cursor: "pointer", color: "inherit" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3, lineHeight: 1.25 }}>{ev.caseTitle}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--text-2)" }}>
                    <span className="mono">{ev.timeStart}–{ev.timeEnd}</span><span>·</span><span>{ev.courtroom}</span>
                  </div>
                </button>
              ) : ev ? (
                <div style={{ flex: 1, height: 32, background: hue.soft, borderLeft: `2px solid ${hue.bar}`, opacity: 0.5 }}/>
              ) : (
                <div style={{ flex: 1, height: 32, borderTop: "1px dashed var(--line)", marginTop: 12 }}/>
              )}
            </div>
          );
        })}
        {dayBookings.length === 0 && <div style={{ padding: "1.5rem 0", textAlign: "center", fontSize: 12, color: "var(--text-3)" }}>Court not in session.</div>}
      </div>
    </>
  );
};

// ── Widget: Tasks (colourable) ───────────────────────────────────────────────
const TasksWidget = ({ ctx }) => {
  const { cases, setPage, goCase } = ctx;
  const todayMs = new Date(fmt(today)).getTime();
  const tasks = (cases || []).flatMap((c) => (c.tasks || []).filter((t) => !t.done).map((t) => ({ ...t, caseId: c.id, caseTitle: c.title, _case: c, dueMs: t.due ? new Date(t.due).getTime() : Infinity })))
    .sort((a, b) => a.dueMs - b.dueMs).slice(0, 5);
  const overdueCount = (cases || []).flatMap((c) => (c.tasks || [])).filter((t) => !t.done && t.due && new Date(t.due).getTime() < todayMs).length;
  const dueLabel = (dueMs) => {
    if (!isFinite(dueMs)) return { label: "no due", tone: "muted" };
    const days = Math.round((dueMs - todayMs) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: "danger" };
    if (days === 0) return { label: "due today", tone: "warn" };
    if (days === 1) return { label: "due tomorrow", tone: "warn" };
    if (days <= 7) return { label: `in ${days}d`, tone: "default" };
    return { label: new Date(dueMs).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), tone: "muted" };
  };
  const toneColor = { danger: "var(--danger)", warn: "var(--warn)", default: "var(--text-2)", muted: "var(--text-3)" };
  const priorityDot = { High: "var(--danger)", Medium: "var(--warn)", Low: "var(--text-3)" };
  return (
    <>
      <WidgetHeader title="Tasks" onMore={() => setPage("tasks")}
        hint={<>Next due{overdueCount > 0 && <> · <span style={{ color: "var(--danger)", fontWeight: 500 }}>{overdueCount} overdue</span></>}</>}/>
      <div style={{ padding: "4px 6px 8px" }}>
        {tasks.length === 0 && <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11.5, color: "var(--text-3)" }}>No open tasks. Nice.</div>}
        {tasks.map((t) => {
          const d = dueLabel(t.dueMs);
          return (
            <button key={`${t.caseId}-${t.id}`} onClick={() => goCase(t._case)} style={{
              width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", borderRadius: 6, cursor: "pointer",
              background: "transparent", border: "none", textAlign: "left", color: "inherit" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <span style={{ width: 14, height: 14, borderRadius: 4, marginTop: 2, border: "1.5px solid var(--line-2)", flexShrink: 0, background: "var(--paper)" }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  {t.priority && <span style={{ width: 5, height: 5, borderRadius: "50%", background: priorityDot[t.priority] || "var(--text-3)" }}/>}
                  <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</div>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span className="mono">{t.caseId}</span> · {t.caseTitle} · {t.assignee || "Unassigned"}
                </div>
              </div>
              <span style={{ fontSize: 10.5, color: toneColor[d.tone], fontWeight: d.tone === "danger" || d.tone === "warn" ? 500 : 400, whiteSpace: "nowrap", paddingTop: 2 }}>{d.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

// ── Widget: Pending requests (colourable) ────────────────────────────────────
const RequestsWidget = ({ ctx }) => {
  const { cases, setPage, goCase } = ctx;
  const pending = cases.flatMap((c) => (c.requests || []).filter((r) => r.status === "Pending").map((r) => ({ ...r, caseId: c.id, caseTitle: c.title })));
  return (
    <>
      <WidgetHeader title="Pending requests" hint="Awaiting registrar review" onMore={() => setPage("requests")}/>
      <div style={{ padding: "4px 6px 8px" }}>
        {pending.slice(0, 4).map((r) => (
          <button key={r.caseId + r.id} onClick={() => { const linked = cases.find((c) => c.id === r.caseId); if (linked) goCase(linked); else setPage("requests"); }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, cursor: "pointer", display: "flex", gap: 10, alignItems: "center",
              background: "transparent", border: "none", textAlign: "left", color: "inherit" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <Pill label={r.type} size="xs"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.caseTitle}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>Filed by {r.filedBy} · {r.submittedAt}</div>
            </div>
            <I.arrowR size={11} stroke="var(--text-3)"/>
          </button>
        ))}
        {pending.length === 0 && <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11.5, color: "var(--text-3)" }}>No pending requests.</div>}
      </div>
    </>
  );
};

// ── Widget registry (role-filtered) ──────────────────────────────────────────
function buildWidgetDefs(role) {
  const all = [
    { id: "greeting",     title: "Greeting",          bare: true,  colorable: false, defaultSpan: "full",      roles: ["admin","judge","staff","lawyer","party","rep"], render: (ctx) => <GreetingWidget ctx={ctx}/> },
    { id: "quickActions", title: "Quick actions",     bare: true,  colorable: false, defaultSpan: "full",      roles: ["admin","judge","staff","lawyer"], render: (ctx) => <QuickActionsWidget ctx={ctx}/> },
    { id: "judgeBuckets", title: "Your caseload",     bare: true,  colorable: false, defaultSpan: "full",      roles: ["judge"], render: (ctx) => <JudgeBucketsWidget ctx={ctx}/> },
    { id: "stats",        title: "Key figures",       bare: true,  colorable: false, defaultSpan: "full",      roles: ["admin","judge","staff","lawyer","party","rep"], render: (ctx) => <StatsWidget ctx={ctx}/> },
    { id: "causeList",    title: "Cause list",        bare: false, colorable: true,  defaultSpan: "twothirds", roles: ["admin","judge","staff","lawyer","party","rep"], render: (ctx) => <CauseListWidget ctx={ctx}/> },
    { id: "schedule",     title: "Today's bench",     bare: false, colorable: true,  defaultSpan: "third",     roles: ["admin","judge","staff"], render: (ctx) => <ScheduleWidget ctx={ctx}/> },
    { id: "targets",      title: "Targets",           bare: false, colorable: true,  defaultSpan: "half",      roles: ["admin","judge","staff"], render: (ctx) => <TargetsWidget ctx={ctx}/> },
    { id: "hearings",     title: "Hearings completed",bare: false, colorable: true,  defaultSpan: "half",      roles: ["admin","judge","staff"], render: (ctx) => <HearingsWidget ctx={ctx}/> },
    { id: "tasks",        title: "Tasks",             bare: false, colorable: true,  defaultSpan: "half",      roles: ["admin","judge","staff"], render: (ctx) => <TasksWidget ctx={ctx}/> },
    { id: "requests",     title: "Pending requests",  bare: false, colorable: true,  defaultSpan: "half",      roles: ["admin","judge","staff","lawyer","party","rep"], render: (ctx) => <RequestsWidget ctx={ctx}/> },
  ];
  return all.filter((d) => d.roles.includes(role));
}

// ── Dashboard page ───────────────────────────────────────────────────────────
const DashPage = ({ cases, targets, bookings, sections = [], setPage, goCase, setModal, setAiOpen }) => {
  const { session } = useAuth();
  const role = session?.role || "admin";
  const defs = React.useMemo(() => buildWidgetDefs(role), [role]);
  const [config, api] = useDashboardConfig(session, defs);
  const [customize, setCustomize] = React.useState(false);
  const [dragId, setDragId] = React.useState(null);

  const firstName = (session?.name || "").replace(/^Hon\.\s*/, "").split(" ")[0] || "there";
  const buckets = categoriseJudgeCases(session, cases, sections);
  const weekStart = (() => { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); return d; })();
  const totalTasks = cases.flatMap((c) => c.tasks);
  const ctx = {
    cases, targets, bookings, sections, role, session, firstName, buckets,
    setPage, goCase, setModal, setAiOpen,
    active: cases.filter((c) => c.status === "Active").length,
    pending: cases.filter((c) => c.status === "Pending").length,
    closed: cases.filter((c) => c.status === "Closed").length,
    totalTasks, openTasks: totalTasks.filter((t) => !t.done).length,
    weekStart, todayStr: fmt(today),
  };

  const defById = Object.fromEntries(defs.map((d) => [d.id, d]));
  const visibleIds = config.order.filter((id) => !config.hidden.includes(id) && defById[id]);
  const dragState = { dragId, setDragId, firstId: visibleIds[0], lastId: visibleIds[visibleIds.length - 1], gap: config.options.compact ? 12 : 20 };
  const gap = config.options.compact ? 12 : 20;

  return (
    <div>
      {/* Header bar with Customise toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn size="sm" variant={customize ? "primary" : "outline"}
          leading={<I.sparkle size={13}/>}
          onClick={() => setCustomize((v) => !v)}>
          {customize ? "Done customising" : "Customise"}
        </Btn>
      </div>

      {customize && <DashCustomizeBar config={config} api={api} onDone={() => setCustomize(false)}/>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap, alignItems: "start" }}>
        {visibleIds.map((id) => {
          const def = defById[id];
          const content = def.render(ctx);
          if (content == null) return null;
          return (
            <WidgetFrame key={id} def={def} config={config} api={api} customize={customize} dragState={dragState}>
              {content}
            </WidgetFrame>
          );
        })}
        {customize && <HiddenTray defs={defs} config={config} api={api}/>}
      </div>
    </div>
  );
};

window.DashPage = DashPage;
window.COURT_HUE = COURT_HUE;
