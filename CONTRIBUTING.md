# Contributing

Thanks for contributing to Travelog.

## Development Setup

1. Install deps: `npm install`
2. Copy env: `cp .env.example .env`
3. Add `VITE_GOOGLE_MAPS_API_KEY`
4. Run stack: `npm run dev:stack`

## Commit And PR Expectations

- Keep commits scoped and descriptive.
- Run checks before pushing:
  - `npm run check`
  - `npm run build`
- Include test coverage for backend behavior changes.
- Update docs (`README.md`, `AGENTS.md`, `docs/openapi.yaml`) when behavior changes.

## Code Style

- Frontend: TypeScript + ESLint
- Backend: Go, `gofmt` required
- Prefer explicit, readable code over clever abstractions.

## Security

- Do not commit secrets (`.env`, tokens, private keys).
- If a vulnerability is found, contact project maintainers directly.
