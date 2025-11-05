# Middleware and Data Access

!!! note
    Your extension will often need to read blockchain data (txs, contracts, events). The æternity middleware provides indexed APIs so you don't have to parse blocks manually.

## What is the middleware?
A service indexing on‑chain data (transactions, contracts, names, etc.) and exposing REST/GraphQL endpoints for query and filtering.

## Typical queries
- Fetch account transactions
- Lookup contract calls/events by contract address
- Paginate and filter by time or height

!!! tip
    Keep responses small: request only the fields you need and paginate.

## Usage patterns
- Server‑side: call the middleware from your extension’s backend
- Client‑side: call from the extension UI (consider CORS and rate limits)

## Superhero API (optional, upcoming)
We're adding an option to build Superhero API extensions that tailor data (transactions and contract interactions) for your use case. This can simplify complex queries you'd otherwise perform directly against middleware.

!!! warning
    Until the Superhero API extension path is available, plan to fetch directly from middleware.

## Next
- Back to [Deploy: devnet and testnet](./07-deploy-devnet-and-testnet.md)
- Continue to [Integrate into Superhero extension](./08-integrate-into-superhero-extension.md)
