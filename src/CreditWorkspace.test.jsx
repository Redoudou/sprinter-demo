import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./CreditWorkspace";
import { request } from "./credit";
vi.mock("./credit", async (importOriginal) => ({
  ...(await importOriginal()),
  request: vi.fn(),
}));
const account = "0x0000000000000000000000000000000000000001";
const collateral = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const protocol = {
  chains: {
    "eip155:8453": {
      creditHubs: { usdc: {} },
      collateral: { [`erc20:${collateral}`]: { symbol: "USDC", ltv: 9000 } },
      strategies: {},
    },
  },
};
const response = {
  calls: [{ chain: "eip155:8453", to: collateral, data: "0x1234", value: "0" }],
};
beforeEach(() => {
  request.mockReset().mockImplementation(async (path) =>
    path === "/credit/protocol"
      ? protocol
      : path.endsWith("/info")
        ? {
            data: {
              usdc: {
                debt: "0",
                totalCollateralValue: "0",
                remainingCreditCapacity: "0",
              },
            },
          }
        : response,
  );
  delete window.ethereum;
});
async function ready() {
  render(<App />);
  await screen.findByRole("option", { name: "Base" });
  await userEvent.type(screen.getByLabelText("Account address"), account);
  await screen.findByText("No debt");
  await userEvent.type(
    screen.getByLabelText("Amount in base units"),
    "1000000",
  );
}
test("loads protocol and builds a credit preview without a wallet", async () => {
  await ready();
  await userEvent.click(
    screen.getByRole("button", { name: /Build transaction/ }),
  );
  expect(
    await screen.findByRole("region", { name: "Transaction preview" }),
  ).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining("/credit/v2/accounts/"),
    { amount: "1000000", earnAsset: collateral },
  );
  expect(
    screen.getByRole("button", { name: "Sign and execute in wallet" }),
  ).toBeDisabled();
});
test("invalidates a preview when an input changes", async () => {
  await ready();
  await userEvent.click(
    screen.getByRole("button", { name: /Build transaction/ }),
  );
  await screen.findByRole("region", { name: "Transaction preview" });
  await userEvent.type(screen.getByLabelText("Amount in base units"), "1");
  expect(
    screen.queryByRole("region", { name: "Transaction preview" }),
  ).not.toBeInTheDocument();
});
test("discards a late build response after changing action", async () => {
  await ready();
  let resolve;
  request.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Build transaction/ }),
  );
  await userEvent.click(screen.getByRole("button", { name: /Draw credit/ }));
  resolve(response);
  await waitFor(() =>
    expect(screen.getByLabelText("Receiver address")).toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("region", { name: "Transaction preview" }),
  ).not.toBeInTheDocument();
});
test("shows API failures and allows another request", async () => {
  await ready();
  request.mockRejectedValueOnce(new Error("Insufficient collateral"));
  await userEvent.click(
    screen.getByRole("button", { name: /Build transaction/ }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Insufficient collateral",
  );
  expect(
    screen.getByRole("button", { name: /Build transaction/ }),
  ).toBeEnabled();
});
test("explains missing wallet access", async () => {
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Install an Ethereum wallet",
  );
});

test("reports execution in progress so the playground cannot unmount a pending transaction", async () => {
  const onBusyChange = vi.fn();
  let releaseSignature;
  window.ethereum = {
    request: vi.fn(async ({ method }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts")
        return [account];
      if (method === "eth_chainId") return "0x2105";
      if (method === "eth_sendTransaction")
        return new Promise((resolve) => {
          releaseSignature = resolve;
        });
      if (method === "eth_getTransactionReceipt") return { status: "0x1" };
    }),
  };
  render(<App onBusyChange={onBusyChange} />);
  await screen.findByRole("option", { name: "Base" });
  await userEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
  await userEvent.type(
    screen.getByLabelText("Amount in base units"),
    "1000000",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Build transaction/ }),
  );
  await screen.findByRole("region", { name: "Transaction preview" });
  await userEvent.click(
    screen.getByRole("button", { name: "Sign and execute in wallet" }),
  );
  await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
  expect(
    screen.getByRole("button", { name: /Waiting for wallet/ }),
  ).toBeDisabled();
  releaseSignature("0xexamplehash");
  await screen.findByText(/All transactions confirmed/);
  await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
});
