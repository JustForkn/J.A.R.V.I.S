# J.A.R.V.I.S. Ultimate Interface

A futuristic J.A.R.V.I.S.-inspired dashboard for a Fish Audio agent.

## Files

- `index.html` — main page and Fish Audio agent embed
- `styles.css` — complete HUD styling, animations, responsive layout
- `app.js` — navigation, telemetry, diagnostics, settings and UI effects

## Fish Audio

The page uses the provided agent:

```html
<fish-agent agent-id="123804c0d13f458d84ad6f1e8f98f4a5"></fish-agent>
```

and loads:

```html
<script src="https://unpkg.com/@fishaudio/agent-widget-embed" async type="text/javascript"></script>
```

### GitHub Pages origin

Because the agent works on GitHub Pages, make sure the Fish Audio agent's Public Access configuration includes the origin of the GitHub Pages site that hosts this project, for example:

`https://YOUR-USERNAME.github.io`

Do not add the repository path as part of the origin.

## GitHub Pages

1. Create or open a GitHub repository.
2. Upload all three files.
3. Make sure `index.html` is at the repository root.
4. Enable GitHub Pages from the repository's Pages settings.
5. Open the generated GitHub Pages URL.
6. If the Fish Audio agent rejects the page, verify the exact GitHub Pages origin is listed in Fish Audio Public Access and republish the agent.

## Notes

The interface is browser-only. It does not require a backend.

The telemetry shown in the dashboard is interface telemetry rather than a claim of access to a remote server or computer. The Fish Audio widget remains responsible for the actual voice-agent conversation.
