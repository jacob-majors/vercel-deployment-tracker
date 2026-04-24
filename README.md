# Deplog Menu Bar

A macOS menu bar app inspired by the Deplog screenshots you shared. It lives in the tray, opens into a rounded dark panel, and monitors:

- Vercel deployments
- GitHub Actions workflow runs

It works immediately with high-fidelity mock data and switches to live data as soon as you add your tokens.

## Stack

- Electron tray app
- React + Vite renderer
- TypeScript everywhere

## Run It

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment

```bash
VERCEL_TOKEN=your_vercel_access_token
VERCEL_TEAM_ID=optional_team_id
VERCEL_PROJECT_IDS=optional_project_id_1,optional_project_id_2
GITHUB_TOKEN=your_github_token
GITHUB_REPOS=owner/repo-one,owner/repo-two
```

Notes:

- `VERCEL_TOKEN` enables live Vercel deployment polling from `GET /v6/deployments`.
- `VERCEL_TEAM_ID` is optional and lets you read team deployments.
- `GITHUB_TOKEN` plus `GITHUB_REPOS` enables live GitHub Actions polling from the workflow runs REST API.
- Polling refreshes every 30 seconds.

## Build

```bash
npm run build
```

To produce a macOS app bundle:

```bash
npm run dist:mac
```

## Behavior

- Click the tray icon to open or hide the panel
- Switch between Vercel and GitHub tabs
- Open a deployment detail view
- Jump out to Vercel or GitHub in the browser
- Quit directly from the panel

## References

- Electron Tray tutorial: https://www.electronjs.org/docs/latest/tutorial/tray
- Electron BrowserWindow docs: https://www.electronjs.org/docs/api/browser-window
- Vercel deployments API: https://vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments
- GitHub workflow runs API: https://docs.github.com/v3/actions/workflow-runs/
