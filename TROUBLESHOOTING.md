# Troubleshooting

## Styling breaks or errors after updates

If styles look wrong or you see errors after applying changes, try:

### 1. Clean restart (recommended)

```bash
npm run dev:clean
```

This clears the Next.js cache (`.next`) and starts the dev server fresh. Use this when:
- Tailwind classes aren't applying
- Styles look broken after edits
- You see build errors that don't make sense

### 2. Full clean build

```bash
npm run build:clean
```

### 3. Manual cache clear

```bash
rm -rf .next
npm run dev
```

### Why this happens

- **Tailwind v4 + Next.js**: Hot reload can get confused. The `.next` cache can hold stale CSS or content detection state.
- **Cursor/IDE**: Edits may not sync to disk before the dev server picks them up, causing inconsistent state.

### If it keeps happening

- Ensure no parent `.gitignore` (e.g. in your home directory) ignores `*` or `.*` — Tailwind can fail to scan content in that case.
- Run `npm run dev:clean` instead of `npm run dev` after making edits.
