# Sprinter Credit demo

A React demo of the [Sprinter Credit API](https://docs.sprinter.tech/api-reference/sprinter/credit/overview): **lock collateral → draw credit → repay debt → unlock collateral**.

## Run locally

Use Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm start
```

Open http://localhost:5173. No API key is required. Optional: copy `.env.example` to `.env` to point at another compatible Credit API deployment. Client configuration is public; do not put secrets in it.

```sh
npm test          # deterministic API, wallet, and UI regression tests
npm run build    # production output in dist/
npm run preview  # serve the production build locally
```

## Try the basic flow

1. Enter a valid EVM account address to inspect it, or connect an injected Ethereum wallet (such as MetaMask).
2. Select a network and credit asset from the live protocol configuration. The current API advertises Base and USDC.
3. **Lock collateral:** select an asset and enter its amount in base units. USDC uses 6 decimals: `1000000` = 1 USDC. Vault shares can use different decimals. An optional earn strategy wraps its supported underlying token before locking.
4. Build the preview. Review the contract addresses, native value, chain, and calldata. This step only fetches unsigned transactions.
5. To execute, connect the wallet matching the inspected account and click **Sign and execute in wallet**. Each approval/action is signed separately and confirmed before the next call. Keep enough native currency for gas. Add the required network to your wallet if switching fails.
6. Use **Draw credit** to specify a receiver, **Repay debt** to repay the selected credit asset, and **Unlock collateral** to withdraw collateral. Amounts are always whole base-unit strings, never floating-point numbers. The backend validates capacity and position constraints.
7. Refresh the account to see the current position. Account metrics come formatted in token units from the API; do not divide them again.

Transactions use real assets on the API's configured networks. The demo does not hold private keys or sign automatically. Requests expire locally after two minutes and are invalidated when inputs or the wallet account change. After a submission attempt, rebuild rather than replaying the previous call list. If a call fails or confirmation times out, inspect its transaction hash before continuing: earlier calls may already be confirmed. History is held in the current page session; save hashes before reloading.

## API contract

The old `@chainsafe/sprinter-sdk` aggregation integration was unrelated to Credit and has been removed. This app uses the Credit HTTP API directly:

| Purpose                | Route                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Protocol configuration | `GET /credit/protocol`                                                                   |
| Account position       | `GET /credit/accounts/{account}/info`                                                    |
| Lock                   | `GET /credit/v2/accounts/{account}/assets/{asset}/lock?amount=…&earnAsset=…&earn=…`      |
| Draw                   | `GET /credit/v2/accounts/{account}/assets/{asset}/draw?amount=…&receiver=…`              |
| Repay                  | `GET /credit/v2/accounts/{account}/assets/{asset}/repay?amount=…`                        |
| Unlock                 | `GET /credit/v2/accounts/{account}/assets/{asset}/unlock?amount=…&collateral=…&unwrap=…` |

The [live OpenAPI specification](https://api.sprinter.tech/swagger/doc.json) marks the original unversioned action routes deprecated. The app uses V2 with the credit asset in the path. Calls are normalized from `{ calls: [{ chain, to, data, value }] }`; the live server uses CAIP-2 chain IDs and hex strings. Execution checks the selected wallet and chain before sending each call and waits for a successful receipt.

Protocol configuration provides networks, credit hubs, collateral, LTVs, and earn strategies. Multi-network configurations are displayed, but a build is rejected if its returned calls do not match the selected network, because the action API has no network selector. Advanced earn wrap/unwrap/claim and auto top-up/operator management are outside this basic demo.

## Validation and limitations

Tests cover input validation, exact V2 routes, large integer amounts, API errors, stale previews, wallet changes, chain switching, sequential confirmation, reverted approvals, and timeouts. Live protocol, account-info, and unsigned lock requests were checked during development. No real transaction was signed or broadcast during verification; funded-wallet end-to-end testing remains a manual step.

See [AUDIT.md](./AUDIT.md) for findings and resolution.
