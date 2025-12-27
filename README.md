# WriterAI

WriterAI is a minimal writing app:

- Left sidebar: a list of pages
- Main area: a plain-text editor
- Optional Markdown preview (toggle)

Data is persisted in Postgres via a small Node/Express API.

## Features

- **Pages**: create and select pages from the sidebar
- **Rename**: open the row actions (three-dots) → inline actions strip → rename icon
- **Autosave**: typing updates local state immediately and persists to the API with a short debounce (~350ms)
- **Markdown preview**: uses `marked` to render the current page content
	- Preserves extra vertical spacing (blank lines) so preview matches the editor more closely
	- Continues bullet lists on Enter for `- ` and `* `

## Docker Compose (recommended for reviewers)

Runs the full stack locally:

- `web`: Nginx serving the Angular build on `http://localhost:4200/`
- `api`: Node/Express API on `http://localhost:3001/`
- `postgres`: Postgres 16

Start:

```bash
npm run compose:up
```

Open:

- http://localhost:4200/

Stop:

```bash
npm run compose:down
```

Notes:

- `compose:up` runs **web + api + postgres** in Docker.
- If you later want to use `npm run dev`, stop the Docker `web` and `api` services first to avoid port conflicts on `4200` and `3001`.

If you change the frontend and want Docker to pick it up, rebuild + recreate `web`:

```bash
docker compose -p writer-ai up -d --build --force-recreate web
```

## Local development (for making code changes)

Use `npm run dev` when you are actively changing frontend/backend code and want a faster edit-run loop.

- Angular dev server runs on your machine
- API runs on your machine
- Postgres runs in Docker (same DB + `/api` endpoints)

Start Postgres (Docker) and run API + Angular dev server locally:

```bash
npm run dev
```

- Angular dev server runs at `http://localhost:4200/`
- `/api/*` is proxied to the API (see `proxy.conf.json`)

If you previously ran `npm run compose:up`, stop the Docker `web` and `api` services before running `dev`:

```bash
docker compose stop web api
```

### When to use `compose:up` vs `dev`

- `npm run compose:up`: best for reviewers (one stack, Dockerized web served by Nginx)
- `npm run dev`: best for developers making changes (no rebuilding the `web` container for every UI change)

Stop Postgres:

```bash
npm run dev:down
```

Reset Postgres volume:

```bash
npm run dev:reset
```

## Database connection (for DB viewers)

When running via Docker Compose from this repo:

- Host: `localhost`
- Port: `5432`
- Database: `writer`
- Username: `writer`
- Password: `writer`

URI:

```text
postgresql://writer:writer@localhost:5432/writer
```

## API endpoints

- `GET /healthz`
- `GET /api/pages`
- `POST /api/pages`
- `PATCH /api/pages/:id`

## Build & test

Build:

```bash
npm run build
```

Unit tests:

```bash
npm test
```

## License

MIT — see [LICENSE](LICENSE).
