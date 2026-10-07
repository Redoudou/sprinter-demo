# Repository audit — October 7, 2026

Scope: make the repository a usable basic demo of Sprinter Credit, based on the user-specified Credit API overview and the live OpenAPI contract.

| Finding                                                                    | Impact                                            | Resolution                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Existing app demonstrated obsolete aggregation, not Credit                 | Wrong product and API                             | Replaced with protocol discovery, account position, lock/draw/repay/unlock using current V2 endpoints                   |
| Placeholder account and fetch using stale state                            | Invalid balance requests                          | Real wallet connection or explicit read-only address; cancellable position loading                                      |
| SDK constructed every render and token arguments/response shapes incorrect | Broken integration                                | Removed unrelated SDK; isolated Credit HTTP and wallet helpers                                                          |
| Payment handler only logged; destination address unused                    | False completion                                  | Unsigned call review, sequential wallet execution, receipt checks, honest partial-failure status and transaction hashes |
| Amounts converted with Number                                              | Loss of integer precision                         | Preserve base-unit strings and use BigInt for validation and hex conversion                                             |
| No input validation, loading, visible errors, or stale-request guards      | Invalid/repeated requests and misleading previews | Explicit validation, disabled busy controls, visible failures, request version checks and preview invalidation          |
| React Scripts 3 with React 18, missing test dependencies, stale CRA test   | Unreliable install/build/test                     | Vite/Vitest, declared testing dependencies, committed lockfile, CI                                                      |
| 40,000+ vendored dependency files and backup lockfile committed            | Repository bloat and stale dependency surface     | Untracked vendored directory and removed obsolete backup; ignored generated files                                       |
| Generic README and unused CRA assets                                       | Unclear setup and scope                           | Credit-specific setup, API mapping, usage, limitations, and metadata                                                    |

## Checks

- Unit and component regressions exercise the API and wallet failure paths without spending funds.
- Production bundle builds successfully on Node 24.
- Live protocol discovery, zero-position account lookup, and V2 unsigned USDC lock calls verified against api.sprinter.tech, including browser CORS.
- The browser renders the actual live position and the approval + lock transaction preview.
- npm dependency audit is checked against the final lockfile.

## Remaining manual validation

Use a funded wallet on the configured network to run lock → draw → repay → unlock. Review every wallet prompt. No live signatures or broadcasts were performed during this audit. This repository is an integration demo, not a smart-contract security audit or production lending interface. Advanced operator/auto top-up and standalone earn-vault flows are deferred.

## Product experience follow-up

The default screen is now a visual, persona-based playground instead of an API form. It explains who could use Sprinter and what changes for them through four interactive simulations: liquidity provision, collateral-backed borrowing, credit-backed card spending, and cross-chain operator liquidity. Examples use readable dollar amounts and explicit simulation labels. There are no invented APYs, live LP deposit controls, or claims that the Credit workspace implements Liquidity. The live Credit workspace remains available separately and navigation back is disabled during execution.

Additional regression tests verify simulation isolation from APIs/wallets, example credit/debt arithmetic, and resets when changing the goal or amount. Desktop and mobile layouts and the live-workspace switch are checked in the browser.
