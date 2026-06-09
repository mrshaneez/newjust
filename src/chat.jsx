// ─── Chat / Messages ─────────────────────────────────────────────────────────
// Permission-aware internal messaging:
//   • Judges ↔ judges, judges ↔ staff, staff ↔ staff (court personnel)
//   • Parties / reps / lawyers ↔ the Registry (staff), scoped to their own cases
//   • Parties can NOT message judges, nor each other
// Any internal user can turn a message into a Task and export it to a case.

const CHAT_STORE = "jd_chat_threads_v1";

const isInternal = (role) => ["admin", "judge", "staff"].includes(role);
const isExternal = (role) => ["party", "rep", "lawyer"].includes(role);
const myKey = (s) => (s?.role === "admin" ? "admin" : s?.recordId || `name:${s?.name}`);
const roleWord = { admin: "Registry", judge: "Judge", staff: "Staff", lawyer: "Counsel", party: "Party", rep: "Representative" };

// ── Persistent global thread store (shared so you can switch users in-prototype)
function loadThreads() {
  try { return JSON.parse(localStorage.getItem(CHAT_STORE) || "[]"); } catch { return []; }
}
function saveThreads(t) {
  try { localStorage.setItem(CHAT_STORE, JSON.stringify(t)); } catch {}
}
function useChatThreads() {
  const [threads, setThreads] = React.useState(loadThreads);
  const set = React.useCallback((updater) => {
    setThreads((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveThreads(next);
      return next;
    });
  }, []);
  // Pick up writes from other surfaces (e.g. another tab / nav badge)
  React.useEffect(() => {
    const onStorage = (e) => { if (e.key === CHAT_STORE) setThreads(loadThreads()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return [threads, set];
}

// ── Per-user read state ──────────────────────────────────────────────────────
const readKey = (meKey) => `jd_chat_read_${String(meKey).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
function loadRead(meKey) { try { return JSON.parse(localStorage.getItem(readKey(meKey)) || "{}"); } catch { return {}; } }

// Last message + unread test
const lastMsg = (t) => t.messages[t.messages.length - 1] || null;
const threadUnread = (t, meKey, readMap) => {
  const lm = lastMsg(t);
  if (!lm || lm.senderKey === meKey) return false;
  return (t.updatedAt || 0) > (readMap[t.id] || 0);
};

// ── Case-visibility for the current session ──────────────────────────────────
function visibleCaseIds(session, cases, dirs) {
  try {
    const vc = window.visibleCases(session, cases, dirs.judges, dirs.staff, dirs.sections, dirs.accessGrants);
    return new Set(vc.map((c) => c.id));
  } catch { return new Set(cases.map((c) => c.id)); }
}

// Map a party NAME (as stored on a case) → directory record (id/role) if known
function partyRecordByName(name, parties, reps) {
  const p = (parties || []).find((x) => x.name === name);
  if (p) return { key: p.id, name: p.name, role: "party" };
  return { key: `name:${name}`, name, role: "party" };
}

// ── Who can the current user start a chat with? ──────────────────────────────
function buildContacts(session, dirs, cases) {
  const me = myKey(session);
  const role = session.role;
  const internalPeople = [
    ...(dirs.judges || []).map((j) => ({ key: j.id, name: j.name, role: "judge", sub: j.role || "Judge" })),
    ...(dirs.staff || []).map((s) => ({ key: s.id, name: s.name, role: "staff", sub: s.role || s.department || "Staff" })),
  ].filter((p) => p.key !== me);

  if (role === "judge") {
    // Judges talk to judges and staff only
    return { direct: internalPeople, parties: [], cases: [] };
  }
  if (role === "staff" || role === "admin") {
    // Court personnel: all internal + parties on cases they can see
    const seen = visibleCaseIds(session, cases, dirs);
    const partyContacts = [];
    const seenKeys = new Set();
    cases.filter((c) => seen.has(c.id)).forEach((c) => {
      const names = (typeof caseAllParties === "function" ? caseAllParties(c) : [c.petitioner?.name, c.respondent?.name].filter(Boolean));
      names.forEach((nm) => {
        const rec = partyRecordByName(nm, dirs.parties, dirs.representatives);
        const id = `case:${c.id}:${rec.key}`;
        if (seenKeys.has(id)) return;
        seenKeys.add(id);
        partyContacts.push({ caseId: c.id, caseTitle: c.title, party: rec });
      });
    });
    return { direct: internalPeople, parties: partyContacts, cases: [] };
  }
  // External: party / rep / lawyer → registry, scoped to own cases
  const myCases = cases.filter((c) => {
    try {
      return window.visibleCases(session, [c], dirs.judges, dirs.staff, dirs.sections, dirs.accessGrants).length > 0;
    } catch { return false; }
  });
  return { direct: [], parties: [], cases: myCases.map((c) => ({ caseId: c.id, caseTitle: c.title })) };
}

// Thread visible to the current user?
function threadVisible(t, session, seenIds) {
  const me = myKey(session);
  if (t.type === "direct") return t.members?.includes(me);
  // case thread: the external participant, or internal staff/admin who can see the case
  if (t.externalKey === me) return true;
  return (session.role === "staff" || session.role === "admin") && seenIds.has(t.caseId);
}

// Thread id builders
const directId = (a, b) => `direct:${[a, b].sort().join("~")}`;
const caseThreadId = (caseId, extKey) => `case:${caseId}:${extKey}`;

// ── Time formatting ──────────────────────────────────────────────────────────
const chatTime = (ts) => {
  const d = new Date(ts), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const diff = (now - d) / 86400000;
  if (diff < 7) return d.toLocaleDateString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

// Title + subtitle a thread shows to the current user
function threadHeading(t, session) {
  const me = myKey(session);
  if (t.type === "direct") {
    const other = t.a.key === me ? t.b : t.a;
    return { title: other.name, sub: roleWord[other.role] || other.role, who: other };
  }
  // case thread
  if (isInternal(session.role)) {
    return { title: t.externalName, sub: `${roleWord[t.externalRole] || "Party"} · ${t.caseId}`, who: { name: t.externalName, role: t.externalRole } };
  }
  return { title: "Court Registry", sub: t.caseId, who: { name: "Court Registry", role: "staff" } };
}

// ═══════════════════════════════════════════════════════════════════════════
const ChatPage = ({ cases, judges, staff, parties, representatives, lawyers, sections, accessGrants, updateCase, goCase }) => {
  const { session } = useAuth();
  const toast = useToast();
  const me = myKey(session);
  const dirs = { judges, staff, parties, representatives, lawyers, sections, accessGrants };
  const [threads, setThreads] = useChatThreads();
  const [readMap, setReadMap] = React.useState(() => loadRead(me));
  const [activeId, setActiveId] = React.useState(null);
  const [newChatOpen, setNewChatOpen] = React.useState(false);

  const seenIds = React.useMemo(() => visibleCaseIds(session, cases, dirs), [session, cases]);
  const myThreads = threads
    .filter((t) => threadVisible(t, session, seenIds))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const active = myThreads.find((t) => t.id === activeId) || null;

  // Mark active thread read
  React.useEffect(() => {
    if (!active) return;
    const lm = lastMsg(active);
    if (lm && (active.updatedAt || 0) > (readMap[active.id] || 0)) {
      const next = { ...readMap, [active.id]: Date.now() };
      setReadMap(next);
      try { localStorage.setItem(readKey(me), JSON.stringify(next)); } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.updatedAt]);

  const openOrCreate = (thread) => {
    setThreads((prev) => prev.some((t) => t.id === thread.id) ? prev : [...prev, thread]);
    setActiveId(thread.id);
    setNewChatOpen(false);
  };

  const startDirect = (contact) => {
    const id = directId(me, contact.key);
    const meRec = { key: me, name: session.name, role: session.role };
    openOrCreate({
      id, type: "direct",
      members: [me, contact.key],
      a: meRec, b: { key: contact.key, name: contact.name, role: contact.role },
      messages: [], createdAt: Date.now(), updatedAt: Date.now(),
    });
  };
  const startCaseThread = ({ caseId, caseTitle, party }) => {
    // party provided when staff/admin starts it; otherwise the external user is the party
    const ext = party || { key: me, name: session.name, role: session.role };
    openOrCreate({
      id: caseThreadId(caseId, ext.key), type: "case",
      caseId, caseTitle, externalKey: ext.key, externalName: ext.name, externalRole: ext.role,
      messages: [], createdAt: Date.now(), updatedAt: Date.now(),
    });
  };

  const sendMessage = (text) => {
    if (!active || !text.trim()) return;
    const msg = { id: `m-${Date.now()}`, senderKey: me, senderName: session.name, senderRole: session.role, text: text.trim(), ts: Date.now() };
    setThreads((prev) => prev.map((t) => t.id === active.id ? { ...t, messages: [...t.messages, msg], updatedAt: Date.now() } : t));
  };

  const exportTask = (msg, { caseId, assignee, priority, due }) => {
    if (!caseId) { toast("Pick a case for this task", "warn"); return; }
    updateCase(caseId, (c) => ({ ...c, tasks: [...(c.tasks || []), {
      id: Date.now(), text: msg.text, assignee, priority, due, done: false,
      linkedCases: [], source: "chat",
    }] }));
    // Mark the message as exported
    setThreads((prev) => prev.map((t) => t.id === active.id
      ? { ...t, messages: t.messages.map((m) => m.id === msg.id ? { ...m, task: { caseId, assignee, due } } : m) }
      : t));
    toast(`Task added to ${caseId}`, "success");
  };

  const contacts = React.useMemo(() => buildContacts(session, dirs, cases), [session, cases, judges, staff, parties]);
  const canCreateTask = isInternal(session.role);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "300px 1fr",
      height: "calc(100vh - 56px - 48px)", minHeight: 460,
      border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--paper)",
    }}>
      {/* Thread list */}
      <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", background: "var(--paper-2)", minWidth: 0 }}>
        <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 7 }}>
            <I.chat size={15} stroke="var(--accent)"/> Messages
          </div>
          <Btn size="sm" variant="primary" leading={<I.plus size={12}/>} onClick={() => setNewChatOpen(true)}>New</Btn>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {myThreads.length === 0 && (
            <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--text-3)", fontSize: 12.5 }}>
              No conversations yet.<br/>Click <strong style={{ color: "var(--text-2)" }}>New</strong> to start one.
            </div>
          )}
          {myThreads.map((t) => {
            const h = threadHeading(t, session);
            const lm = lastMsg(t);
            const unread = threadUnread(t, me, readMap) && t.id !== activeId;
            const isActive = t.id === activeId;
            return (
              <button key={t.id} onClick={() => setActiveId(t.id)} style={{
                width: "100%", textAlign: "left", display: "flex", gap: 10, alignItems: "center",
                padding: "9px 10px", marginBottom: 4, borderRadius: 8, cursor: "pointer",
                border: `1px solid ${isActive ? "var(--accent)" : "transparent"}`,
                background: isActive ? "var(--accent-soft)" : "transparent",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--paper-3)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <Avatar name={h.who.name} size={34} tone={h.who.role === "judge" ? "judge" : "neutral"}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: unread ? 600 : 500, flex: 1, minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</span>
                    {lm && <span style={{ fontSize: 10, color: "var(--text-3)", flexShrink: 0 }}>{chatTime(lm.ts)}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {t.type === "case" && <span style={{ fontSize: 9.5, color: "var(--accent)", background: "var(--accent-soft)", padding: "0px 5px", borderRadius: 99, fontWeight: 600, flexShrink: 0 }} className="mono">{t.caseId}</span>}
                    <span style={{ fontSize: 11, color: unread ? "var(--text)" : "var(--text-3)", flex: 1, minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: unread ? 500 : 400 }}>
                      {lm ? `${lm.senderKey === me ? "You: " : ""}${lm.text}` : h.sub}
                    </span>
                    {unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }}/>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      {active ? (
        <Conversation key={active.id} thread={active} session={session} me={me}
          onSend={sendMessage} canCreateTask={canCreateTask}
          cases={cases} seenIds={seenIds} dirs={dirs} onExportTask={exportTask} goCase={goCase}/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "var(--text-3)", padding: 24, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--paper-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.chat size={26} stroke="var(--text-3)"/>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-2)" }}>Your messages</div>
            <div style={{ fontSize: 12.5, marginTop: 3, maxWidth: 320 }}>
              {isExternal(session.role)
                ? "Message the Court Registry about your cases. Select a conversation or start a new one."
                : "Select a conversation, or start a new one with a colleague or party."}
            </div>
          </div>
          <Btn variant="primary" leading={<I.plus size={13}/>} onClick={() => setNewChatOpen(true)}>New conversation</Btn>
        </div>
      )}

      {newChatOpen && (
        <NewChatModal session={session} contacts={contacts}
          onStartDirect={startDirect} onStartCase={startCaseThread} onClose={() => setNewChatOpen(false)}/>
      )}
    </div>
  );
};

// ── Conversation pane ────────────────────────────────────────────────────────
const Conversation = ({ thread, session, me, onSend, canCreateTask, cases, seenIds, dirs, onExportTask, goCase }) => {
  const draftStoreKey = `jd_chat_draft_${String(me).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  // Load any saved draft for this thread (survives thread switches + reloads)
  const [draft, setDraft] = React.useState(() => {
    try { return (JSON.parse(localStorage.getItem(draftStoreKey) || "{}")[thread.id]) || ""; }
    catch { return ""; }
  });
  const [taskFor, setTaskFor] = React.useState(null); // message being turned into a task
  const scrollRef = React.useRef(null);
  const h = threadHeading(thread, session);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.messages.length, thread.id]);

  // Autosave the draft (debounced) so an unsent message is never lost
  React.useEffect(() => {
    const t = setTimeout(() => {
      try {
        const all = JSON.parse(localStorage.getItem(draftStoreKey) || "{}");
        if (draft.trim()) all[thread.id] = draft; else delete all[thread.id];
        localStorage.setItem(draftStoreKey, JSON.stringify(all));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [draft, thread.id, draftStoreKey]);

  const clearDraft = () => {
    try {
      const all = JSON.parse(localStorage.getItem(draftStoreKey) || "{}");
      delete all[thread.id];
      localStorage.setItem(draftStoreKey, JSON.stringify(all));
    } catch {}
  };

  const send = () => { if (draft.trim()) { onSend(draft); setDraft(""); clearDraft(); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, background: "var(--paper)" }}>
      {/* Header */}
      <div style={{ padding: "11px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
        <Avatar name={h.who.name} size={34} tone={h.who.role === "judge" ? "judge" : "neutral"}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{h.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{h.sub}</div>
        </div>
        {thread.type === "case" && goCase && (
          <Btn size="sm" variant="outline" leading={<I.cases size={12}/>}
            onClick={() => { const c = cases.find((x) => x.id === thread.caseId); if (c) goCase(c); }}>
            Open case
          </Btn>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 18px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {thread.messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--text-3)", fontSize: 12.5 }}>
            {thread.type === "case" && isExternal(session.role)
              ? "Send a message to the Court Registry about this case."
              : "No messages yet — say hello."}
          </div>
        )}
        {thread.messages.map((m, i) => {
          const mine = m.senderKey === me;
          const prev = thread.messages[i - 1];
          const showName = !mine && (!prev || prev.senderKey !== m.senderKey);
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginTop: showName ? 10 : 2 }}>
              {showName && <div style={{ fontSize: 10.5, color: "var(--text-3)", margin: "0 6px 3px", fontWeight: 500 }}>{m.senderName} · {roleWord[m.senderRole] || m.senderRole}</div>}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexDirection: mine ? "row-reverse" : "row", maxWidth: "78%" }}>
                <div style={{
                  padding: "8px 12px", borderRadius: 12,
                  borderBottomRightRadius: mine ? 3 : 12, borderBottomLeftRadius: mine ? 12 : 3,
                  background: mine ? "var(--accent)" : "var(--paper-2)",
                  color: mine ? "var(--paper)" : "var(--text)",
                  border: mine ? "none" : "1px solid var(--line)",
                  fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>{m.text}</div>
                {canCreateTask && (
                  <button onClick={() => setTaskFor(taskFor === m.id ? null : m.id)} title="Create task from this message"
                    style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--line)", background: "var(--paper)",
                      color: m.task ? "var(--success)" : "var(--text-3)", cursor: "pointer", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <I.check size={12}/>
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "3px 6px 0" }}>
                <span style={{ fontSize: 9.5, color: "var(--text-3)" }}>{chatTime(m.ts)}</span>
                {m.task && (
                  <span style={{ fontSize: 9.5, color: "var(--success)", background: "var(--success-soft)", padding: "1px 7px", borderRadius: 99, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <I.check size={9}/> Task · {m.task.caseId}
                  </span>
                )}
              </div>
              {taskFor === m.id && canCreateTask && (
                <TaskComposer message={m} thread={thread} cases={cases} seenIds={seenIds} dirs={dirs} session={session}
                  onCancel={() => setTaskFor(null)}
                  onCreate={(opts) => { onExportTask(m, opts); setTaskFor(null); }}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div style={{ borderTop: "1px solid var(--line)", flexShrink: 0 }}>
        {draft.trim() && (
          <div style={{ padding: "5px 16px 0", fontSize: 10.5, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)" }}/>
            Draft saved
          </div>
        )}
        <div style={{ padding: "10px 16px 12px", display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
            rows={1}
            style={{ flex: 1, resize: "none", maxHeight: 120, padding: "9px 12px", fontSize: 13, lineHeight: 1.45,
              border: "1px solid var(--line-2)", borderRadius: 8, background: "var(--paper)", color: "var(--text)",
              outline: "none", fontFamily: "inherit" }}/>
          <Btn variant="primary" onClick={send} disabled={!draft.trim()} leading={<I.send size={13}/>}>Send</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Inline "create task from message" composer ───────────────────────────────
const TaskComposer = ({ message, thread, cases, seenIds, dirs, session, onCancel, onCreate }) => {
  const visible = cases.filter((c) => seenIds.has(c.id));
  const [caseId, setCaseId] = React.useState(thread.type === "case" ? thread.caseId : (visible[0]?.id || ""));
  const assignees = [
    ...(dirs.judges || []).map((j) => j.name),
    ...(dirs.staff || []).map((s) => s.name),
  ];
  const [assignee, setAssignee] = React.useState(session.name || assignees[0] || "");
  const [priority, setPriority] = React.useState("Medium");
  const [due, setDue] = React.useState(fmt(addDays(today, 7)));
  return (
    <div style={{ alignSelf: "stretch", margin: "8px 0 4px", padding: 14, borderRadius: 10,
      border: "1px solid var(--accent-line, var(--line-2))", background: "var(--accent-soft)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent-strong, var(--accent))", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <I.check size={13}/> Create task from this message
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text)", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 10px", marginBottom: 10, fontStyle: "italic" }}>
        “{message.text}”
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Sel label="Case" value={caseId} onChange={(e) => setCaseId(e.target.value)}
          options={visible.map((c) => ({ value: c.id, label: `${c.id} — ${c.title}` }))}/>
        <Sel label="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}
          options={assignees}/>
        <Sel label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}
          options={["High", "Medium", "Low"]}/>
        <Input label="Due" type="date" value={due} onChange={(e) => setDue(e.target.value)}/>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <Btn size="sm" variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn size="sm" variant="primary" leading={<I.check size={12}/>}
          onClick={() => onCreate({ caseId, assignee, priority, due })}>Create & export to Tasks</Btn>
      </div>
    </div>
  );
};

// ── New-conversation modal ───────────────────────────────────────────────────
const NewChatModal = ({ session, contacts, onStartDirect, onStartCase, onClose }) => {
  const hasParties = (contacts.parties || []).length > 0;
  const hasDirect = (contacts.direct || []).length > 0;
  const hasCases = (contacts.cases || []).length > 0;
  const [tab, setTab] = React.useState(hasDirect ? "people" : hasParties ? "parties" : "cases");
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();

  const Row = ({ name, role, sub, onClick }) => (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", display: "flex", gap: 11, alignItems: "center",
      padding: "9px 11px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--line)",
      background: "var(--paper)", marginBottom: 6,
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "var(--paper)"}>
      <Avatar name={name} size={32} tone={role === "judge" ? "judge" : "neutral"}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{sub}</div>
      </div>
      <I.arrowR size={13} stroke="var(--text-3)"/>
    </button>
  );

  const tabs = [
    hasDirect && { id: "people", label: "Colleagues" },
    hasParties && { id: "parties", label: "Parties" },
    hasCases && { id: "cases", label: "Your cases" },
  ].filter(Boolean);

  return (
    <Modal title="New conversation"
      subtitle={isExternal(session.role) ? "Message the Court Registry about one of your cases" : "Start a conversation with a colleague or party"}
      onClose={onClose} width={460}>
      {tabs.length > 1 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: "1px solid var(--line)" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "7px 12px", background: "transparent", border: "none",
              borderBottom: tab === t.id ? "2px solid var(--ink)" : "2px solid transparent",
              color: tab === t.id ? "var(--text)" : "var(--text-2)", fontSize: 12.5,
              fontWeight: tab === t.id ? 500 : 400, cursor: "pointer", marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {(tab === "people" || tab === "parties") && (
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" autoFocus
          style={{ width: "100%", padding: "8px 11px", fontSize: 13, marginBottom: 10,
            border: "1px solid var(--line-2)", borderRadius: 6, background: "var(--paper)", outline: "none" }}/>
      )}

      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {tab === "people" && contacts.direct
          .filter((p) => !ql || p.name.toLowerCase().includes(ql))
          .map((p) => <Row key={p.key} name={p.name} role={p.role} sub={p.sub} onClick={() => onStartDirect(p)}/>)}

        {tab === "parties" && contacts.parties
          .filter((p) => !ql || p.party.name.toLowerCase().includes(ql) || p.caseTitle.toLowerCase().includes(ql))
          .map((p) => <Row key={`${p.caseId}:${p.party.key}`} name={p.party.name} role={p.party.role}
            sub={`${p.caseId} · ${p.caseTitle}`} onClick={() => onStartCase(p)}/>)}

        {tab === "cases" && contacts.cases.map((c) => (
          <button key={c.caseId} onClick={() => onStartCase(c)} style={{
            width: "100%", textAlign: "left", display: "flex", gap: 11, alignItems: "center",
            padding: "11px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--line)",
            background: "var(--paper)", marginBottom: 6,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--paper)"}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I.cases size={15}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.caseTitle}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }} className="mono">{c.caseId} · Court Registry</div>
            </div>
            <I.arrowR size={13} stroke="var(--text-3)"/>
          </button>
        ))}

        {((tab === "people" && contacts.direct.length === 0) ||
          (tab === "parties" && contacts.parties.length === 0) ||
          (tab === "cases" && contacts.cases.length === 0)) && (
          <div style={{ padding: "28px 12px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>
            {tab === "cases" ? "You have no cases on file yet." : "No one available to message here."}
          </div>
        )}
      </div>
    </Modal>
  );
};

// Unread count for the nav badge (reads storage directly)
function chatUnreadCount(session) {
  if (!session) return 0;
  try {
    const me = myKey(session);
    const threads = loadThreads();
    const readMap = loadRead(me);
    // Visibility needs directories; approximate with what's on window for the badge
    const dirs = {
      judges: window.initJudges, staff: window.initStaff, parties: window.initParties,
      representatives: window.initRepresentatives, sections: window.initSections, accessGrants: window.initAccessGrants,
    };
    const cases = window.initCases || [];
    let seen;
    try { seen = new Set(window.visibleCases(session, cases, dirs.judges, dirs.staff, dirs.sections, dirs.accessGrants).map((c) => c.id)); }
    catch { seen = new Set(cases.map((c) => c.id)); }
    return threads.filter((t) => threadVisible(t, session, seen) && threadUnread(t, me, readMap)).length;
  } catch { return 0; }
}

window.ChatPage = ChatPage;
window.chatUnreadCount = chatUnreadCount;
