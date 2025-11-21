---
title: Hints & Tips
---

## AI-Assisted Development

<Tip>
Adding this documentation to MCP (Model Context Protocol) in Cursor or other AI editors will significantly improve your AI-assisted development and debugging experience. The AI will have access to all documentation context, making it more accurate and helpful. See [Configure Cursor](./configure-cursor) for setup instructions.
</Tip>

### Using Cursor for Contract Development
- **Scaffold contracts**: Describe your contract rules and let Cursor generate the state and entrypoints
- **Tighten invariants**: Add `require` checks for time windows, unique votes, and bounds
- **Extend tests**: Add negative test cases first, then fix the contract based on failures
- **Gas optimization**: Avoid unbounded loops; use `Map` lookups; keep events small

### Using Cursor for Plugin Development
- **Generate plugin structure**: Describe your plugin's purpose and let Cursor scaffold the basic structure
- **Implement interfaces**: Use Cursor to implement `FeedPlugin` or `PopularRankingContributor` interfaces
- **Add error handling**: Generate comprehensive error handling for API calls and data processing
- **Write tests**: Create test cases for your plugin's functionality

## Troubleshooting

### Common Contract Issues
- **Compiler version error**: Adjust the pragma version or Docker image version
- **Cannot reach compiler**: Ensure Docker container is running on port `:3080`; check environment variables
- **Decoding errors**: Simplify return types; ensure ACI matches bytecode
- **Testnet transaction failures**: Ensure your key is funded; verify gas/fee limits and node URL
- **Debug quickly**: Use dry-run calls; add temporary view entrypoints (remove before deploying)

### Common Plugin Issues
- **Plugin not loading**: Check that the plugin is properly registered in the configuration
- **API errors**: Verify API endpoints and authentication tokens
- **Feed not updating**: Ensure your plugin is correctly implementing the `FeedPlugin` interface
- **Ranking not working**: Verify that `PopularRankingContributor` is properly implemented and registered

### Getting Help
- Check the [æforum](https://forum.aeternity.com/) for community discussions
- Review the [References](./references) page for documentation links
- Search existing GitHub issues in the Superhero repositories

## Security Best Practices

### Contract Security
- **Authentication**: Use `Call.caller` to verify transaction sender; reject unauthorized changes early
- **Time windows**: Enforce open/close times consistently; prevent late voting or expired actions
- **Input validation**: Validate all inputs (non-empty strings, ≥ 2 options, index bounds, unique values)
- **Access control**: Guard against duplicate actions (e.g., one vote per address via `votesByAddress`)
- **Gas optimization**: Use `Map` for lookups; avoid unbounded loops; keep strings small
- **Events**: Emit events (`PollCreated`, `Voted`, `Closed`) with small payloads
- **ACI stability**: Use simple return types; maintain stable entrypoint names
- **Testing**: Include negative test cases; dry-run heavy execution paths
- **Versioning**: Pin compiler version; document init arguments; plan for migrations

### Plugin Security
- **Input sanitization**: Validate and sanitize all user inputs and API responses
- **Error handling**: Never expose sensitive information in error messages
- **Rate limiting**: Implement rate limiting for API calls to prevent abuse
- **Authentication**: Securely store and use API keys and tokens
- **Data validation**: Validate all data before processing or storing

## Pre-Deployment Checklist

### Contract Checklist
- [ ] Environment ready (`VITE_*` variables set); addresses configured per network
- [ ] Contract compiled and tested (positive + negative test cases)
- [ ] Integration wired (wallet connect; ACI loaded; errors handled)
- [ ] Gas costs reviewed and optimized
- [ ] Security audit completed (or at least reviewed)
- [ ] README includes setup instructions, environment docs, contract addresses, and sample accounts

### Plugin Checklist
- [ ] Plugin properly registered in configuration
- [ ] All required interfaces implemented correctly
- [ ] Error handling comprehensive and tested
- [ ] API endpoints verified and authenticated
- [ ] Rate limiting implemented where needed
- [ ] Documentation updated with plugin usage instructions
- [ ] Integration tests passing

<Tip>
Keep a development log of issues you encounter and their solutions. This will help you debug faster in the future!
</Tip>
