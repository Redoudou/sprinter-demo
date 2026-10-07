export const API_URL =
  import.meta.env.VITE_SPRINTER_API_URL || "https://api.sprinter.tech";
export const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(value);
export const isAmount = (value) => /^\d+$/.test(value) && BigInt(value) > 0n;

export async function request(path, params = {}, signal) {
  const url = new URL(path, API_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined)
      url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`API returned an invalid response (${response.status}).`);
  }
  if (!response.ok)
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : body.message || `API request failed (${response.status}).`,
    );
  return body;
}

export function actionRequest(account, creditAsset, action, form) {
  if (!isAddress(account))
    throw new Error("Enter a valid Ethereum account address.");
  if (!isAmount(form.amount))
    throw new Error("Enter a positive whole amount in base units.");
  if (!["lock", "draw", "repay", "unlock"].includes(action))
    throw new Error("Unsupported credit action.");
  const params = { amount: form.amount };
  if (action === "lock" || action === "unlock") {
    if (!isAddress(form.collateral))
      throw new Error("Select a supported collateral asset.");
    params[action === "lock" ? "earnAsset" : "collateral"] = form.collateral;
  }
  if (action === "lock" && form.earn) params.earn = form.earn;
  if (action === "unlock") params.unwrap = form.unwrap;
  if (action === "draw") {
    if (!isAddress(form.receiver))
      throw new Error("Enter a valid receiver address.");
    params.receiver = form.receiver;
  }
  return {
    path: `/credit/v2/accounts/${account}/assets/${encodeURIComponent(creditAsset)}/${action}`,
    params,
  };
}

export function normalizeCalls(response) {
  if (!Array.isArray(response.calls))
    throw new Error("API response is missing transaction calls.");
  return response.calls.map((call) => {
    // The Go schema describes byte arrays; the live API serializes hex strings.
    const hex = (value) =>
      Array.isArray(value) &&
      value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
        ? `0x${value.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`
        : value;
    const chain = String(call.chain).replace(/^eip155:/, "");
    const to = hex(call.to),
      data = hex(call.data);
    if (
      !/^\d+$/.test(chain) ||
      BigInt(chain) <= 0n ||
      !isAddress(to) ||
      !/^0x(?:[\da-fA-F]{2})*$/.test(data) ||
      !/^\d+$/.test(String(call.value))
    ) {
      throw new Error("API returned an invalid transaction call.");
    }
    return { chain, to, data, value: String(call.value) };
  });
}

export async function waitForReceipt(
  provider,
  hash,
  { timeout = 180000, interval = 1500 } = {},
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    });
    if (receipt) {
      if (BigInt(receipt.status) !== 1n)
        throw new Error(
          "Transaction reverted. Stop and rebuild after checking your position.",
        );
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(
    "Confirmation timed out. Check the transaction hash before building another request.",
  );
}

export async function executeCalls(provider, account, calls, onProgress) {
  for (let index = 0; index < calls.length; index++) {
    const call = calls[index];
    const checkAccount = async () => {
      const accounts = await provider.request({ method: "eth_accounts" });
      if (accounts[0]?.toLowerCase() !== account.toLowerCase())
        throw new Error(
          "Wallet account changed. Reconnect and rebuild the request.",
        );
    };
    await checkAccount();
    const chainId = `0x${BigInt(call.chain).toString(16)}`;
    if (
      BigInt(await provider.request({ method: "eth_chainId" })) !==
      BigInt(chainId)
    ) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });
    }
    await checkAccount();
    if (
      BigInt(await provider.request({ method: "eth_chainId" })) !==
      BigInt(chainId)
    )
      throw new Error("Wallet is on the wrong network.");
    onProgress({ index, state: "signing" });
    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to: call.to,
          data: call.data,
          value: `0x${BigInt(call.value).toString(16)}`,
        },
      ],
    });
    onProgress({ index, state: "pending", hash });
    await waitForReceipt(provider, hash);
    onProgress({ index, state: "confirmed", hash });
  }
}
