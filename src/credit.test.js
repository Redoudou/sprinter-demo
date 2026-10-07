import {
  actionRequest,
  executeCalls,
  isAmount,
  normalizeCalls,
  request,
  waitForReceipt,
} from "./credit";

const account = "0x0000000000000000000000000000000000000001";
const to = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const call = { chain: "8453", to, data: "0x1234", value: "0" };
const form = {
  amount: "1000000",
  collateral: to,
  receiver: account,
  earn: "",
  unwrap: false,
};

test.each(["0", "-1", "0.1", "1e6", "", "Infinity"])(
  "rejects invalid base-unit amount %s",
  (amount) => expect(isAmount(amount)).toBe(false),
);
test("preserves amounts larger than JavaScript safe integers", () => {
  expect(
    actionRequest(account, "usdc", "repay", {
      ...form,
      amount: "90071992547409931234",
    }).params.amount,
  ).toBe("90071992547409931234");
});
test.each([
  ["lock", { amount: "1000000", earnAsset: to }],
  ["draw", { amount: "1000000", receiver: account }],
  ["repay", { amount: "1000000" }],
  ["unlock", { amount: "1000000", collateral: to, unwrap: false }],
])("builds the documented V2 %s request", (action, params) => {
  expect(actionRequest(account, "usdc", action, form)).toEqual({
    path: `/credit/v2/accounts/${account}/assets/usdc/${action}`,
    params,
  });
});
test("rejects invalid account and receiver before requesting calldata", () => {
  expect(() => actionRequest("0x1234", "usdc", "lock", form)).toThrow(
    /account/,
  );
  expect(() =>
    actionRequest(account, "usdc", "draw", { ...form, receiver: "bad" }),
  ).toThrow(/receiver/);
});
test("normalizes live CAIP chains and schema byte arrays", () => {
  expect(
    normalizeCalls({ calls: [{ ...call, chain: "eip155:8453" }] }),
  ).toEqual([call]);
  expect(
    normalizeCalls({
      calls: [{ ...call, to: Array(20).fill(1), data: [18, 52] }],
    })[0].data,
  ).toBe("0x1234");
});
test.each([
  { calls: null },
  { calls: [{ ...call, to: "bad" }] },
  { calls: [{ ...call, data: "0xz" }] },
  { calls: [{ ...call, value: "-1" }] },
])("rejects malformed call data", (response) =>
  expect(() => normalizeCalls(response)).toThrow(),
);
test("surfaces HTTP errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Insufficient collateral" }),
      }),
  );
  await expect(request("/credit/protocol")).rejects.toThrow(
    "Insufficient collateral",
  );
  vi.unstubAllGlobals();
});
function providerFor(status = "0x1") {
  const events = [];
  const provider = {
    request: vi.fn(async ({ method, params }) => {
      events.push(method);
      if (method === "eth_accounts") return [account];
      if (method === "eth_chainId") return "0x2105";
      if (method === "eth_sendTransaction") return `0xhash${params[0].data}`;
      if (method === "eth_getTransactionReceipt") return { status };
    }),
  };
  return { provider, events };
}
test("confirms approval before sending the next call and converts value to hex", async () => {
  const { provider, events } = providerFor();
  const progress = vi.fn();
  await executeCalls(
    provider,
    account,
    [call, { ...call, data: "0x5678" }],
    progress,
  );
  const firstReceipt = events.indexOf("eth_getTransactionReceipt");
  expect(firstReceipt).toBeLessThan(events.lastIndexOf("eth_sendTransaction"));
  expect(provider.request).toHaveBeenCalledWith({
    method: "eth_sendTransaction",
    params: [{ from: account, to, data: "0x1234", value: "0x0" }],
  });
  expect(progress).toHaveBeenLastCalledWith(
    expect.objectContaining({ index: 1, state: "confirmed" }),
  );
});
test("stops on reverted approval and does not send the second call", async () => {
  const { provider, events } = providerFor("0x0");
  await expect(
    executeCalls(provider, account, [call, call], vi.fn()),
  ).rejects.toThrow(/reverted/);
  expect(
    events.filter((event) => event === "eth_sendTransaction"),
  ).toHaveLength(1);
});
test("does not send when the wallet account changed", async () => {
  const provider = { request: vi.fn().mockResolvedValue([to]) };
  await expect(
    executeCalls(provider, account, [call], vi.fn()),
  ).rejects.toThrow(/account changed/);
  expect(provider.request).toHaveBeenCalledTimes(1);
});
test("switches chain before signing", async () => {
  let chain = "0x1";
  const { provider } = providerFor();
  const original = provider.request;
  provider.request = vi.fn(async (args) => {
    if (args.method === "eth_chainId") return chain;
    if (args.method === "wallet_switchEthereumChain") {
      chain = args.params[0].chainId;
      return;
    }
    return original(args);
  });
  await executeCalls(provider, account, [call], vi.fn());
  expect(provider.request).toHaveBeenCalledWith({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x2105" }],
  });
});
test("pending receipts time out without falsely reporting completion", async () => {
  const provider = { request: vi.fn().mockResolvedValue(null) };
  await expect(
    waitForReceipt(provider, "0xhash", { timeout: 1, interval: 2 }),
  ).rejects.toThrow(/timed out/);
});
