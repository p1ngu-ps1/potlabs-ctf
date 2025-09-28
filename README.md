# Infernal Prompt Trials (Prototype)

Darker, creepier two-page CTF experience for AI red-team drills. The landing page leans into a midnight vault aesthetic with a hushed navigation shell, OpenRouter harness form, and live prompt catalog pulled from `p1ngu-ps1/leaked-system-prompts`. Selecting a scenario opens an in-browser chat console wired to your chosen model. The briefing page mirrors the layout with lore and guardrails.

## Pages & Assets
- `services/frontend/public/index.html` — Vault console with sidebar navigation, search, auto-saving credential harness, collapsible prompt collections, and the chat overlay.
- `services/frontend/public/about.html` — Briefing page that mirrors the shell, delivering design tenets and safety intent.
- `services/frontend/public/assets/styles.css` — Updated ultra-dark “creep vault” theme with folder-style collections and compact chrome.
- `services/frontend/public/assets/app.js` — Client logic for session storage, local collection ingestion, search, and OpenRouter chat with sandbox preamble.
- `services/frontend/public/assets/fallback-prompts.json` — Bundled collections used when `/challenges/index.json` is absent.
- `services/frontend/public/challenges/` — Default location Cloudflare Pages/Workers can deploy; consists of `index.json` plus nested collection folders containing Markdown prompts.
  - Includes a `demo-ladder/` collection with five super-easy prompts so you can smoke-test the sandbox without external content.

## Wiring GitHub Prompts
Cloudflare Pages/Workers can sync static files directly. Populate `/challenges/index.json` with metadata and drop Markdown (or `.md5` / `.txt`) prompts into nested collection folders, for example:

```
public/
  challenges/
    index.json
    collection-alpha/
      claude-3-haiku.md
    collection-beta/
      grok3-sandbox.md
```

Each collection entry in `index.json` should supply `basePath`, `title`, and a list of prompts referencing files inside that folder. At runtime the client fetches the index first, then hydrates each prompt file. If the index is missing the UI falls back to `assets/fallback-prompts.json`.

### Generate the Manifest from Folders
During local testing (or before committing), regenerate `index.json` automatically from the contents of `services/frontend/public/challenges/`:

```bash
node scripts/generate_challenge_index.mjs
```

The script scans every subfolder for `.md`, `.md5`, and `.txt` files, builds the collections manifest, and overwrites `challenges/index.json`. Add this step to an n8n or Coolify pipeline so new prompts are always picked up.

An n8n workflow template is available at `scripts/n8n/generate-challenge-index.json`; import it into your n8n instance to run the generation, add/commit the updated manifest, and push the changes automatically.

## OpenRouter Chat Flow
1. Enter a model name (e.g., `openrouter/auto`) and an API key in the Harness form. Once both fields are filled the harness auto-saves to `localStorage`; the status indicator confirms the active model and masked key. Use **Purge Harness** to clear stored credentials when you’re done.
2. Pick a prompt and click **Open Chat**. The client builds a sandbox system prompt that wraps your scenario in CTF instructions so the model simulates the target environment.
3. Messages are POSTed directly to `https://openrouter.ai/api/v1/chat/completions` using your key and model. Errors surface inside the chat log; purge the session any time from the Harness panel.

## Local Preview
Serve `services/frontend/public` with any static server, for example:

```bash
npx http-server services/frontend/public
```

Then visit `http://localhost:8080/index.html`.

## Cloudflare Deployment Notes
- For Cloudflare Pages, set the build output directory to `services/frontend/public` so the `challenges/` folder and assets are published as-is.
- For Workers Sites, upload the same directory structure; automation can rewrite `challenges/index.json` on publish to reflect the latest collections.
- Because the client fetches Markdown files directly, ensure caching rules keep them accessible (no `Cache-Control: no-store` overrides on the CDN if you need fresh content, rely on Workers to bust cache).

## Safety Reminders
- Use expendable testing keys and rotate frequently.
- Export transcripts for peer review; do not attempt exploits on production systems.
- Replace the fallback prompts before publishing to ensure only approved scenarios ship.
