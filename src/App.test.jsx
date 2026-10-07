import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

afterEach(() => vi.unstubAllGlobals());

test("the default walkthrough never requests wallet access or live API data", async () => {
  const fetch = vi.fn();
  const walletRequest = vi.fn();
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("ethereum", { request: walletRequest });
  render(<App />);
  await userEvent.click(
    screen.getByRole("button", { name: /Simulate supplying/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Simulate a transfer/ }),
  );
  await userEvent.click(screen.getByRole("button", { name: /See settlement/ }));
  expect(
    screen.getByRole("heading", { name: "Your capital has a job." }),
  ).toBeInTheDocument();
  expect(screen.getByText("Fees + yield")).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  expect(walletRequest).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: /Connect wallet/ }),
  ).not.toBeInTheDocument();
});

test("borrowing changes available credit and repayment clears the example debt", async () => {
  render(<App />);
  await userEvent.click(
    screen.getByRole("button", { name: /Access spending money/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Simulate pledging/ }),
  );
  let outcome = screen.getByRole("region", { name: "Example outcome" });
  expect(within(outcome).getByText("$7,000")).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: /Simulate borrowing/ }),
  );
  expect(within(outcome).getByText("$4,000")).toBeInTheDocument();
  expect(within(outcome).getByText("$3,000")).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: /Simulate repayment/ }),
  );
  expect(within(outcome).queryByText("$3,000")).not.toBeInTheDocument();
  expect(
    within(outcome).getByText("Balance after repayment"),
  ).toBeInTheDocument();
});

test("changing the scenario or capital amount restarts the journey", async () => {
  render(<App />);
  await userEvent.click(
    screen.getByRole("button", { name: /Simulate supplying/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Power a spending app/ }),
  );
  expect(
    screen.getByRole("heading", { name: "A customer brings collateral." }),
  ).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: /Simulate adding/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Simulate a \$25/ }),
  );
  const outcome = screen.getByRole("region", { name: "Example outcome" });
  expect(within(outcome).getByText("$25")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("slider"), { target: { value: "20000" } });
  expect(
    screen.getByRole("heading", { name: "A customer brings collateral." }),
  ).toBeInTheDocument();
  expect(within(outcome).queryByText("$25")).not.toBeInTheDocument();
  expect(within(outcome).getByText("$20,000")).toBeInTheDocument();
});
