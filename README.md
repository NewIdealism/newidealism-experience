# New Idealism Journey Engine (v2)

This is a single reusable page that turns a `steps.json` file into an immersive, click-through experience:
- Video embed
- Optional transcript
- One question
- Typing mode (full-bleed, typewriter vibe)
- Ink mode (handwriting/sketch on a canvas)
- Local autosave (browser only)
- Compiles everything into a downloadable text artifact at the end

## Quick start (local)
Because the engine loads `steps.json` via `fetch()`, you should run a tiny local web server.

Example (Python):
- Open a terminal in this folder
- Run: `python -m http.server 8000`
- Visit: `http://localhost:8000/?step=1`

## Hosting (simple)
Any static host works:
- GitHub Pages
- Cloudflare Pages
- Netlify

## Editing content
Open `steps.json` and change:
- `video_url`
- `transcript`
- `question`
- `prompt_hint`

Add more steps by adding more objects. Set `next` to another step id. The last step should use `"next": "complete"`.

## Carrd linking
Your Carrd "Enter" button can link to:
`https://YOURDOMAIN.com/journey/?step=1`
(or whatever your host URL is)

## Choose-your-own-adventure later
Instead of `"next": "2"`, you can change the engine to support:
`"next": [{"label":"Path A","to":"2"},{"label":"Path B","to":"9"}]`
That is a small UI upgrade.
