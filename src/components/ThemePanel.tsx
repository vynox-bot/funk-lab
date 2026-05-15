"use client";

import { useTheme, PRESETS, DEFAULT_THEME, type Theme } from "@/lib/theme-context";

const FIELDS: { key: keyof Theme; label: string }[] = [
  { key: "primary", label: "Primary Accent" },
  { key: "secondary", label: "Secondary Accent" },
  { key: "bg", label: "Background" },
  { key: "card", label: "Card Background" },
  { key: "border", label: "Border Color" },
];

function isPreset(a: Theme, b: Theme) {
  return (
    a.primary === b.primary &&
    a.secondary === b.secondary &&
    a.bg === b.bg &&
    a.card === b.card &&
    a.border === b.border
  );
}

export function ThemePanel() {
  const { theme, setTheme, panelOpen, setPanelOpen } = useTheme();

  if (!panelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => setPanelOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 z-50 flex flex-col shadow-2xl"
        style={{ background: "var(--funk-card)", borderLeft: "1px solid var(--funk-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 sticky top-0 z-10"
          style={{ background: "var(--funk-card)", borderBottom: "1px solid var(--funk-border)" }}
        >
          <div>
            <h2 className="text-white font-black text-lg">Theme</h2>
            <p className="text-zinc-500 text-xs">Customize your look</p>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition-colors text-xl"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "#333")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "transparent")}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          {/* Presets */}
          <section>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Presets</p>
            <div className="flex flex-col gap-2">
              {PRESETS.map((preset) => {
                const active = isPreset(theme, preset.theme);
                return (
                  <button
                    key={preset.name}
                    onClick={() => setTheme(preset.theme)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      border: `1px solid ${active ? theme.primary : "var(--funk-border)"}`,
                      background: active ? `${theme.primary}18` : "transparent",
                    }}
                  >
                    {/* Color preview dots */}
                    <div className="flex gap-1 flex-shrink-0">
                      {[preset.theme.primary, preset.theme.secondary, preset.theme.card].map((c, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full"
                          style={{ background: c, border: "1px solid rgba(255,255,255,0.15)" }}
                        />
                      ))}
                    </div>
                    <span className={`text-sm font-semibold ${active ? "text-white" : "text-zinc-400"}`}>
                      {preset.name}
                    </span>
                    {active && (
                      <span className="ml-auto text-xs font-bold" style={{ color: theme.primary }}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Custom colors */}
          <section>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Custom Colors</p>
            <div className="flex flex-col gap-4">
              {FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-zinc-300 flex-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 font-mono">{theme[key]}</span>
                    {/* Color swatch with hidden input */}
                    <div
                      className="relative w-8 h-8 rounded-lg overflow-hidden cursor-pointer flex-shrink-0"
                      style={{
                        background: theme[key],
                        border: "2px solid var(--funk-border)",
                      }}
                    >
                      <input
                        type="color"
                        value={theme[key]}
                        onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid var(--funk-border)" }}>
          <button
            onClick={() => setTheme(DEFAULT_THEME)}
            className="w-full py-2.5 rounded-xl text-zinc-400 hover:text-white text-sm font-semibold transition-colors"
            style={{ border: "1px solid var(--funk-border)" }}
          >
            Reset to Default
          </button>
        </div>
      </div>
    </>
  );
}
