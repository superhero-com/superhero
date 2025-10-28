# 10 — Troubleshooting & FAQ

## Compiler fails with version error
- Adjust the pragma to a version supported by your `aesophia_http` image
- Pull latest image or pin a matching version

## Cannot reach compiler at http://localhost:3080
- Ensure Docker container is running
- Check port 3080 is free
- Verify `COMPILER_URL` env variable is set in tests/app

## SDK call throws decoding error
- Simplify return types; prefer lists/records with primitive fields
- Ensure ACI matches deployed bytecode

## Transactions are failing on testnet
- Verify your test key is funded
- Check gas/fee parameters and network URL

## Duplicate vote not rejected
- Add `require(votesByAddress[caller] == None, "Already voted")` logic

## Results computation times out
- Avoid iterating over all voters; maintain a `tally` map updated per vote

## How do I debug quickly?
- Use the SDK dry‑run to simulate calls
- Add temporary view entrypoints that expose internal state (remove before deploy)

## Where to ask for help?
- Community Q&A: https://forum.aeternity.com/c/sophia-smart-contracts/38
