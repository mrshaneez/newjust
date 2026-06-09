// ─── Notebook — a private, per-user notebook ────────────────────────────────
// Every signed-in user gets their own notebook, stored locally and keyed to
// their account identifier. Notes autosave as you type, can be pinned, tagged,
// searched, duplicated, exported, and deleted. Nothing here is shared between
// users — it is each person's private scratchpad.

// Per-user storage key (admin has no identifier → falls back to a stable key)
const notebookKey = (session) =>
  `jd_notebook_${(session?.identifier || session?.name || "anon").toLowerCase().replace(/\s+/g, "_")}`;

const loadNotes = (session) => {
  try {
    const raw = localStorage.getItem(notebookKey(session));
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return [];
};

const newNote = () => ({
  id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: "",
  body: "",
  tags: [],
  pinned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Relative "edited" timestamp
const relTime = (ts) => {
  if (!ts) return "";
  const diff = Date.now() - ts, m = 60000, h = 3600000, d = 86400000;
  if (diff < m) return "just now";
  if (diff < h) return `${Math.floor(diff / m)}m ago`;
  if (diff < d) return `${Math.floor(diff / h)}h ago`;
  if (diff < 7 * d) return `${Math.floor(diff / d)}d ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const wordCount = (s) => (s || "").trim() ? (s || "").trim().split(/\s+/).length : 0;

const NotebookPage = () => {
  const { session } = useAuth();
  const toast = typeof useToast === "function" ? useToast() : () => {};
  const storeKey = notebookKey(session);

  const [notes, setNotes] = React.useState(() => loadNotes(session));
  const [activeId, setActiveId] = React.useState(() => {
    const n = loadNotes(session);
    const sorted = [...n].sort(sortNotes);
    return sorted[0]?.id || null;
  });
  const [search, setSearch] = React.useState("");
  const [tagFilter, setTagFilter] = React.useState(null);
  const [saved, setSaved] = React.useState(true);
  const saveTimer = React.useRef(null);

  // Persist (debounced) whenever notes change
  React.useEffect(() => {
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(storeKey, JSON.stringify(notes)); } catch (e) {}
      setSaved(true);
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [notes, storeKey]);

  // Reload when the user switches (different identifier)
  React.useEffect(() => {
    const loaded = loadNotes(session);
    setNotes(loaded);
    setActiveId([...loaded].sort(sortNotes)[0]?.id || null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  const active = notes.find((n) => n.id === activeId) || null;

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || []))).sort();

  const visible = notes
    .filter((n) => {
      if (tagFilter && !(n.tags || []).includes(tagFilter)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (n.title || "").toLowerCase().includes(q)
        || (n.body || "").toLowerCase().includes(q)
        || (n.tags || []).some((t) => t.toLowerCase().includes(q));
    })
    .sort(sortNotes);

  const create = () => {
    const n = newNote();
    setNotes((p) => [n, ...p]);
    setActiveId(n.id);
    setSearch(""); setTagFilter(null);
  };

  const patch = (id, fields) =>
    setNotes((p) => p.map((n) => n.id === id ? { ...n, ...fields, updatedAt: Date.now() } : n));

  const remove = (id) => {
    setNotes((p) => {
      const next = p.filter((n) => n.id !== id);
      if (id === activeId) setActiveId([...next].sort(sortNotes)[0]?.id || null);
      return next;
    });
    toast("Note deleted");
  };

  const duplicate = (id) => {
    const src = notes.find((n) => n.id === id);
    if (!src) return;
    const copy = { ...src, id: newNote().id, title: `${src.title || "Untitled"} (copy)`, pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
    setNotes((p) => [copy, ...p]);
    setActiveId(copy.id);
    toast("Note duplicated");
  };

  const exportNote = (n) => {
    const text = `${n.title || "Untitled note"}\n${"=".repeat((n.title || "Untitled note").length)}\n\n${n.body || ""}\n\n— ${session?.name || "User"} · ${new Date(n.updatedAt).toLocaleString("en-GB")}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(n.title || "note").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast("Note exported");
  };

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "300px 1fr", gap: 0,
      height: "calc(100vh - 56px - 48px)", minHeight: 460,
      border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden",
      background: "var(--paper)",
    }}>
      {/* ── Left rail: search + list ── */}
      <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minWidth: 0, background: "var(--paper-2)" }}>
        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              <I.notebook size={15} stroke="var(--accent)"/> My notebook
            </div>
            <Btn size="sm" variant="primary" leading={<I.plus size={12}/>} onClick={create}>New</Btn>
          </div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", display: "flex" }}>
              <I.search size={13}/>
            </span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…"
              style={{ width: "100%", padding: "7px 9px 7px 30px", fontSize: 12.5,
                border: "1px solid var(--line)", borderRadius: 6, background: "var(--paper)",
                color: "var(--text)", outline: "none" }}/>
          </div>
          {allTags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 9 }}>
              {tagFilter && (
                <button onClick={() => setTagFilter(null)} style={tagChip(true)}>
                  ✕ {tagFilter}
                </button>
              )}
              {allTags.filter((t) => t !== tagFilter).slice(0, 8).map((t) => (
                <button key={t} onClick={() => setTagFilter(t)} style={tagChip(false)}>{t}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {visible.length === 0 ? (
            <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--text-3)", fontSize: 12.5 }}>
              {notes.length === 0
                ? <>No notes yet.<br/>Click <strong style={{ color: "var(--text-2)" }}>New</strong> to start writing.</>
                : "No notes match your search."}
            </div>
          ) : visible.map((n) => {
            const isActive = n.id === activeId;
            return (
              <button key={n.id} onClick={() => setActiveId(n.id)} style={{
                width: "100%", textAlign: "left", display: "block",
                padding: "10px 11px", marginBottom: 6, borderRadius: 7, cursor: "pointer",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--line)"}`,
                background: isActive ? "var(--accent-soft)" : "var(--paper)",
                outline: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  {n.pinned && <I.pinned size={11} stroke="var(--accent)"/>}
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: n.title ? "var(--text)" : "var(--text-3)" }}>
                    {n.title || "Untitled note"}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.45,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden", minHeight: 16 }}>
                  {(n.body || "").trim() || "No additional text"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>{relTime(n.updatedAt)}</span>
                  {(n.tags || []).slice(0, 2).map((t) => (
                    <span key={t} style={{ fontSize: 9.5, color: "var(--accent)", background: "var(--accent-soft)",
                      padding: "1px 6px", borderRadius: 99, fontWeight: 500 }}>{t}</span>
                  ))}
                  {(n.tags || []).length > 2 && <span style={{ fontSize: 9.5, color: "var(--text-3)" }}>+{n.tags.length - 2}</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "8px 14px", borderTop: "1px solid var(--line)", fontSize: 10.5, color: "var(--text-3)",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{notes.length} note{notes.length === 1 ? "" : "s"}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: saved ? "var(--success)" : "var(--warn)" }}/>
            {saved ? "Saved" : "Saving…"}
          </span>
        </div>
      </div>

      {/* ── Right: editor ── */}
      {active ? (
        <NoteEditor key={active.id} note={active} patch={patch} remove={remove}
          duplicate={duplicate} exportNote={exportNote} saved={saved}/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "var(--text-3)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--paper-2)",
            border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.notebook size={26} stroke="var(--text-3)"/>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-2)" }}>Your notebook is empty</div>
            <div style={{ fontSize: 12.5, marginTop: 3 }}>Capture a thought, a to-do, or a draft — only you can see it.</div>
          </div>
          <Btn variant="primary" leading={<I.plus size={13}/>} onClick={create}>New note</Btn>
        </div>
      )}
    </div>
  );
};

// Pinned first, then most-recently edited
function sortNotes(a, b) {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
  return (b.updatedAt || 0) - (a.updatedAt || 0);
}

const tagChip = (active) => ({
  padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 500, cursor: "pointer",
  border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
  background: active ? "var(--accent)" : "var(--paper)",
  color: active ? "var(--paper)" : "var(--text-2)",
});

// ── Note editor pane ────────────────────────────────────────────────────────
const NoteEditor = ({ note, patch, remove, duplicate, exportNote, saved }) => {
  const [tagInput, setTagInput] = React.useState("");
  const bodyRef = React.useRef(null);

  // Auto-grow textarea
  React.useEffect(() => {
    const el = bodyRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }, [note.id]);
  const onBody = (e) => {
    patch(note.id, { body: e.target.value });
    const el = e.target;
    el.style.height = "auto"; el.style.height = el.scrollHeight + "px";
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (!(note.tags || []).includes(t)) patch(note.id, { tags: [...(note.tags || []), t] });
    setTagInput("");
  };
  const removeTag = (t) => patch(note.id, { tags: (note.tags || []).filter((x) => x !== t) });

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, background: "var(--paper)" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <button onClick={() => patch(note.id, { pinned: !note.pinned })}
          title={note.pinned ? "Unpin" : "Pin to top"}
          style={{ ...iconBtn, color: note.pinned ? "var(--accent)" : "var(--text-2)",
            background: note.pinned ? "var(--accent-soft)" : "transparent",
            borderColor: note.pinned ? "var(--accent)" : "var(--line)" }}>
          {note.pinned ? <I.pinned size={14}/> : <I.pin size={14}/>}
        </button>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: "var(--text-3)", marginRight: 4 }}>
          {saved ? `Edited ${relTime(note.updatedAt)}` : "Saving…"}
        </span>
        <button onClick={() => exportNote(note)} title="Export as .txt" style={iconBtn}><I.download size={14}/></button>
        <button onClick={() => duplicate(note.id)} title="Duplicate" style={iconBtn}><I.doc size={14}/></button>
        <button onClick={() => { if (confirm("Delete this note? This can't be undone.")) remove(note.id); }}
          title="Delete" style={{ ...iconBtn, color: "var(--danger)" }}><I.trash size={14}/></button>
      </div>

      {/* Scrollable writing surface */}
      <div style={{ flex: 1, overflowY: "auto", padding: "26px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 40px" }}>
          <input value={note.title} onChange={(e) => patch(note.id, { title: e.target.value })}
            placeholder="Untitled note"
            style={{ width: "100%", border: "none", outline: "none", background: "transparent",
              fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)",
              marginBottom: 10, fontFamily: "inherit" }}/>

          {/* Tags */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            {(note.tags || []).map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 5px 3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500,
                background: "var(--accent-soft)", color: "var(--accent)" }}>
                {t}
                <button onClick={() => removeTag(t)} style={{ border: "none", background: "transparent",
                  cursor: "pointer", color: "var(--accent)", display: "flex", padding: 1, opacity: 0.7 }}>
                  <I.close size={10}/>
                </button>
              </span>
            ))}
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); }
                else if (e.key === "Backspace" && !tagInput && (note.tags || []).length) removeTag(note.tags[note.tags.length - 1]); }}
              onBlur={addTag}
              placeholder={(note.tags || []).length ? "Add tag…" : "+ Add a tag"}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 11.5,
                color: "var(--text-2)", minWidth: 90, padding: "3px 0" }}/>
          </div>

          <textarea ref={bodyRef} value={note.body} onChange={onBody}
            placeholder="Start writing… your notes save automatically and stay private to your account."
            style={{ width: "100%", border: "none", outline: "none", background: "transparent",
              resize: "none", fontSize: 14.5, lineHeight: 1.7, color: "var(--text)",
              fontFamily: "inherit", minHeight: 240, overflow: "hidden" }}/>
        </div>
      </div>

      {/* Footer stats */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid var(--line)", flexShrink: 0,
        fontSize: 11, color: "var(--text-3)", display: "flex", gap: 16 }}>
        <span>{wordCount(note.body)} words</span>
        <span>{(note.body || "").length} characters</span>
        <span style={{ marginLeft: "auto" }}>Created {new Date(note.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
      </div>
    </div>
  );
};

const iconBtn = {
  width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center",
  border: "1px solid var(--line)", borderRadius: 6, background: "var(--paper)",
  color: "var(--text-2)", cursor: "pointer",
};

window.NotebookPage = NotebookPage;
