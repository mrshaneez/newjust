// ─── Cases list + detail ─────────────────────────────────────────────────────

const CasesPage = ({ cases, setCases, viewCase, setViewCase, updateCase, targets = [], bookings = [], setModal }) => {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [typeFilter, setTypeFilter] = React.useState("All");
  const [activeTab, setActiveTab] = React.useState("overview");
  const { session } = useAuth();
  const canDelete = session?.role === "admin";
  const toast = useToast();

  const deleteCase = (id) => {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    setCases((p) => p.filter((c) => c.id !== id));
    if (viewCase?.id === id) setViewCase(null);
    toast("Case deleted", "info");
  };

  const cs = viewCase ? cases.find(c => c.id === viewCase.id) : null;

  if (cs) return <CaseDetail cs={cs} cases={cases} updateCase={updateCase} targets={targets} bookings={bookings} setViewCase={setViewCase} setModal={setModal} activeTab={activeTab} setActiveTab={setActiveTab} canDelete={canDelete} deleteCase={deleteCase} />;

  // Status tabs & category options derived from the data so custom values appear
  const statusFilters = ["All", ...Array.from(new Set(cases.map((c) => c.status).filter(Boolean)))];
  const typeFilters = ["All", ...Array.from(new Set(cases.map((c) => c.type).filter(Boolean)))];

  const filtered = cases.filter(c =>
    (filter === "All" || c.status === filter) &&
    (typeFilter === "All" || c.type === typeFilter) &&
    (c.id.toLowerCase().includes(search.toLowerCase()) ||
     c.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>Cases</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            {cases.length} matters on the roll · {cases.filter(c => c.status === "Active").length} active
          </div>
        </div>
        <Btn variant="primary" onClick={() => setModal("newCase")} leading={<I.plus size={14}/>}>
          New case
        </Btn>
      </div>

      <Card padding={0}>
        <div style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <I.search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }}/>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by case ID or title…"
              style={{
                width: "100%", padding: "7px 11px 7px 32px",
                borderRadius: 6, border: "1px solid var(--line)",
                background: "var(--paper-2)", color: "var(--text)",
                fontSize: 13, outline: "none", boxSizing: "border-box",
              }}/>
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{
            padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)",
            background: "var(--paper-2)", color: typeFilter === "All" ? "var(--text-2)" : "var(--text)",
            fontSize: 12, cursor: "pointer", outline: "none",
          }}>
            {typeFilters.map((tp) => <option key={tp} value={tp}>{tp === "All" ? "All categories" : tp}</option>)}
          </select>
          <div style={{ display: "flex", gap: 2, padding: 2, background: "var(--paper-2)", borderRadius: 6, flexWrap: "wrap" }}>
            {statusFilters.map((s) => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: "5px 12px", borderRadius: 4,
                border: "none", background: filter === s ? "var(--paper)" : "transparent",
                color: filter === s ? "var(--text)" : "var(--text-2)",
                fontSize: 12, cursor: "pointer", fontWeight: filter === s ? 500 : 400,
                boxShadow: filter === s ? "var(--shadow-sm)" : "none",
              }}>{s}</button>
            ))}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--paper-2)" }}>
              {["Case", "Type", "Bench", "Status", "Filed", "Duration", ""].map((h) => (
                <th key={h} style={{
                  fontSize: 10.5, color: "var(--text-3)", fontWeight: 500,
                  textAlign: "left", padding: "9px 18px",
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  borderBottom: "1px solid var(--line)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}
                style={{ cursor: "pointer", transition: "background .1s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                onClick={() => setViewCase(c)}>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{c.title}</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)" }}>{c.id}</span>
                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {c.petitioner.name} {c.respondent ? `v. ${c.respondent.name}` : ""}
                      </span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)" }}>
                  <Tag>{c.type}</Tag>
                </td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={c.presiding} size={22} tone="judge"/>
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                      {c.presiding.replace("Hon. ", "")}
                      {c.judges.length > 1 && <span style={{ color: "var(--text-3)" }}> +{c.judges.length - 1}</span>}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)" }}>
                  <Pill label={c.status} dot/>
                </td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>
                  {c.filed}
                </td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", fontSize: 12 }}>
                  {(() => {
                    const days = Math.max(0, Math.floor((today - new Date(c.filed + "T00:00:00")) / 86400000));
                    const totalMonths = Math.floor(days / 30);
                    const yrs = Math.floor(totalMonths / 12);
                    const mos = totalMonths % 12;
                    const label = yrs >= 1
                      ? (mos > 0 ? `${yrs} yr ${mos} mo` : `${yrs} yr`)
                      : (totalMonths >= 1 ? `${totalMonths} mo` : `${days} d`);
                    const tone = c.status === "Closed" ? "var(--text-3)" : days > 180 ? "var(--danger)" : days > 90 ? "var(--warn)" : "var(--text-2)";
                    return <span className="mono" style={{ color: tone, fontSize: 11.5 }}>{label}</span>;
                  })()}
                </td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", textAlign: "right" }}
                    onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <button onClick={() => setModal({ type: "editCase", caseData: c })}
                      title="Edit case"
                      style={{
                        background: "transparent", border: "none", padding: 6, borderRadius: 4,
                        color: "var(--text-3)", cursor: "pointer", display: "inline-flex",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--paper-3)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}>
                      <I.edit size={13}/>
                    </button>
                    {canDelete && (
                      <button onClick={() => deleteCase(c.id)}
                        title="Delete case"
                        style={{
                          background: "transparent", border: "none", padding: 6, borderRadius: 4,
                          color: "var(--text-3)", cursor: "pointer", display: "inline-flex",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--paper-3)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}>
                        <I.trash size={13}/>
                      </button>
                    )}
                    <I.chevronR size={14} stroke="var(--text-3)" style={{ marginLeft: 4 }}/>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <Empty title="No matching cases" body="Try a different search or filter"/>}
      </Card>
    </div>
  );
};

const CaseDetail = ({ cs, cases = [], updateCase, targets = [], bookings = [], setViewCase, setModal, activeTab, setActiveTab, canDelete, deleteCase }) => {
  const done = cs.tasks.filter(t => t.done).length;
  const allLawyers = [...cs.petitioner.lawyers, ...(cs.respondent?.lawyers || [])];
  // Tasks linked to this case from other cases
  const linkedTasks = (cases || []).flatMap((c) => c.id === cs.id ? []
    : (c.tasks || []).filter((t) => (t.linkedCases || []).includes(cs.id))
        .map((t) => ({ ...t, _ownerId: c.id, _ownerTitle: c.title })));
  // Targets linked to this case; bookings (scheduled sittings) for this case
  const caseTargets = (targets || []).filter((t) => (t.caseIds || []).includes(cs.id));
  const caseBookings = (bookings || []).filter((b) => b.caseId === cs.id);
  const scheduleCount = caseBookings.length + (cs.hearings || []).length;
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "tasks",    label: `Tasks · ${cs.tasks.length + linkedTasks.length}` },
    { id: "hearings", label: `Hearings · ${scheduleCount}` },
    { id: "targets",  label: `Targets · ${caseTargets.length}` },
    { id: "bench",    label: `Bench · ${cs.judges.length}` },
    { id: "requests", label: `Requests · ${(cs.requests || []).length}` },
    { id: "files",    label: `Files · ${(cs.files || []).length}` },
    { id: "timeline", label: "Timeline" },
  ];

  return (
    <div>
      <button onClick={() => setViewCase(null)} style={{
        fontSize: 12, color: "var(--text-2)",
        background: "transparent", border: "none", cursor: "pointer",
        padding: 0, marginBottom: 14,
        display: "inline-flex", alignItems: "center", gap: 4,
      }}>
        <I.chevronL size={13}/> Back to cases
      </button>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--text-3)", letterSpacing: "0.02em" }}>{cs.id}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>·</span>
              <Tag>{cs.type}</Tag>
              <Pill label={cs.status} dot/>
            </div>
            <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: 8 }}>
              {cs.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 720 }}>
              {cs.summary}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <Btn variant="outline" onClick={() => setModal({ type: "editCase", caseData: cs })}
                 leading={<I.edit size={13}/>}>
              Edit
            </Btn>
            {canDelete && (
              <Btn variant="outline" onClick={() => deleteCase(cs.id)}
                   leading={<I.trash size={13}/>}
                   style={{ color: "var(--danger)" }}>
                Delete
              </Btn>
            )}
            <Btn variant="outline" onClick={() => setModal({ type: "newBooking", caseId: cs.id })}
                 leading={<I.court size={13}/>}>
              Schedule hearing
            </Btn>
            <Btn variant="outline" onClick={() => setModal({ type: "newRequest", caseData: cs })}>
              File request
            </Btn>
            <Btn variant="outline" onClick={() => setModal({ type: "pickTemplate", caseId: cs.id })}
                 leading={<I.doc size={13}/>}>
              Generate document
            </Btn>
            <Btn variant="primary" onClick={() => setModal({ type: "newTask", caseData: cs })}
                 leading={<I.plus size={13}/>}>
              Add task
            </Btn>
          </div>
        </div>

        {/* Meta grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          // duration cell — color tells age band at a glance
          background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10,
          overflow: "hidden",
        }}>
          {[
            // ordering: filing meta first, parties next
            ["Filed", cs.filed],
            ["Duration", (() => {
              const days = Math.max(0, Math.floor((today - new Date(cs.filed + "T00:00:00")) / 86400000));
              const totalMonths = Math.floor(days / 30);
              const yrs = Math.floor(totalMonths / 12);
              const mos = totalMonths % 12;
              if (yrs >= 1) return mos > 0 ? `${yrs} yr ${mos} mo` : `${yrs} yr`;
              if (totalMonths >= 1) return `${totalMonths} mo`;
              return `${days} d`;
            })()],
            ["Petitioner", cs.petitioner.name],
            ["Presiding", cs.presiding.replace("Hon. ", "")],
          ].map(([k, v], i) => (
            <div key={k} style={{
              padding: "12px 16px",
              borderRight: i < 3 ? "1px solid var(--line)" : "none",
            }}>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 500, marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, letterSpacing: "-0.005em" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 16, gap: 0 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "10px 16px", border: "none", background: "transparent",
            fontSize: 12.5, cursor: "pointer",
            color: activeTab === t.id ? "var(--text)" : "var(--text-2)",
            fontWeight: activeTab === t.id ? 500 : 400,
            borderBottom: activeTab === t.id ? "2px solid var(--ink)" : "2px solid transparent",
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === "overview" && <CaseOverview cs={cs} bookings={caseBookings} targets={caseTargets} setActiveTab={setActiveTab}/>}
      {activeTab === "tasks" && <CaseTasks cs={cs} cases={cases} linkedTasks={linkedTasks} updateCase={updateCase} setModal={setModal} setViewCase={setViewCase}/>}
      {activeTab === "hearings" && <CaseHearings cs={cs} bookings={caseBookings} setModal={setModal}/>}
      {activeTab === "targets" && <CaseTargets cs={cs} targets={caseTargets} setModal={setModal}/>}
      {activeTab === "bench" && <CaseBench cs={cs}/>}
      {activeTab === "requests" && <CaseRequests cs={cs}/>}
      {activeTab === "files" && <CaseFiles cs={cs} updateCase={updateCase}/>}
      {activeTab === "timeline" && <CaseTimeline cs={cs} bookings={caseBookings} targets={caseTargets}/>}
    </div>
  );
};

const CaseOverview = ({ cs, bookings = [], targets = [], setActiveTab }) => {
  const open = cs.tasks.filter(t => !t.done);
  const lastHearing = (cs.hearings || []).slice(-1)[0];
  const events = caseTimelineEvents(cs, bookings, targets);
  const recent = events.slice(0, 5);
  const upcoming = events.filter((e) => e.ts > Date.now()).sort((a, b) => a.ts - b.ts);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card padding="18px">
          <SectionTitle hint={`${cs.tasks.length - open.length} of ${cs.tasks.length} done`}
            action={<button onClick={() => setActiveTab("tasks")} style={navBtnStyle}><I.arrowR size={13}/></button>}>
            Open tasks
          </SectionTitle>
          {open.length === 0 ? <Empty title="All caught up" body="Every task on this matter is closed."/>
            : open.slice(0, 4).map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line-soft)", alignItems: "center" }}>
                <div style={{ width: 14, height: 14, border: "1.5px solid var(--line-2)", borderRadius: 3, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 1 }}>{t.text}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {t.assignee} · due {t.due}
                  </div>
                </div>
                <Pill label={t.priority || "Medium"} size="xs"/>
              </div>
            ))}
        </Card>

        <Card padding="18px">
          <SectionTitle hint="Most recent first"
            action={<button onClick={() => setActiveTab("timeline")} style={navBtnStyle}><I.arrowR size={13}/></button>}>
            Recent activity
          </SectionTitle>
          {recent.length === 0 ? <Empty title="No activity yet"/>
            : recent.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "1px solid var(--line-soft)" }}>
              <div style={{ color: e.color, marginTop: 1, flexShrink: 0 }}>{e.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{e.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 1 }}>{e.detail}</div>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", whiteSpace: "nowrap" }}>{e.when}</div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {upcoming.length > 0 && (
          <Card padding="18px">
            <SectionTitle action={<button onClick={() => setActiveTab("hearings")} style={navBtnStyle}><I.arrowR size={13}/></button>}>
              Upcoming
            </SectionTitle>
            {upcoming.slice(0, 4).map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line-soft)", alignItems: "flex-start" }}>
                <div style={{ color: e.color, marginTop: 1, flexShrink: 0 }}>{e.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{e.detail}</div>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-2)", whiteSpace: "nowrap" }}>{e.when}</div>
              </div>
            ))}
          </Card>
        )}

        {targets.length > 0 && (
          <Card padding="18px">
            <SectionTitle hint={`${targets.length} linked`}
              action={<button onClick={() => setActiveTab("targets")} style={navBtnStyle}><I.arrowR size={13}/></button>}>
              Targets
            </SectionTitle>
            {targets.slice(0, 3).map((t) => {
              const pct = Math.min(100, Math.round(((t.current || 0) / (t.metric || 1)) * 100));
              return (
                <div key={t.id} style={{ padding: "9px 0", borderTop: "1px solid var(--line-soft)" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>{t.description}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: "var(--paper-3)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }}/>
                    </div>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--text-2)" }}>{t.current || 0}/{t.metric}</span>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        <Card padding="18px">
          <SectionTitle>Bench</SectionTitle>
          {cs.judges.map((j) => (
            <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: "1px solid var(--line-soft)" }}>
              <Avatar name={j} size={28} tone="judge"/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{j.replace("Hon. ", "")}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>
                  {j === cs.presiding ? "Presiding" : "Coram"}
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card padding="18px">
          <SectionTitle>Counsel</SectionTitle>
          <div style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 500, marginTop: 8, marginBottom: 6 }}>Petitioner</div>
          {cs.petitioner.lawyers.map((l) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
              <Avatar name={l} size={24} tone="petitioner"/>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
          {cs.respondent && (
            <>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 500, marginTop: 12, marginBottom: 6 }}>Respondent</div>
              {cs.respondent.lawyers.map((l) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                  <Avatar name={l} size={24} tone="respondent"/>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </>
          )}
        </Card>

        {lastHearing && (
          <Card padding="18px">
            <SectionTitle>Last hearing</SectionTitle>
            <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 4 }}>{lastHearing.date}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 2 }}>{lastHearing.court}</div>
            <div style={{ marginTop: 8 }}><Pill label={lastHearing.outcome}/></div>
            {lastHearing.notes && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>{lastHearing.notes}</div>}
          </Card>
        )}
      </div>
    </div>
  );
};

const CaseTasks = ({ cs, cases = [], linkedTasks = [], updateCase, setModal, setViewCase }) => (
  <Card padding={0}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr style={{ background: "var(--paper-2)" }}>
        {["", "Task", "Assignee", "Priority", "Due", ""].map((h) => (
          <th key={h} style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 500, textAlign: "left", padding: "9px 14px", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--line)" }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {cs.tasks.length === 0 && linkedTasks.length === 0 && <tr><td colSpan={6}><Empty title="No tasks yet"/></td></tr>}
        {cs.tasks.map((t) => (
          <tr key={t.id}>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", width: 36 }}>
              <input type="checkbox" checked={t.done} onChange={() => updateCase(cs.id, c => ({...c, tasks: c.tasks.map(tk => tk.id === t.id ? {...tk, done: !tk.done} : tk)}))}
                style={{ cursor: "pointer", width: 14, height: 14, accentColor: "var(--ink)" }}/>
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{ fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-3)" : "var(--text)" }}>{t.text}</div>
              {(t.linkedCases || []).length > 0 && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>Also linked:</span>
                  <LinkedCaseChips ids={t.linkedCases} cases={cases} goCase={setViewCase ? (c) => setViewCase(c) : undefined} size="xs"/>
                </div>
              )}
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={t.assignee} size={22}/>
                <span style={{ fontSize: 12 }}>{t.assignee.replace("Hon. ", "")}</span>
              </div>
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}>
              <Pill label={t.priority || "Medium"} size="xs"/>
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{t.due}</td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", textAlign: "right" }}>
              <button onClick={() => setModal({ type: "newTask", caseData: cs, existing: t })}
                style={{ width: 26, height: 26, border: "1px solid var(--line)", borderRadius: 5, background: "var(--paper)", cursor: "pointer", color: "var(--text-2)" }}>
                <I.edit size={12}/>
              </button>
            </td>
          </tr>
        ))}
        {linkedTasks.length > 0 && (
          <tr><td colSpan={6} style={{ padding: "9px 14px", background: "var(--paper-2)",
            borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
            fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>
            Linked from other cases · {linkedTasks.length}
          </td></tr>
        )}
        {linkedTasks.map((t) => (
          <tr key={`${t._ownerId}-${t.id}`}>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", width: 36 }}>
              <input type="checkbox" checked={t.done}
                onChange={() => updateCase(t._ownerId, c => ({...c, tasks: c.tasks.map(tk => tk.id === t.id ? {...tk, done: !tk.done} : tk)}))}
                style={{ cursor: "pointer", width: 14, height: 14, accentColor: "var(--ink)" }}/>
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{ fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-3)" : "var(--text)" }}>{t.text}</div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>From:</span>
                <LinkedCaseChips ids={[t._ownerId]} cases={cases} goCase={setViewCase ? (c) => setViewCase(c) : undefined} size="xs"/>
              </div>
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={t.assignee} size={22}/>
                <span style={{ fontSize: 12 }}>{t.assignee.replace("Hon. ", "")}</span>
              </div>
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}>
              <Pill label={t.priority || "Medium"} size="xs"/>
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{t.due}</td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}></td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);

const CaseHearings = ({ cs, bookings = [], setModal }) => {
  const fmtTs = (d) => { const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; };
  const upcoming = [...bookings]
    .filter((b) => b.status !== "Cancelled")
    .sort((a, b) => fmtTs(a.date) - fmtTs(b.date));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card padding={0}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Scheduled sittings
            <span style={{ color: "var(--text-3)", marginLeft: 6 }}>{upcoming.length}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" variant="outline" leading={<I.doc size={12}/>}
              onClick={() => setModal({ type: "pickTemplate", filterCategory: "Summons", caseId: cs.id })}>Issue summons</Btn>
            <Btn size="sm" variant="primary" leading={<I.plus size={12}/>}
              onClick={() => setModal({ type: "newBooking", caseId: cs.id })}>Schedule hearing</Btn>
          </div>
        </div>
        {upcoming.length === 0
          ? <Empty title="Nothing scheduled" body="Schedule a sitting to reserve a courtroom for this matter."
              action={<Btn size="sm" variant="outline" leading={<I.court size={12}/>}
                onClick={() => setModal({ type: "newBooking", caseId: cs.id })}>Schedule hearing</Btn>}/>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "var(--paper-2)" }}>
                {["Date", "Time", "Courtroom", "Status", ""].map((h) => (
                  <th key={h} style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 500, textAlign: "left", padding: "9px 14px", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--line)" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {upcoming.map((b) => {
                  const future = fmtTs(b.date) >= new Date(new Date().toDateString()).getTime();
                  return (
                    <tr key={b.id}>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 13, fontWeight: 500 }}>
                        {b.date} {future && <Pill label="Upcoming" size="xs" tone="Scheduled" style={{ marginLeft: 6 }}/>}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{b.timeStart}–{b.timeEnd}</td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{b.courtroom}</td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}><Pill label={b.status || "Scheduled"} size="xs" dot/></td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                          <button onClick={() => setModal({ type: "pickTemplate", filterCategory: "Summons", caseId: cs.id, hearing: b })}
                            title="Issue summons for this sitting"
                            style={{ height: 26, padding: "0 9px", border: "1px solid var(--line)", borderRadius: 5, background: "var(--paper)", cursor: "pointer", color: "var(--text-2)", fontSize: 11.5, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}>
                            <I.doc size={12}/> Summons
                          </button>
                          <button onClick={() => setModal({ type: "editBooking", booking: b })}
                            title="Edit sitting"
                            style={{ width: 26, height: 26, border: "1px solid var(--line)", borderRadius: 5, background: "var(--paper)", cursor: "pointer", color: "var(--text-2)" }}>
                            <I.edit size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>}
      </Card>

      <Card padding={0}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, fontWeight: 500 }}>
          Hearing record
          <span style={{ color: "var(--text-3)", marginLeft: 6 }}>{(cs.hearings || []).length}</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "var(--paper-2)" }}>
            {["Date", "Courtroom", "Outcome", "Notes"].map((h) => (
              <th key={h} style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 500, textAlign: "left", padding: "9px 14px", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--line)" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(cs.hearings || []).length === 0 && <tr><td colSpan={4}><Empty title="No hearings recorded yet"/></td></tr>}
            {(cs.hearings || []).map((h, i) => (
              <tr key={i}>
                <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 13, fontWeight: 500 }}>{h.date}</td>
                <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{h.court || h.courtroom}</td>
                <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}><Pill label={h.outcome} dot/></td>
                <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{h.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ── Targets linked to this case ─────────────────────────────────────────────
const CaseTargets = ({ cs, targets = [], setModal }) => (
  <Card padding={0}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>Targets linked to this case
        <span style={{ color: "var(--text-3)", marginLeft: 6 }}>{targets.length}</span>
      </div>
      <Btn size="sm" variant="primary" leading={<I.plus size={12}/>}
        onClick={() => setModal({ type: "newTarget", caseId: cs.id })}>New target</Btn>
    </div>
    {targets.length === 0
      ? <Empty title="No targets for this case"
          body="Set a target — a measurable goal such as resolution by a deadline — and link it to this matter."
          action={<Btn size="sm" variant="outline" leading={<I.target size={12}/>}
            onClick={() => setModal({ type: "newTarget", caseId: cs.id })}>New target</Btn>}/>
      : <div style={{ padding: 14, display: "grid", gap: 10 }}>
          {targets.map((t) => {
            const pct = Math.min(100, Math.round(((t.current || 0) / (t.metric || 1)) * 100));
            const who = (typeof targetAssignees === "function" ? targetAssignees(t) : (t.assignee ? [t.assignee] : []));
            return (
              <div key={t.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "13px 15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <Tag>{t.type}</Tag>
                    <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 7 }}>{t.description}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 3 }}>
                      {who.length ? (who.length <= 2 ? who.join(", ") : `${who.length} assignees`) : "Unassigned"}
                      {t.deadline ? ` · due ${t.deadline}` : ""}
                    </div>
                  </div>
                  <button onClick={() => setModal({ type: "editTarget", target: t })}
                    style={{ width: 26, height: 26, border: "1px solid var(--line)", borderRadius: 5, background: "var(--paper)", cursor: "pointer", color: "var(--text-2)", flexShrink: 0 }}>
                    <I.edit size={12}/>
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <div style={{ flex: 1, height: 6, background: "var(--paper-3)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "var(--success)" : "var(--accent)" }}/>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-2)" }}>{t.current || 0}/{t.metric} · {pct}%</span>
                </div>
              </div>
            );
          })}
        </div>}
  </Card>
);

// ── Derived chronological timeline for a case ───────────────────────────────
function caseTimelineEvents(cs, bookings = [], targets = []) {
  const ev = [];
  const ts = (d) => { const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; };
  const push = (date, kind, title, detail, color, icon) => {
    if (!date) return;
    ev.push({ ts: ts(date), date, kind, title, detail, color, icon });
  };
  push(cs.filed, "filed", "Case registered", `${cs.type} · filed with the Registry`,
    "var(--accent)", <I.cases size={13}/>);
  (cs.hearings || []).forEach((h) =>
    push(h.date, "hearing", `Hearing — ${h.outcome || "sitting"}`,
      `${h.court || h.courtroom || ""}${h.notes ? " · " + h.notes : ""}`,
      "var(--text-2)", <I.court size={13}/>));
  (bookings || []).forEach((b) =>
    push(b.date, "schedule", b.status === "Cancelled" ? "Sitting cancelled" : "Hearing scheduled",
      `${b.courtroom} · ${b.timeStart}–${b.timeEnd}`,
      "var(--accent)", <I.calendar size={13}/>));
  (cs.tasks || []).forEach((t) =>
    push(t.due, t.done ? "task-done" : "task", t.done ? "Task completed" : "Task due",
      `${t.text} · ${t.assignee}`,
      t.done ? "var(--success)" : "var(--warn)", <I.check size={13}/>));
  (cs.requests || []).forEach((r) =>
    push(r.submittedAt, "request", `${r.type} request — ${r.status}`,
      `${r.reason || ""}${r.filedBy ? " · " + r.filedBy : ""}`,
      "var(--warn)", <I.inbox size={13}/>));
  (targets || []).forEach((t) =>
    push(t.deadline, "target", `Target — ${t.type}`,
      `${t.description} · ${t.current || 0}/${t.metric}`,
      "var(--accent)", <I.target size={13}/>));
  (cs.files || []).forEach((f) =>
    push(f.uploadedAt, "file", "Document filed",
      `${f.name}${f.category ? " · " + f.category : ""}${f.uploadedBy ? " · " + f.uploadedBy : ""}`,
      "var(--text-2)", <I.doc size={13}/>));

  const now = Date.now();
  const rel = (t) => {
    if (!t) return "";
    const diff = t - now, day = 86400000;
    const d = new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (Math.abs(diff) < day) return "Today";
    if (diff > 0 && diff < 7 * day) return `In ${Math.round(diff / day)}d`;
    return d;
  };
  ev.forEach((e) => { e.when = rel(e.ts); e.upcoming = e.ts > now; });
  return ev.sort((a, b) => b.ts - a.ts);
}

const CaseTimeline = ({ cs, bookings = [], targets = [] }) => {
  const events = caseTimelineEvents(cs, bookings, targets);
  const now = Date.now();
  const future = events.filter((e) => e.ts > now).sort((a, b) => a.ts - b.ts);
  const past = events.filter((e) => e.ts <= now);
  const Row = ({ e, last }) => (
    <div style={{ display: "flex", gap: 14, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", background: "var(--paper)",
          border: "1px solid var(--line)", display: "flex", alignItems: "center",
          justifyContent: "center", color: e.color, zIndex: 1,
        }}>{e.icon}</div>
        {!last && <div style={{ width: 1.5, flex: 1, background: "var(--line)", minHeight: 18 }}/>}
      </div>
      <div style={{ paddingBottom: 18, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</span>
          {e.upcoming && <Pill label="Upcoming" size="xs" tone="Scheduled"/>}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2, lineHeight: 1.5 }}>{e.detail}</div>
        <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 3 }}>
          {new Date(e.ts).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>
    </div>
  );
  if (events.length === 0) return <Card padding="18px"><Empty title="No timeline yet" body="Activity on this matter will appear here as it happens."/></Card>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: future.length ? "1fr 300px" : "1fr", gap: 16, alignItems: "start" }}>
      <Card padding="20px 20px 4px">
        <SectionTitle hint={`${events.length} event${events.length === 1 ? "" : "s"}`}>Case timeline</SectionTitle>
        <div style={{ marginTop: 10 }}>
          {events.map((e, i) => <Row key={i} e={e} last={i === events.length - 1}/>)}
        </div>
      </Card>
      {future.length > 0 && (
        <Card padding="18px">
          <SectionTitle hint="Next on the docket">Coming up</SectionTitle>
          <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
            {future.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
                <div style={{ color: e.color, marginTop: 1, flexShrink: 0 }}>{e.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{e.detail}</div>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-2)", whiteSpace: "nowrap" }}>{e.when}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const CaseBench = ({ cs }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
    {cs.judges.map((j) => (
      <Card key={j} padding="16px">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Avatar name={j} size={36} tone="judge"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{j.replace("Hon. ", "")}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>High Court Judge</div>
          </div>
        </div>
        {j === cs.presiding && <Pill label="Presiding" size="xs" tone="Confirmed"/>}
      </Card>
    ))}
  </div>
);

const CaseRequests = ({ cs }) => (
  <Card padding={0}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr style={{ background: "var(--paper-2)" }}>
        {["Type", "Reason", "Filed by", "Date", "Status"].map((h) => (
          <th key={h} style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 500, textAlign: "left", padding: "9px 14px", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--line)" }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {(cs.requests || []).length === 0 && <tr><td colSpan={5}><Empty title="No requests filed"/></td></tr>}
        {(cs.requests || []).map((r) => (
          <tr key={r.id}>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}><Pill label={r.type} size="xs"/></td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12 }}>{r.reason}</td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{r.filedBy}</td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-2)" }}>{r.submittedAt}</td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}><Pill label={r.status} dot/></td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);

window.CasesPage = CasesPage;

// ── Case Files — per-case document repository ───────────────────────────────
const FILE_CATEGORIES = ["Pleading", "Evidence", "Order", "Correspondence", "Submission", "Other"];
const fmtFileSize = (n) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const fileKind = (type, name) => {
  const t = (type || "").toLowerCase(), n = (name || "").toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.includes("pdf") || n.endsWith(".pdf")) return "pdf";
  if (t.includes("word") || /\.docx?$/.test(n)) return "doc";
  if (t.includes("sheet") || /\.xlsx?$|\.csv$/.test(n)) return "sheet";
  return "file";
};

const CaseFiles = ({ cs, updateCase }) => {
  const { session } = useAuth();
  const toast = useToast();
  const inputRef = React.useRef(null);
  const [hover, setHover] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [filter, setFilter] = React.useState("All");
  const [preview, setPreview] = React.useState(null);
  const canManage = ["admin", "judge", "staff"].includes(session?.role);
  const files = cs.files || [];

  const cats = ["All", ...FILE_CATEGORIES.filter((c) => files.some((f) => f.category === c))];
  const shown = filter === "All" ? files : files.filter((f) => f.category === filter);

  const addFiles = async (list) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setBusy(true);
    const read = (file) => new Promise((resolve) => {
      if (file.size > 8 * 1024 * 1024) { toast(`${file.name} is over 8MB and was skipped`, "warn"); resolve(null); return; }
      const fr = new FileReader();
      fr.onload = () => resolve({
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name, type: file.type || "application/octet-stream", size: file.size,
        dataUrl: fr.result, category: "Other",
        uploadedBy: session?.name || "—", uploadedAt: new Date().toISOString().slice(0, 10),
      });
      fr.onerror = () => { toast(`Couldn't read ${file.name}`, "warn"); resolve(null); };
      fr.readAsDataURL(file);
    });
    const results = (await Promise.all(arr.map(read))).filter(Boolean);
    if (results.length) {
      updateCase(cs.id, (c) => ({ ...c, files: [...(c.files || []), ...results] }));
      toast(`${results.length} file${results.length === 1 ? "" : "s"} added`, "success");
    }
    setBusy(false);
  };

  const setCategory = (id, category) =>
    updateCase(cs.id, (c) => ({ ...c, files: (c.files || []).map((f) => f.id === id ? { ...f, category } : f) }));
  const removeFile = (id) => {
    if (!confirm("Remove this file from the case record?")) return;
    updateCase(cs.id, (c) => ({ ...c, files: (c.files || []).filter((f) => f.id !== id) }));
    toast("File removed");
  };
  const download = (f) => {
    const a = document.createElement("a");
    a.href = f.dataUrl; a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const kindIcon = { image: "image", pdf: "doc", doc: "doc", sheet: "stats", file: "paperclip" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {canManage && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setHover(true); }}
          onDragLeave={() => setHover(false)}
          onDrop={(e) => { e.preventDefault(); setHover(false); addFiles(e.dataTransfer.files); }}
          style={{
            border: `1.5px dashed ${hover ? "var(--accent)" : "var(--line-2)"}`, borderRadius: 10,
            padding: "22px 20px", textAlign: "center", cursor: "pointer",
            background: hover ? "var(--accent-soft)" : "var(--paper-2)", transition: "all 120ms",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
          <I.upload size={16} stroke="var(--text-2)"/>
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
            {busy ? "Reading files…" : "Drop files here, or click to upload to this case"}
          </span>
          <input ref={inputRef} type="file" multiple hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}/>
        </div>
      )}

      {files.length === 0 ? (
        <Empty title="No documents on file"
          body={canManage ? "Upload pleadings, evidence, orders and correspondence to keep the case record in one place."
            : "No documents have been added to this case yet."}/>
      ) : (
        <Card padding={0}>
          {cats.length > 2 && (
            <div style={{ display: "flex", gap: 6, padding: "11px 14px", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              {cats.map((c) => (
                <button key={c} onClick={() => setFilter(c)} style={{
                  padding: "4px 11px", borderRadius: 99, fontSize: 11.5, cursor: "pointer", fontWeight: 500,
                  border: `1px solid ${filter === c ? "var(--ink)" : "var(--line)"}`,
                  background: filter === c ? "var(--ink)" : "var(--paper)",
                  color: filter === c ? "var(--paper)" : "var(--text-2)",
                }}>{c}</button>
              ))}
            </div>
          )}
          <div>
            {shown.map((f, i) => {
              const kind = fileKind(f.type, f.name);
              const isImg = kind === "image";
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                  borderBottom: i < shown.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
                  <div onClick={() => isImg && setPreview(f)} style={{
                    width: 38, height: 38, borderRadius: 7, flexShrink: 0, overflow: "hidden",
                    border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center",
                    background: isImg ? "var(--paper)" : "var(--paper-2)", color: "var(--text-3)",
                    cursor: isImg ? "zoom-in" : "default",
                  }}>
                    {isImg ? <img src={f.dataUrl} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                      : <I.doc size={16}/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {fmtFileSize(f.size)} · {f.uploadedBy} · {f.uploadedAt}
                    </div>
                  </div>
                  {canManage ? (
                    <select value={f.category} onChange={(e) => setCategory(f.id, e.target.value)} style={{
                      fontSize: 11.5, padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 6,
                      background: "var(--paper)", color: "var(--text-2)", cursor: "pointer",
                    }}>
                      {FILE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : <Pill label={f.category} size="xs"/>}
                  <button onClick={() => download(f)} title="Download" style={fileActionBtn}><I.download size={13}/></button>
                  {canManage && <button onClick={() => removeFile(f.id)} title="Remove" style={{ ...fileActionBtn, color: "var(--danger)" }}><I.trash size={13}/></button>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {preview && (
        <div onClick={() => setPreview(null)} style={{
          position: "fixed", inset: 0, background: "rgba(11,13,16,0.7)", zIndex: 9500,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 40, cursor: "zoom-out",
        }}>
          <img src={preview.dataUrl} alt={preview.name} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, boxShadow: "0 12px 48px rgba(0,0,0,0.4)" }}/>
        </div>
      )}
    </div>
  );
};

const fileActionBtn = {
  width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
  border: "1px solid var(--line)", borderRadius: 6, background: "var(--paper)",
  color: "var(--text-2)", cursor: "pointer", flexShrink: 0,
};

window.CaseFiles = CaseFiles;
