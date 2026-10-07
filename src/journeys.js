export const journeys = {
  liquidity: {
    icon: "↗",
    label: "Put liquidity to work",
    audience: "Liquidity providers",
    product: "Sprinter Liquidity",
    title: "One deposit. Capital that travels.",
    description:
      "Supply USDC to a shared pool that helps fund activity across chains. Follow where your capital goes and how it can earn.",
    input: "Your USDC deposit",
    metric: "Capital supplied",
    steps: [
      "Supply USDC",
      "Pool your capital",
      "Fund a transfer",
      "See the outcome",
    ],
    headings: [
      "Start with your liquidity.",
      "Join a shared liquidity pool.",
      "Help a transfer happen.",
      "Your capital has a job.",
    ],
    stories: [
      "Imagine you have USDC available to put to work. Start with an example deposit and follow its journey.",
      "Your USDC joins the liquidity hub on Base. Sprinter manages liquidity across supported networks.",
      "A cross-chain operator uses pool liquidity to deliver funds on a destination network while the source funds settle.",
      "Settlement replenishes the liquidity. Providers can earn a share of activity fees, alongside yield from supported lending strategies.",
    ],
    buttons: [
      "Simulate supplying USDC",
      "Simulate a transfer",
      "See settlement & outcome",
      "Restart this walkthrough",
    ],
    outcome: "Support cross-chain activity with one pool of capital.",
    who: "People and treasuries with USDC to supply, and operators who need liquidity to complete transfers.",
    note: "Illustrative routes, not live pool data. Returns vary; no yield or principal protection is promised.",
    source: "https://docs.sprinter.tech/stash-v1/overview",
  },
  borrower: {
    icon: "◈",
    label: "Access spending money",
    audience: "Asset holders & wallets",
    product: "Sprinter Credit",
    title: "Keep your assets. Access credit.",
    description:
      "Use eligible assets as collateral to access USDC. Explore what becomes available to spend, and what you still owe.",
    input: "Example collateral value",
    metric: "Collateral value",
    steps: ["Choose collateral", "Open credit", "Use USDC", "Repay & release"],
    headings: [
      "Start with assets you already hold.",
      "Turn collateral into borrowing capacity.",
      "Send USDC where you need it.",
      "Repay to release your assets.",
    ],
    stories: [
      "Choose an example collateral value. You keep exposure to the asset while it is pledged as security for a loan.",
      "Eligible collateral creates a credit limit. This example uses a 70% limit; the real limit depends on the asset and protocol configuration.",
      "Borrow part of your available credit. The USDC can go to your wallet or a recipient, and a debt is created.",
      "Pay back the borrowed amount plus any interest and fees. Once the position allows it, withdraw the collateral.",
    ],
    buttons: [
      "Simulate pledging collateral",
      "Simulate borrowing USDC",
      "Simulate repayment",
      "Restart this walkthrough",
    ],
    outcome: "Get liquidity without selling your collateral.",
    who: "Asset holders needing USDC and wallet teams adding borrowing to their existing experience.",
    note: "Illustrative 70% borrowing limit. Real positions accrue costs and can be liquidated if collateral becomes insufficient.",
    source: "https://docs.sprinter.tech/quickstart/wallets-integration",
  },
  card: {
    icon: "▰",
    label: "Power a spending app",
    audience: "Card programs & neobanks",
    product: "Sprinter Credit",
    title: "From collateral to a coffee.",
    description:
      "See how a card program could let customers spend against eligible collateral, without prefunding the entire spending balance.",
    input: "Customer collateral value",
    metric: "Collateral pledged",
    steps: [
      "Add collateral",
      "Enable spending",
      "Make a purchase",
      "Repay the balance",
    ],
    headings: [
      "A customer brings collateral.",
      "A credit line powers spending.",
      "The customer pays with their card.",
      "The balance is repaid.",
    ],
    stories: [
      "A customer pledges eligible assets through your app. Use an example value to explore their spending capacity.",
      "Sprinter provides the credit engine. Your card partner still handles card issuance, identity checks, and payment processing.",
      "For an example $25 purchase, your program draws USDC to its settlement address. The purchase becomes debt against the customer’s collateral.",
      "The customer repays the balance and applicable costs. Your app shows what is owed and when repayment is due.",
    ],
    buttons: [
      "Simulate adding collateral",
      "Simulate a $25 purchase",
      "Simulate repayment",
      "Restart this walkthrough",
    ],
    outcome: "Offer collateral-backed spending inside your app.",
    who: "Card programs, neobanks, and wallet businesses building a credit-backed spending experience.",
    note: "Concept only: no card is issued or payment processed. This example uses a 70% credit limit and excludes costs.",
    source: "https://docs.sprinter.tech/quickstart/card-program",
  },
  operator: {
    icon: "⇄",
    label: "Complete cross-chain transfers",
    audience: "Cross-chain operators",
    product: "Sprinter Liquidity",
    title: "Fill the transfer. Free your capital.",
    description:
      "Explore how a transfer operator can access liquidity when a customer needs funds on another network.",
    input: "Example transfer size",
    metric: "Transfer to deliver",
    steps: [
      "Receive a request",
      "Access liquidity",
      "Deliver funds",
      "Settle & repay",
    ],
    headings: [
      "A customer wants funds on another chain.",
      "Access liquidity for this transfer.",
      "Deliver on the destination network.",
      "Settlement closes the loop.",
    ],
    stories: [
      "Imagine a customer moving funds from Base to Arbitrum. Your service needs capital on the destination side.",
      "An approved operator requests Sprinter liquidity instead of holding all of the required inventory in advance.",
      "The operator uses the liquidity to complete the customer’s transfer. This walkthrough shows an illustrative route.",
      "Source-side settlement repays the credit. The pool can support future activity; the operator pays for liquidity access.",
    ],
    buttons: [
      "Simulate accessing liquidity",
      "Simulate delivering funds",
      "Simulate settlement",
      "Restart this walkthrough",
    ],
    outcome: "Deliver transfers with less capital sitting across chains.",
    who: "Approved cross-chain operators, often called solvers, running their own transfer infrastructure.",
    note: "Illustrative route only. Actual access requires onboarding, available liquidity, and transaction approval.",
    source: "https://docs.sprinter.tech/stash-v1/integration-guide",
  },
};
export const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function journeyMetrics(id, step, amount) {
  const limit = amount * 0.7;
  if (id === "liquidity")
    return [
      [
        "Your capital",
        formatMoney(amount),
        step ? "Supplied to the pool" : "Example USDC deposit",
      ],
      [
        "Where it works",
        step >= 2 ? "Across chains" : "Liquidity hub",
        "Illustrative network activity",
      ],
      [
        "Potential income",
        step === 3 ? "Fees + yield" : "Follow the journey",
        "Variable, not a quoted return",
      ],
    ];
  if (id === "operator")
    return [
      ["Customer transfer", formatMoney(amount), "Illustrative route"],
      [
        "Destination funds",
        step >= 2 ? "Delivered" : "Not yet delivered",
        "Example customer outcome",
      ],
      [
        "Liquidity credit",
        step === 3 ? "Repaid" : step >= 1 ? "In use" : "Not drawn",
        "Subject to approval and costs",
      ],
    ];
  const debt = step === 2 ? (id === "card" ? 25 : Math.round(amount * 0.3)) : 0;
  return [
    [
      id === "card" ? "Customer collateral" : "Your collateral",
      formatMoney(amount),
      step === 3
        ? "Available to withdraw after repayment"
        : step
          ? "Pledged as security"
          : "Example value",
    ],
    [
      "Available credit",
      formatMoney(step === 0 || step === 3 ? 0 : limit - debt),
      "Illustrative 70% limit",
    ],
    [
      step === 3 ? "Balance after repayment" : "Borrowed amount",
      formatMoney(debt),
      "Interest and fees excluded",
    ],
  ];
}
