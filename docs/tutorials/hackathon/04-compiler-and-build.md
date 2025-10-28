# 04 — Compiler and build

Set up the Sophia HTTP compiler and connect your tests to it.

## Local compiler (recommended in hackathons)
Run the compiler in Docker:
```bash
docker run --rm -p 3080:3080 aeternity/aesophia_http:latest
```
This exposes the compiler at `http://localhost:3080`.

## Remote compiler (optional)
If a public compiler is provided in official docs, set `COMPILER_URL` to that. Otherwise use the local Docker compiler above for reliable results.

## Pinning versions
In your Sophia sources, use the compiler pragma (example):
```
pragma solidity 6.5.0
```
Adjust to a version supported by your `aesophia_http` image. Check the `aesophia` release notes if compilation fails.

## Next
- [05 — Contract walkthrough: Poll](./05-contract-poll-walkthrough.md)
- [06 — Testing with Vitest](./06-testing-with-vitest.md)
