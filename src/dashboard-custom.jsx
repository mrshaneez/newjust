// ─── Dashboard customisation framework ──────────────────────────────────────
// Per-user, role-aware dashboard layout: each user can show/hide widgets,
// reorder them (drag or buttons), resize their width, tint them with an accent
// colour, and adjust spacing — all saved privately to their account.

// Width spans on a 12-column grid
const DASH_SPANS = [
  { key: "quarter",   label: "¼",  cols: 3 },
  { key: "third",     label: "⅓",  cols: 4 },
  { key: "half",      label: "½",  cols: 6 },
  { key: "twothirds", label: "⅔",  cols: 8 },
  { key: "full",      label: "Full", cols: 12 },
];
// Accepts a named span key OR a raw column count (1–12) for free drag-resize
const spanCols = (key) => {
  if (typeof key === "number") return Math.max(1, Math.min(12, Math.round(key)));
  return (DASH_SPANS.find((s) => s.key === key) || DASH_SPANS[4]).cols;
};

// Accent palette for tinting cards (harmonised with the teal house accent)
const DASH_COLORS = {
  none:    { label: "Default", bar: "transparent", soft: "var(--paper)" },
  teal:    { label: "Teal",    bar: "#1f3a3d", soft: "color-mix(in srgb, #1f3a3d 7%, var(--paper))" },
  amber:   { label: "Amber",   bar: "#8b6914", soft: "color-mix(in srgb, #8b6914 8%, var(--paper))" },
  crimson: { label: "Crimson", bar: "#a02d2a", soft: "color-mix(in srgb, #a02d2a 7%, var(--paper))" },
  green:   { label: "Green",   bar: "#2d5a3d", soft: "color-mix(in srgb, #2d5a3d 8%, var(--paper))" },
  indigo:  { label: "Indigo",  bar: "#3b4071", soft: "color-mix(in srgb, #3b4071 8%, var(--paper))" },
  plum:    { label: "Plum",    bar: "#6b3a5a", soft: "color-mix(in srgb, #6b3a5a 8%, var(--paper))" },
};

const dashKey = (session) =>
  `jd_dashboard_${(session?.identifier || session?.name || "anon").toLowerCase().replace(/\s+/g, "_")}`;

// Build a default config from the widget definitions for this role
function defaultDashConfig(defs) {
  return {
    order: defs.map((d) => d.id),
    hidden: defs.filter((d) => d.defaultHidden).map((d) => d.id),
    span: Object.fromEntries(defs.map((d) => [d.id, d.defaultSpan || "full"])),
    color: Object.fromEntries(defs.map((d) => [d.id, "none"])),
    height: {},
    options: { compact: false },
  };
}

// Merge a stored config with current defs: keep user choices, append new widgets,
// drop widgets that no longer exist (e.g. role change).
function reconcileConfig(stored, defs) {
  const base = defaultDashConfig(defs);
  if (!stored) return base;
  const validIds = new Set(defs.map((d) => d.id));
  const storedOrder = (stored.order || []).filter((id) => validIds.has(id));
  const missing = defs.map((d) => d.id).filter((id) => !storedOrder.includes(id));
  return {
    order: [...storedOrder, ...missing],
    hidden: (stored.hidden || []).filter((id) => validIds.has(id)),
    span: { ...base.span, ...(stored.span || {}) },
    color: { ...base.color, ...(stored.color || {}) },
    height: { ...(stored.height || {}) },
    options: { ...base.options, ...(stored.options || {}) },
  };
}

function useDashboardConfig(session, defs) {
  const key = dashKey(session);
  const [config, setConfig] = React.useState(() => {
    try { return reconcileConfig(JSON.parse(localStorage.getItem(key) || "null"), defs); }
    catch { return defaultDashConfig(defs); }
  });
  // Reconcile + reload when user or available widgets change
  React.useEffect(() => {
    try { setConfig(reconcileConfig(JSON.parse(localStorage.getItem(key) || "null"), defs)); }
    catch { setConfig(defaultDashConfig(defs)); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, defs.map((d) => d.id).join(",")]);
  // Persist
  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(config)); } catch {}
  }, [key, config]);

  const api = React.useMemo(() => ({
    setSpan: (id, span) => setConfig((c) => ({ ...c, span: { ...c.span, [id]: span } })),
    setCols: (id, n) => setConfig((c) => {
      const cols = Math.max(1, Math.min(12, Math.round(n)));
      if (c.span[id] === cols) return c;
      return { ...c, span: { ...c.span, [id]: cols } };
    }),
    setHeight: (id, px) => setConfig((c) => {
      const h = px == null ? undefined : Math.max(120, Math.round(px));
      const next = { ...(c.height || {}) };
      if (h == null) delete next[id]; else next[id] = h;
      return { ...c, height: next };
    }),
    setColor: (id, color) => setConfig((c) => ({ ...c, color: { ...c.color, [id]: color } })),
    hide: (id) => setConfig((c) => c.hidden.includes(id) ? c : { ...c, hidden: [...c.hidden, id] }),
    show: (id) => setConfig((c) => ({ ...c, hidden: c.hidden.filter((x) => x !== id),
      order: c.order.includes(id) ? c.order : [...c.order, id] })),
    move: (id, dir) => setConfig((c) => {
      const visible = c.order.filter((x) => !c.hidden.includes(x));
      const i = visible.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= visible.length) return c;
      [visible[i], visible[j]] = [visible[j], visible[i]];
      // Rebuild full order: visible (reordered) + hidden preserved at the end
      return { ...c, order: [...visible, ...c.order.filter((x) => c.hidden.includes(x))] };
    }),
    reorder: (dragId, dropId) => setConfig((c) => {
      if (dragId === dropId) return c;
      const order = [...c.order];
      const from = order.indexOf(dragId), to = order.indexOf(dropId);
      if (from < 0 || to < 0) return c;
      order.splice(from, 1);
      order.splice(order.indexOf(dropId) + (from < to ? 0 : 0), 0, dragId);
      return { ...c, order };
    }),
    setOption: (k, v) => setConfig((c) => ({ ...c, options: { ...c.options, [k]: v } })),
    reset: () => setConfig(defaultDashConfig(defs)),
  }), [defs]);

  return [config, api];
}

// ── Customise toolbar (sits above the grid in customise mode) ───────────────
const DashCustomizeBar = ({ config, api, onDone }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    padding: "12px 16px", marginBottom: 16,
    background: "var(--accent-soft)", border: "1px solid var(--accent-line, var(--line-2))",
    borderRadius: 10,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <I.sparkle size={15} stroke="var(--accent-strong, var(--accent))"/>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-strong, var(--accent))" }}>Customising your dashboard</div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>Drag a card's <strong>right edge</strong> to resize width · <strong>bottom edge</strong> for height · drag the handle to reorder · recolour · show / hide. Saved automatically.</div>
      </div>
    </div>
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>
        <button onClick={() => api.setOption("compact", !config.options.compact)}
          style={{
            width: 34, height: 20, borderRadius: 99, border: "none", cursor: "pointer", position: "relative",
            background: config.options.compact ? "var(--accent)" : "var(--line-2)", transition: "background .15s",
          }}>
          <span style={{ position: "absolute", top: 2, left: config.options.compact ? 16 : 2,
            width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s" }}/>
        </button>
        Compact spacing
      </label>
      <Btn size="sm" variant="ghost" onClick={api.reset} leading={<I.close size={12}/>}>Reset</Btn>
      <Btn size="sm" variant="primary" onClick={onDone} leading={<I.check size={12}/>}>Done</Btn>
    </div>
  </div>
);

// ── Per-widget control strip (shown above each widget in customise mode) ────
const WidgetControls = ({ def, config, api, cols, height, isFirst, isLast }) => {
  const span = config.span[def.id] ?? def.defaultSpan ?? "full";
  const color = config.color[def.id] || "none";
  const activeCols = cols ?? spanCols(span);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      padding: "7px 10px", marginBottom: 6,
      background: "var(--paper)", border: "1px dashed var(--line-2)", borderRadius: 8,
    }}>
      <span data-drag-handle title="Drag to reorder" style={{
        cursor: "grab", color: "var(--text-3)", display: "flex", padding: "2px 1px",
        letterSpacing: "-2px", fontSize: 13, userSelect: "none",
      }}>⠿</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginRight: 2 }}>{def.title}</span>

      {/* move buttons */}
      <div style={{ display: "flex", gap: 2 }}>
        <button onClick={() => api.move(def.id, -1)} disabled={isFirst} title="Move up"
          style={miniBtn(isFirst)}><I.chevronL size={12} style={{ transform: "rotate(90deg)" }}/></button>
        <button onClick={() => api.move(def.id, 1)} disabled={isLast} title="Move down"
          style={miniBtn(isLast)}><I.chevronL size={12} style={{ transform: "rotate(-90deg)" }}/></button>
      </div>

      {/* size */}
      <div style={{ display: "flex", gap: 2, alignItems: "center", marginLeft: 4 }}>
        <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Size</span>
        {DASH_SPANS.map((s) => {
          const isActive = activeCols === s.cols;
          return (
            <button key={s.key} onClick={() => api.setSpan(def.id, s.key)} title={s.label}
              style={{
                minWidth: 24, height: 22, padding: "0 6px", fontSize: 11, cursor: "pointer",
                border: `1px solid ${isActive ? "var(--ink)" : "var(--line)"}`,
                background: isActive ? "var(--ink)" : "var(--paper)",
                color: isActive ? "var(--paper)" : "var(--text-2)",
                borderRadius: 5, fontWeight: 500,
              }}>{s.label}</button>
          );
        })}
        <span style={{ fontSize: 10.5, color: "var(--text-3)", marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
          {activeCols}/12{height ? ` · ${height}px` : ""}
        </span>
        {height && (
          <button onClick={() => api.setHeight(def.id, null)} title="Reset height to auto"
            style={{ ...miniBtn(false), width: "auto", padding: "0 6px", marginLeft: 2, gap: 3, display: "inline-flex", alignItems: "center" }}>
            <I.close size={10}/> <span style={{ fontSize: 10 }}>Auto-h</span>
          </button>
        )}
      </div>

      {/* colour (card widgets only) */}
      {def.colorable && (
        <div style={{ display: "flex", gap: 3, alignItems: "center", marginLeft: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Colour</span>
          {Object.entries(DASH_COLORS).map(([k, v]) => (
            <button key={k} onClick={() => api.setColor(def.id, k)} title={v.label}
              style={{
                width: 18, height: 18, borderRadius: "50%", cursor: "pointer",
                border: color === k ? "2px solid var(--text)" : "1px solid var(--line-2)",
                background: k === "none" ? "var(--paper-2)" : v.bar,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {k === "none" && <span style={{ width: 10, height: 1.5, background: "var(--text-3)", transform: "rotate(-45deg)" }}/>}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => api.hide(def.id)} title="Hide widget"
        style={{ ...miniBtn(false), marginLeft: "auto", color: "var(--text-2)", gap: 4, width: "auto", padding: "0 8px", display: "inline-flex", alignItems: "center" }}>
        <I.close size={11}/> <span style={{ fontSize: 11 }}>Hide</span>
      </button>
    </div>
  );
};

const miniBtn = (disabled) => ({
  width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center",
  border: "1px solid var(--line)", borderRadius: 5, background: "var(--paper)",
  color: disabled ? "var(--text-3)" : "var(--text-2)", cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.45 : 1,
});

// ── Widget frame: positions the widget, applies accent, hosts controls ──────
const WidgetFrame = ({ def, config, api, customize, dragState, children }) => {
  const span = config.span[def.id] ?? def.defaultSpan ?? "full";
  const colorKey = config.color[def.id] || "none";
  const accent = DASH_COLORS[colorKey] || DASH_COLORS.none;
  const cols = spanCols(span);
  const height = (config.height || {})[def.id] || null;
  const isDragging = dragState?.dragId === def.id;
  const gap = dragState?.gap ?? 20;

  const frameRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const [resizing, setResizing] = React.useState(null);   // 'x' | 'y' | null
  const [liveCols, setLiveCols] = React.useState(null);

  // ── Width: drag the right edge to set any column span (1–12) ──
  const startResizeX = (e) => {
    e.preventDefault(); e.stopPropagation();
    const rect = frameRef.current.getBoundingClientRect();
    const startCols = cols;
    const colW = (rect.width - (startCols - 1) * gap) / startCols; // one column's px width
    const unit = colW + gap;                                        // column + gutter step
    setResizing("x");
    const onMove = (ev) => {
      const newWidth = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
      let n = Math.round((newWidth + gap) / unit);
      n = Math.max(1, Math.min(12, n));
      setLiveCols(n);
      api.setCols(def.id, n);
    };
    const stop = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", stop);
      setResizing(null); setLiveCols(null);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", stop);
  };

  // ── Height: drag the bottom edge to set a custom pixel height ──
  const startResizeY = (e) => {
    e.preventDefault(); e.stopPropagation();
    const rect = contentRef.current.getBoundingClientRect();
    setResizing("y");
    const onMove = (ev) => {
      const y = (ev.touches ? ev.touches[0].clientY : ev.clientY);
      api.setHeight(def.id, y - rect.top);
    };
    const stop = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", stop);
      setResizing(null);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", stop);
  };

  const frameProps = customize ? {
    draggable: true,
    onDragStart: (e) => {
      if (!e.target.closest?.("[data-drag-handle]")) { e.preventDefault(); return; }
      dragState.setDragId(def.id);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; },
    onDrop: (e) => { e.preventDefault(); if (dragState.dragId) api.reorder(dragState.dragId, def.id); dragState.setDragId(null); },
    onDragEnd: () => dragState.setDragId(null),
  } : {};

  // Inner content; gets a fixed height + scroll when the user has resized it
  const inner = (
    <div ref={contentRef} style={{
      height: height ? height : "auto",
      overflowY: height ? "auto" : "visible",
      overflowX: "hidden",
    }}>
      {children}
    </div>
  );

  const handleColor = "var(--accent)";

  return (
    <div ref={frameRef} {...frameProps} style={{
      gridColumn: `span ${cols}`,
      minWidth: 0, position: "relative",
      opacity: isDragging ? 0.4 : 1,
      transition: resizing ? "none" : "opacity .12s",
    }}>
      {customize && (
        <WidgetControls def={def} config={config} api={api} cols={cols} height={height}
          isFirst={dragState.firstId === def.id} isLast={dragState.lastId === def.id}/>
      )}
      <div style={{
        pointerEvents: customize ? "none" : "auto",
        outline: customize ? "1px solid var(--line)" : "none",
        outlineOffset: 2, borderRadius: 10, position: "relative",
      }}>
        {def.colorable ? (
          <div style={{
            border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden",
            background: accent.soft,
          }}>
            {colorKey !== "none" && <div style={{ height: 3, background: accent.bar }}/>}
            {inner}
          </div>
        ) : inner}
      </div>

      {/* Resize handles — only in customise mode */}
      {customize && (
        <>
          {/* Right edge → width */}
          <div onPointerDown={startResizeX} onDragStart={(e) => e.preventDefault()}
            title="Drag to resize width"
            style={{
              position: "absolute", top: 0, right: -7, width: 14, bottom: 0,
              cursor: "ew-resize", pointerEvents: "auto", zIndex: 5,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <span style={{
              width: 5, height: 40, borderRadius: 99,
              background: resizing === "x" ? handleColor : "var(--line-2)",
              boxShadow: "0 0 0 2px var(--paper)", transition: "background .12s",
            }}/>
          </div>
          {/* Bottom edge → height */}
          <div onPointerDown={startResizeY} onDragStart={(e) => e.preventDefault()}
            title="Drag to resize height · double-click to reset"
            onDoubleClick={() => api.setHeight(def.id, null)}
            style={{
              position: "absolute", left: 0, right: 0, bottom: -7, height: 14,
              cursor: "ns-resize", pointerEvents: "auto", zIndex: 5,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <span style={{
              width: 40, height: 5, borderRadius: 99,
              background: resizing === "y" ? handleColor : "var(--line-2)",
              boxShadow: "0 0 0 2px var(--paper)", transition: "background .12s",
            }}/>
          </div>
          {/* Live size badge */}
          {resizing && (
            <div style={{
              position: "absolute", top: 6, right: 10, zIndex: 6,
              padding: "3px 9px", borderRadius: 6, background: "var(--ink)", color: "var(--paper)",
              fontSize: 11, fontWeight: 600, pointerEvents: "none",
            }}>
              {resizing === "x" ? `${liveCols || cols} / 12 cols` : `${height || ""}px`}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Hidden-widgets tray (shown in customise mode) ───────────────────────────
const HiddenTray = ({ defs, config, api }) => {
  const hidden = config.order.filter((id) => config.hidden.includes(id))
    .map((id) => defs.find((d) => d.id === id)).filter(Boolean);
  if (hidden.length === 0) return null;
  return (
    <div style={{
      gridColumn: "span 12", marginTop: 4,
      padding: "12px 14px", border: "1px dashed var(--line-2)", borderRadius: 10,
      background: "var(--paper-2)",
    }}>
      <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, marginBottom: 8 }}>
        Hidden widgets — click to add back
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {hidden.map((d) => (
          <button key={d.id} onClick={() => api.show(d.id)} style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px",
            border: "1px solid var(--line)", borderRadius: 7, background: "var(--paper)",
            color: "var(--text)", fontSize: 12.5, fontWeight: 500, cursor: "pointer",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--paper)"}>
            <I.plus size={12}/> {d.title}
          </button>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, {
  DASH_SPANS, DASH_COLORS, spanCols,
  useDashboardConfig, DashCustomizeBar, WidgetFrame, HiddenTray,
});
