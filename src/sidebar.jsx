// ─── Sidebar nav + topbar ────────────────────────────────────────────────────

// ── Theme controller — light/dark, persisted to localStorage, system-aware ──
const THEME_KEY = "jd_theme";
function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}
function useTheme() {
  const [theme, setTheme] = React.useState(() =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  const set = React.useCallback((t) => { applyTheme(t); setTheme(t); }, []);
  const toggle = React.useCallback(() => set(theme === "dark" ? "light" : "dark"), [theme, set]);
  React.useEffect(() => {
    // Keep in sync if another surface (shortcut) flips it.
    const obs = new MutationObserver(() =>
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return { theme, setTheme: set, toggle };
}

// Each item has a `roles` array — controls who sees it.
const NAV_GROUPS = [
  { label: "Workspace", items: [
    { id: "dashboard",  label: "Dashboard",   icon: "dashboard", roles: ["admin","judge","staff","lawyer","party","rep"] },
    { id: "cases",      label: "Cases",       icon: "cases",     roles: ["admin","judge","staff","lawyer","party","rep"] },
    { id: "courtrooms", label: "Courtrooms",  icon: "court",     roles: ["admin","staff","judge"] },
    { id: "calendar",   label: "Calendar",    icon: "calendar",  roles: ["admin","judge","staff","lawyer","party","rep"] },
    { id: "targets",    label: "Targets",     icon: "target",    roles: ["admin","judge","staff"] },
    { id: "tasks",      label: "Tasks",       icon: "check",     roles: ["admin","judge","staff"] },
    { id: "requests",   label: "Requests",    icon: "inbox",     roles: ["admin","judge","staff","lawyer","party","rep"] },
    { id: "chat",       label: "Messages",    icon: "chat",      roles: ["admin","judge","staff","lawyer","party","rep"] },
    { id: "notebook",   label: "Notebook",    icon: "notebook",  roles: ["admin","judge","staff","lawyer","party","rep"] },
    { id: "documents",  label: "Documents",   icon: "doc",       roles: ["admin","judge","staff"] },
    { id: "statistics", label: "Statistics",  icon: "stats",     roles: ["admin","judge","staff"] },
  ]},
  { label: "Organisation", items: [
    { id: "sections",        label: "Sections",        icon: "building", roles: ["admin","judge","staff"] },
    { id: "access",          label: "Access grants",   icon: "lock",     roles: ["admin"] },
    { id: "statuses",        label: "Statuses",        icon: "sparkle",  roles: ["admin"] },
    { id: "judges",          label: "Judges",          icon: "gavel",    roles: ["admin","staff","judge"] },
    { id: "staff",           label: "Court staff",     icon: "users",    roles: ["admin","staff"] },
  ]},
  { label: "Bar & Public", items: [
    { id: "lawyers",         label: "Lawyers",         icon: "scales",  roles: ["admin","staff"] },
    { id: "parties",         label: "Parties",         icon: "users",   roles: ["admin","staff"] },
    { id: "representatives", label: "Representatives", icon: "userTag", roles: ["admin","staff"] },
  ]},
];

const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// Filter groups for the active role; drop empty groups.
function navForRole(role) {
  return NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(role)) }))
    .filter(g => g.items.length > 0);
}

const Sidebar = ({ page, setPage, counts, aiOpen, setAiOpen, density, onOpenSearch, onChangePassword, onOpenShortcuts }) => {
  const { session, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const padY = density === "compact" ? 7 : 9;
  const groups = navForRole(session?.role || "admin");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const roleInfo = ROLE_LABELS[session?.role] || ROLE_LABELS.admin;

  return (
    <aside style={{
      width: 232, flexShrink: 0,
      background: "var(--paper)",
      borderRight: "1px solid var(--line)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Wordmark */}
      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 6,
          background: "var(--ink)", color: "var(--paper)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 600, fontSize: 13, letterSpacing: "-0.02em",
        }}>HC</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.1 }}>JusticeDesk</div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.02em" }}>High Court</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "0 14px 12px" }}>
        <button onClick={onOpenSearch} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "7px 10px", border: "1px solid var(--line)",
          borderRadius: 6, background: "var(--paper-2)",
          color: "var(--text-3)", fontSize: 12.5, cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--line-2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}>
          <I.search size={13}/>
          <span style={{ flex: 1, textAlign: "left" }}>Search…</span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)" }}>⌘K</span>
        </button>
      </div>

      <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
        {groups.map((group, gi) => (
          <React.Fragment key={group.label}>
            <div style={{
              fontSize: 10.5, color: "var(--text-3)",
              letterSpacing: "0.08em", textTransform: "uppercase",
              padding: gi === 0 ? "8px 8px 6px" : "16px 8px 6px", fontWeight: 500,
            }}>{group.label}</div>

            {group.items.map((n) => {
              const Ic = I[n.icon];
              const active = page === n.id;
              const count = counts[n.id] || 0;
              return (
                <button key={n.id} onClick={() => setPage(n.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: `${padY}px 10px`, marginBottom: 1,
                    background: active ? "var(--paper-2)" : "transparent",
                    border: "1px solid transparent",
                    borderRadius: 6,
                    color: active ? "var(--text)" : "var(--text-2)",
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                    fontWeight: active ? 500 : 400,
                    position: "relative",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--paper-2)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  {active && <div style={{
                    position: "absolute", left: -10, top: 6, bottom: 6, width: 2,
                    background: "var(--ink)", borderRadius: 2,
                  }}/>}
                  {Ic && <Ic size={15} stroke={active ? "var(--text)" : "var(--text-2)"} />}
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {count > 0 && (
                    <span style={{
                      background: n.id === "requests" ? "var(--danger-soft)" : "var(--paper-3)",
                      color: n.id === "requests" ? "var(--danger)" : "var(--text-2)",
                      fontSize: 10.5, fontWeight: 500,
                      padding: "1px 7px", borderRadius: 99, minWidth: 18, textAlign: "center",
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      {/* Bottom: AI advisor + user menu */}
      <div style={{ padding: "10px 10px 14px", borderTop: "1px solid var(--line)" }}>
        {(session?.role === "admin" || session?.role === "judge" || session?.role === "staff") && (
          <button onClick={() => setAiOpen(!aiOpen)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 9,
            padding: "9px 10px",
            background: aiOpen ? "var(--ink)" : "var(--paper-2)",
            color: aiOpen ? "var(--paper)" : "var(--text)",
            border: aiOpen ? "1px solid var(--ink)" : "1px solid var(--line)",
            borderRadius: 6, fontSize: 12.5, cursor: "pointer", fontWeight: 500,
          }}>
            <I.sparkle size={14}/>
            <span style={{ flex: 1, textAlign: "left" }}>Case Advisor</span>
            <span style={{
              fontSize: 9.5, color: aiOpen ? "rgba(250,250,248,0.6)" : "var(--text-3)",
              letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500,
            }}>AI</span>
          </button>
        )}

        {/* Utility row: theme toggle + keyboard shortcuts */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "7px 10px", background: "var(--paper-2)", border: "1px solid var(--line)",
              borderRadius: 6, fontSize: 11.5, color: "var(--text-2)", cursor: "pointer", fontWeight: 500,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--paper-2)"}>
            {theme === "dark" ? <I.sun size={14}/> : <I.moon size={14}/>}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button onClick={onOpenShortcuts} title="Keyboard shortcuts (press ?)"
            style={{
              width: 36, display: "flex", alignItems: "center", justifyContent: "center",
              padding: "7px 0", background: "var(--paper-2)", border: "1px solid var(--line)",
              borderRadius: 6, color: "var(--text-2)", cursor: "pointer",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--paper-2)"}>
            <I.keyboard size={14}/>
          </button>
        </div>

        <div style={{ position: "relative", marginTop: 10 }}>
          <button onClick={() => setMenuOpen(o => !o)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 9,
            padding: "8px 10px", background: menuOpen ? "var(--paper-2)" : "transparent",
            border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left",
          }}>
            <Avatar name={session?.name || "User"} size={28}
              tone={roleInfo.tone === "accent" ? "accent" : roleInfo.tone === "judge" ? "judge" : "neutral"}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session?.name || "—"}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{roleInfo.label}</div>
            </div>
            <I.chevronD size={12} stroke="var(--text-3)"/>
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0,
              background: "var(--paper)", border: "1px solid var(--line)",
              borderRadius: 6, boxShadow: "var(--shadow)", zIndex: 100,
              padding: 4,
            }}>
              <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-3)",
                borderBottom: "1px solid var(--line-soft)", marginBottom: 4 }}>
                Signed in as<br/>
                <span style={{ color: "var(--text)", fontWeight: 500 }}>{session?.identifier}</span>
              </div>
              {session?.role !== "admin" && onChangePassword && (
                <button onClick={() => { setMenuOpen(false); onChangePassword(); }} style={{
                  width: "100%", padding: "8px 10px", background: "transparent",
                  border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left",
                  fontSize: 12.5, color: "var(--text)",
                  display: "flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <I.lock size={13}/> Change password
                </button>
              )}
              <button onClick={() => { setMenuOpen(false); logout(); }} style={{
                width: "100%", padding: "8px 10px", background: "transparent",
                border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left",
                fontSize: 12.5, color: "var(--text)",
                display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <I.signOut size={13}/> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

// ── Notifications bell — derives live alerts from the docket ────────────────
const NOTIF_SEEN_KEY = "jd_notif_seen_v1";
const loadSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(NOTIF_SEEN_KEY)) || []); } catch { return new Set(); } };

const NotificationsBell = ({ cases = [], bookings = [], navigate, goCase }) => {
  const [open, setOpen] = React.useState(false);
  const [seen, setSeen] = React.useState(() => loadSeen());
  const ref = React.useRef(null);

  const todayMs = new Date(new Date().toDateString()).getTime();
  const items = React.useMemo(() => {
    const out = [];
    // Pending requests
    cases.forEach((c) => (c.requests || []).forEach((r) => {
      if (r.status === "Pending") out.push({
        id: `req-${c.id}-${r.id}`, kind: "request",
        title: `${r.type} request`, sub: `${c.id} · filed by ${r.filedBy || "—"}`,
        go: () => goCase?.(c),
      });
    }));
    // Overdue tasks
    cases.forEach((c) => (c.tasks || []).forEach((t) => {
      if (!t.done && t.due && new Date(t.due).getTime() < todayMs) out.push({
        id: `task-${c.id}-${t.id}`, kind: "overdue",
        title: `Overdue: ${t.text}`, sub: `${c.id} · was due ${t.due}`,
        go: () => goCase?.(c),
      });
    }));
    // Hearings in the next 3 days
    (bookings || []).forEach((b) => {
      if (b.status === "Cancelled" || !b.date) return;
      const d = new Date(b.date).getTime();
      const days = Math.round((d - todayMs) / 86400000);
      if (days >= 0 && days <= 3) out.push({
        id: `hearing-${b.id}`, kind: "hearing",
        title: days === 0 ? "Hearing today" : days === 1 ? "Hearing tomorrow" : `Hearing in ${days} days`,
        sub: `${b.caseTitle || b.caseId} · ${b.timeStart || ""} ${b.courtroom || ""}`.trim(),
        go: () => { const c = cases.find((x) => x.id === b.caseId); c ? goCase?.(c) : navigate?.("courtrooms"); },
      });
    });
    return out;
  }, [cases, bookings, todayMs, goCase, navigate]);

  const unread = items.filter((i) => !seen.has(i.id)).length;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const markAllSeen = () => {
    const next = new Set([...seen, ...items.map((i) => i.id)]);
    setSeen(next);
    try { localStorage.setItem(NOTIF_SEEN_KEY, JSON.stringify([...next])); } catch {}
  };
  const toggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread > 0) setTimeout(markAllSeen, 1200);
  };

  const kindMeta = {
    request: { color: "var(--warn)", icon: <I.inbox size={13}/> },
    overdue: { color: "var(--danger)", icon: <I.warn size={13}/> },
    hearing: { color: "var(--accent)", icon: <I.court size={13}/> },
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle} title="Notifications" style={{
        width: 32, height: 32, borderRadius: 6,
        background: open ? "var(--paper-2)" : "transparent",
        border: "1px solid transparent", cursor: "pointer", color: "var(--text-2)",
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }} onMouseEnter={(e)=>{ if(!open) e.currentTarget.style.background="var(--paper-2)"; }}
         onMouseLeave={(e)=>{ if(!open) e.currentTarget.style.background="transparent"; }}>
        <I.bell size={15}/>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 3, right: 3, minWidth: 14, height: 14, padding: "0 3px",
            borderRadius: 99, background: "var(--danger)", color: "#fff",
            fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--paper)",
          }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200,
          width: 340, maxHeight: 420, background: "var(--paper)",
          border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)",
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Notifications</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{items.length} active</div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {items.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>
                You're all caught up.
              </div>
            )}
            {items.map((it) => {
              const meta = kindMeta[it.kind] || kindMeta.request;
              const isUnread = !seen.has(it.id);
              return (
                <button key={it.id} onClick={() => { it.go?.(); setOpen(false); }} style={{
                  width: "100%", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "10px 14px", border: "none", borderBottom: "1px solid var(--line-soft)",
                  background: isUnread ? "var(--paper-2)" : "transparent", cursor: "pointer", color: "inherit",
                }}
                onMouseEnter={(e)=>e.currentTarget.style.background="var(--paper-3)"}
                onMouseLeave={(e)=>e.currentTarget.style.background=isUnread?"var(--paper-2)":"transparent"}>
                  <span style={{ color: meta.color, marginTop: 1, flexShrink: 0 }}>{meta.icon}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--text-3)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.sub}</span>
                  </span>
                  {isUnread && <span style={{ width: 6, height: 6, borderRadius: "50%",
                    background: "var(--accent)", marginTop: 5, flexShrink: 0 }}/>}
                </button>
              );
            })}
          </div>
          {items.length > 0 && (
            <button onClick={() => { navigate?.("requests"); setOpen(false); }} style={{
              padding: "10px 14px", borderTop: "1px solid var(--line)", background: "var(--paper-2)",
              border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-2)", fontWeight: 500,
            }}>Review pending requests →</button>
          )}
        </div>
      )}
    </div>
  );
};

const Topbar = ({ page, viewCase, breadcrumbActions, cases, bookings, navigate, goCase }) => {
  const NAV_ITEM = NAV_ITEMS.find((n) => n.id === page);
  const today = new Date();
  const niceDate = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <header style={{
      height: 56, padding: "0 24px",
      borderBottom: "1px solid var(--line)",
      background: "var(--paper)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {NAV_ITEM?.label}
        </div>
        {viewCase && (
          <>
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>/</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>{viewCase.id}</span>
          </>
        )}
        <span style={{ color: "var(--text-3)", fontSize: 11.5, marginLeft: 4 }}>· {niceDate}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {breadcrumbActions}
        <NotificationsBell cases={cases} bookings={bookings} navigate={navigate} goCase={goCase}/>
      </div>
    </header>
  );
};

// ── Keyboard shortcuts overlay ──────────────────────────────────────────────
const ShortcutsOverlay = ({ open, onClose }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  const mod = isMac ? "⌘" : "Ctrl";
  const groups = [
    { label: "General", items: [
      { keys: [mod, "K"], desc: "Open command palette / search" },
      { keys: ["?"], desc: "Show this shortcuts panel" },
      { keys: ["Esc"], desc: "Close dialog, palette, or panel" },
    ]},
    { label: "Appearance", items: [
      { keys: [mod, "J"], desc: "Toggle light / dark mode" },
    ]},
    { label: "Navigate", items: [
      { keys: ["G", "then", "D"], desc: "Go to Dashboard" },
      { keys: ["G", "then", "C"], desc: "Go to Cases" },
      { keys: ["G", "then", "T"], desc: "Go to Tasks" },
    ]},
  ];

  const Key = ({ children }) => (
    children === "then"
      ? <span style={{ fontSize: 10.5, color: "var(--text-3)", padding: "0 1px" }}>then</span>
      : <kbd style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 22, height: 22, padding: "0 6px",
          background: "var(--paper-2)", border: "1px solid var(--line-2)",
          borderBottomWidth: 2, borderRadius: 5,
          fontSize: 11.5, fontWeight: 600, color: "var(--text)",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}>{children}</kbd>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(11,13,16,0.45)",
      zIndex: 9500, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, backdropFilter: "blur(2px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 460, background: "var(--paper)",
        border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <I.keyboard size={16} stroke="var(--text-2)"/>
            <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em" }}>Keyboard shortcuts</span>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid transparent", width: 28, height: 28,
            borderRadius: 6, cursor: "pointer", color: "var(--text-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onMouseEnter={(e)=>e.currentTarget.style.background="var(--paper-2)"}
             onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
            <I.close size={15}/>
          </button>
        </div>
        <div style={{ padding: "8px 20px 18px" }}>
          {groups.map((g) => (
            <div key={g.label} style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{g.label}</div>
              <div style={{ display: "grid", gap: 10 }}>
                {g.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.4 }}>{it.desc}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      {it.keys.map((k, j) => <Key key={j}>{k}</Key>)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.NAV_ITEMS = NAV_ITEMS;
window.navForRole = navForRole;
window.useTheme = useTheme;
window.applyTheme = applyTheme;
window.getStoredTheme = getStoredTheme;
window.ShortcutsOverlay = ShortcutsOverlay;
