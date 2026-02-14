# Deployment Guide

## Recommended Production Tagging

Prefer immutable image references over `latest`.

Example:
- `ghcr.io/<owner>/<repo>:sha-<commit>`

## Rollback Procedure

1. Identify last known good image tag.
2. Update deployment to that tag.
3. Redeploy stack.
4. Confirm health (`docker logs`, HTTP checks).

## Portainer + GHCR Flow

1. GH Actions publishes `sha-*` tags.
2. Deployment references pinned `sha-*` tag.
3. On incident, roll back to previous `sha-*`.

## Notes For SQLite

- Keep persistent volume mounted to `/data`.
- Ensure host directory permissions allow container user writes.
