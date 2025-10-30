# Backend Integration for App Extensions

This guide explains how to integrate an extension with a backend service. For Social Superhero, we reference the `superhero-api` repository.

## When to use a backend
- Indexing historical data and building feeds
- Search and rich queries
- WebSocket push updates
- Off-chain validation

## Setup superhero-api
- Repo: https://github.com/superhero-com/superhero-api
- Quick start (Docker): see repository README
- Configure ENV in frontend: `VITE_EXT_<YOUR_EXT>_API_URL`

## Client in extension
Create a small client under `src/plugins/<id>/client/backend.ts` and read the base URL from `VITE_EXT_<ID>_API_URL` or runtime `__SUPERCONFIG__`.

## Patterns
- Pagination tokens instead of page numbers
- Idempotent POSTs, signed requests where needed
- WebSocket channels for live updates

## Error handling
- Map HTTP errors to user-friendly messages
- Retry with backoff
