# Agent Skills

## Frontend Design

Create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

### Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

### Aesthetics Guidelines

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive choices that elevate aesthetics. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic aesthetics: overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts, or cookie-cutter design that lacks context-specific character.

Match implementation complexity to the aesthetic vision. Elegance comes from executing the vision well — don't hold back.

---

## Electron Security

This is a local-only personal finance app. No data should ever leave the device. Enforce this at every layer.

### BrowserWindow

Always set these in `webPreferences`:
```ts
contextIsolation: true,
sandbox: true
```
Never set `nodeIntegration: true` or `sandbox: false`.

### Preload

- Only use `contextBridge.exposeInMainWorld` — never assign APIs directly to `window` as a fallback.
- Expose the minimum surface area needed. Do not forward raw IPC channel names.

### IPC Handlers (main process)

- **Never accept file paths from the renderer.** File dialogs must be opened in the main process. If the renderer needs file contents, use a single atomic IPC handler that opens the dialog AND reads the file, returning only the contents.
- **Validate and sanitize all renderer input** before using it in SQL or filesystem calls.
- **Use parameterized queries** for all SQLite operations — never interpolate renderer-supplied strings into SQL.
- Before destructive operations (e.g., clearing transactions), write a JSON backup to `app.getPath('userData')`.

### Networking / CSP

- The `Content-Security-Policy` must not allow any external origins (`default-src 'self'`).
- No external font services, CDNs, or analytics. Use self-hosted fonts (`@fontsource/*`).
- Do not add `connect-src` entries for remote hosts.

### Logging

- Wrap `console.log` calls that expose file paths or user data with `if (is.dev)`.
- Never log sensitive financial data.

### Database

- Run `PRAGMA wal_checkpoint(RESTART)` before closing the database on quit to ensure WAL frames are flushed.
- Keep `foreign_keys = ON` and `journal_mode = WAL` pragmas.
