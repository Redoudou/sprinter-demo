import React, { useEffect, useRef, useState } from "react";
import {
  actionRequest,
  executeCalls,
  isAddress,
  normalizeCalls,
  request,
} from "./credit";
import "./index.css";

const actions = {
  lock: [
    "Lock collateral",
    "Deposit a supported asset to open or increase your credit capacity.",
  ],
  draw: [
    "Draw credit",
    "Borrow against your collateral and send funds to your receiver.",
  ],
  repay: ["Repay debt", "Repay borrowed credit and accrued interest."],
  unlock: [
    "Unlock collateral",
    "Withdraw collateral when your remaining position allows it.",
  ],
};
const blankForm = {
  amount: "",
  collateral: "",
  receiver: "",
  earn: "",
  unwrap: false,
};
const metricLabels = {
  totalCollateralValue: "Collateral value",
  remainingCreditCapacity: "Available credit",
  debt: "Total debt",
  healthFactor: "Health factor",
  totalCreditCapacity: "Credit capacity",
  interest: "Accrued interest",
  principal: "Principal",
  liquidationLimit: "Liquidation limit",
  mHealthFactor: "Maintenance health factor",
};

export default function CreditWorkspace({ onBusyChange }) {
  const [protocol, setProtocol] = useState(null);
  const [protocolError, setProtocolError] = useState("");
  const [reload, setReload] = useState(0);
  const [chain, setChain] = useState("");
  const [asset, setAsset] = useState("");
  const [account, setAccount] = useState("");
  const [wallet, setWallet] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [info, setInfo] = useState(null);
  const [infoState, setInfoState] = useState("");
  const [action, setAction] = useState("lock");
  const [form, setForm] = useState(blankForm);
  const [plan, setPlan] = useState(null);
  const [building, setBuilding] = useState(false);
  const [executing, setExecuting] = useState(false);
  useEffect(() => {
    onBusyChange?.(executing);
  }, [executing, onBusyChange]);
  const [attempted, setAttempted] = useState(false);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const version = useRef(0);
  const mounted = useRef(true);
  const executingRef = useRef(false);
  const config = protocol?.chains?.[chain];
  const position = info?.[asset];
  const collateral = Object.entries(config?.collateral || {});
  const strategies = Object.entries(config?.strategies || {});
  const invalidate = () => {
    version.current += 1;
    setPlan(null);
    setAttempted(false);
    setBuilding(false);
    setError("");
    setNotice("");
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      version.current += 1;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setProtocolError("");
    request("/credit/protocol", {}, controller.signal)
      .then((data) => {
        if (!data.chains || !Object.keys(data.chains).length)
          throw new Error("No supported credit networks returned.");
        setProtocol(data);
        setChain((current) =>
          data.chains[current] ? current : Object.keys(data.chains)[0],
        );
      })
      .catch((err) => {
        if (!controller.signal.aborted) setProtocolError(err.message);
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    setAsset(Object.keys(config?.creditHubs || {})[0] || "");
    setForm((current) => ({
      ...current,
      collateral:
        Object.keys(config?.collateral || {})[0]?.replace(/^erc20:/, "") || "",
      earn: "",
    }));
  }, [config]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const changed = (accounts) => {
      version.current += 1;
      setWallet(accounts[0] || "");
      setAccount(accounts[0] || "");
      setPlan(null);
      setBuilding(false);
      if (executingRef.current)
        setError(
          "Wallet changed during execution. Check transaction history before continuing.",
        );
    };
    const disconnected = () => changed([]);
    provider.on("accountsChanged", changed);
    provider.on("disconnect", disconnected);
    return () => {
      provider.removeListener?.("accountsChanged", changed);
      provider.removeListener?.("disconnect", disconnected);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setInfo(null);
    if (!isAddress(account)) {
      setInfoState(
        "Enter an account or connect your wallet to view your position.",
      );
      return;
    }
    setInfoState("Loading credit position…");
    request(`/credit/accounts/${account}/info`, {}, controller.signal)
      .then((data) => {
        if (!data.data || typeof data.data !== "object")
          throw new Error("Invalid account response.");
        setInfo(data.data);
        setInfoState("");
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setInfoState(`Could not load position: ${err.message}`);
      });
    return () => controller.abort();
  }, [account, reload]);

  async function connect() {
    setError("");
    setConnecting(true);
    try {
      if (!window.ethereum)
        throw new Error(
          "Install an Ethereum wallet extension to connect and sign transactions.",
        );
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!isAddress(accounts[0]))
        throw new Error("No wallet account was selected.");
      invalidate();
      setWallet(accounts[0]);
      setAccount(accounts[0]);
      setForm((current) => ({ ...current, receiver: accounts[0] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }

  function update(field, value) {
    invalidate();
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "collateral" ? { earn: "" } : {}),
    }));
  }

  async function build(event) {
    event.preventDefault();
    invalidate();
    const currentVersion = version.current;
    try {
      if (!config?.creditHubs?.[asset])
        throw new Error("Select a supported credit asset.");
      const { path, params } = actionRequest(account, asset, action, form);
      setBuilding(true);
      const calls = normalizeCalls(await request(path, params));
      if (currentVersion !== version.current || !mounted.current) return;
      if (calls.some((call) => `eip155:${call.chain}` !== chain))
        throw new Error(
          "API returned calls for a different network. Select the matching network and rebuild.",
        );
      setPlan({ calls, action, account, created: Date.now() });
      setProgress({});
      if (!calls.length)
        setNotice("No transactions are needed for this request.");
    } catch (err) {
      if (currentVersion === version.current && mounted.current)
        setError(err.message);
    } finally {
      if (currentVersion === version.current && mounted.current)
        setBuilding(false);
    }
  }

  async function execute() {
    if (!plan || attempted || executingRef.current) return;
    if (Date.now() - plan.created > 120000) {
      setError("This request is over two minutes old. Build a fresh request.");
      setPlan(null);
      return;
    }
    if (wallet.toLowerCase() !== plan.account.toLowerCase()) {
      setError("Connect the wallet for this account before executing.");
      return;
    }
    setAttempted(true);
    setExecuting(true);
    executingRef.current = true;
    setError("");
    setNotice("");
    try {
      await executeCalls(window.ethereum, plan.account, plan.calls, (item) => {
        if (mounted.current)
          setProgress((current) => ({ ...current, [item.index]: item }));
      });
      setNotice(
        "All transactions confirmed on the source network. Refresh your position to see the latest state.",
      );
      setReload((value) => value + 1);
    } catch (err) {
      setError(
        `${err.message} Any confirmed transactions remain completed. Review the hashes below before building a new request.`,
      );
    } finally {
      setExecuting(false);
      executingRef.current = false;
    }
  }

  return (
    <main>
      <header>
        <a
          className="brand"
          href="https://sprinter.tech"
          target="_blank"
          rel="noreferrer"
        >
          <span className="brand-mark">↗</span> sprinter
          <span className="tag">CREDIT DEMO</span>
        </a>
        <a
          href="https://docs.sprinter.tech/api-reference/sprinter/credit/overview"
          target="_blank"
          rel="noreferrer"
        >
          API documentation ↗
        </a>
      </header>
      <section className="intro">
        <p className="eyebrow">YOUR ASSETS. MORE POSSIBILITIES.</p>
        <h1>
          Put your collateral
          <br />
          to work.
        </h1>
        <p>
          Explore the complete Sprinter Credit lifecycle.
          <br />
          Lock assets, access credit, and manage your position.
        </p>
      </section>
      <section className="panel account-panel" aria-label="Account connection">
        <div>
          <h2>Your credit account</h2>
          <p>Inspect any address. Connect its wallet to sign transactions.</p>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={executing || connecting}
        >
          {connecting
            ? "Connecting…"
            : wallet
              ? "Reconnect wallet"
              : "Connect wallet"}
        </button>
        <label className="wide">
          Account address
          <input
            placeholder="0x…"
            value={account}
            disabled={executing}
            onChange={(event) => {
              invalidate();
              setAccount(event.target.value.trim());
            }}
          />
        </label>
        <div className="selectors">
          <label>
            Network
            <select
              value={chain}
              disabled={executing || !protocol}
              onChange={(event) => {
                invalidate();
                setChain(event.target.value);
              }}
            >
              {Object.keys(protocol?.chains || {}).map((id) => (
                <option key={id} value={id}>
                  {id === "eip155:8453" ? "Base" : id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Credit asset
            <select
              value={asset}
              disabled={executing || !config}
              onChange={(event) => {
                invalidate();
                setAsset(event.target.value);
              }}
            >
              {Object.keys(config?.creditHubs || {}).map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        {protocolError && (
          <p role="alert">
            Protocol unavailable: {protocolError}{" "}
            <button onClick={() => setReload((n) => n + 1)}>Retry</button>
          </p>
        )}
        {!protocol && !protocolError && (
          <p role="status">Loading protocol configuration…</p>
        )}
      </section>
      <section className="position" aria-label="Credit position">
        <div className="section-heading">
          <h2>Position overview</h2>
          <button
            className="subtle"
            disabled={executing || !isAddress(account)}
            onClick={() => {
              invalidate();
              setReload((n) => n + 1);
            }}
          >
            Refresh
          </button>
        </div>
        <div className="metrics">
          {Object.entries(metricLabels)
            .slice(0, 4)
            .map(([key, title]) => (
              <div className="metric" key={key}>
                <span>{title}</span>
                <strong>
                  {position
                    ? key === "healthFactor" && position.debt === "0"
                      ? "No debt"
                      : (position[key] ?? "—")
                    : "—"}
                </strong>
                <small>
                  {key === "healthFactor"
                    ? "Liquidation safety"
                    : asset.toUpperCase() || "Credit asset"}
                </small>
              </div>
            ))}
        </div>
        {infoState && <p role="status">{infoState}</p>}
        {info && !position && (
          <p>No position returned for the selected credit asset.</p>
        )}
        {position && (
          <details>
            <summary>Position details</summary>
            <dl>
              {Object.entries(metricLabels)
                .slice(4)
                .map(([key, label]) => (
                  <React.Fragment key={key}>
                    <dt>{label}</dt>
                    <dd>{position[key] ?? "—"}</dd>
                  </React.Fragment>
                ))}
              <dt>Due date</dt>
              <dd>
                {position.debt === "0"
                  ? "No active debt"
                  : position.dueDate || "Not available"}
              </dd>
            </dl>
          </details>
        )}
      </section>
      <section className="panel action-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE CREDIT LIFECYCLE</p>
            <h2>Manage your credit</h2>
          </div>
          <span className="live-dot">Live API</span>
        </div>
        <div className="tabs" role="group" aria-label="Credit action">
          {Object.entries(actions).map(([key, [title]], index) => (
            <button
              type="button"
              key={key}
              disabled={executing}
              aria-pressed={action === key}
              className={action === key ? "active" : ""}
              onClick={() => {
                invalidate();
                setAction(key);
                setForm((current) => ({
                  ...current,
                  amount: "",
                  earn: "",
                  unwrap: false,
                }));
              }}
            >
              <span>0{index + 1}</span>
              {title}
            </button>
          ))}
        </div>
        <form onSubmit={build}>
          <p>{actions[action][1]}</p>
          <fieldset disabled={executing || !config}>
            {(action === "lock" || action === "unlock") && (
              <label>
                Collateral asset
                <select
                  value={form.collateral}
                  onChange={(event) => update("collateral", event.target.value)}
                >
                  {collateral.map(([id, value]) => (
                    <option key={id} value={id.replace(/^erc20:/, "")}>
                      {value.symbol} · {Number(value.ltv) / 100}% LTV
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Amount in base units
              <input
                aria-label="Amount in base units"
                inputMode="numeric"
                placeholder="e.g. 1000000"
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
                required
              />
              <small>
                Use the token’s smallest denomination. For USDC, 1 USDC =
                1,000,000 base units. Vault shares may use different decimals.
              </small>
            </label>
            {action === "lock" && (
              <label>
                Earn strategy (optional)
                <select
                  value={form.earn}
                  onChange={(event) => update("earn", event.target.value)}
                >
                  <option value="">Deposit selected asset directly</option>
                  {strategies
                    .filter(
                      ([, value]) =>
                        value.underlyingAddress?.toLowerCase() ===
                        form.collateral.toLowerCase(),
                    )
                    .map(([id, value]) => (
                      <option key={id} value={id}>
                        {value.name}
                      </option>
                    ))}
                </select>
                <small>
                  Select a strategy only when depositing its underlying token.
                </small>
              </label>
            )}
            {action === "draw" && (
              <label>
                Receiver address
                <input
                  placeholder="0x…"
                  value={form.receiver}
                  onChange={(event) =>
                    update("receiver", event.target.value.trim())
                  }
                  required
                />
              </label>
            )}
            {action === "unlock" && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.unwrap}
                  onChange={(event) => update("unwrap", event.target.checked)}
                />{" "}
                Unwrap from the earn vault on withdrawal
              </label>
            )}
            <button
              className="primary"
              disabled={building || !isAddress(account)}
            >
              {building
                ? "Building transactions…"
                : "Build transaction preview →"}
            </button>
          </fieldset>
        </form>
        {error && (
          <p className="message error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="message" role="status">
            {notice}
          </p>
        )}
        {plan && (
          <section className="preview" aria-label="Transaction preview">
            <h3>
              {actions[plan.action][0]} · {plan.calls.length} transaction
              {plan.calls.length === 1 ? "" : "s"}
            </h3>
            <p>
              Review each call below. Your wallet will request signatures in
              order, waiting for confirmation after each transaction.
            </p>
            <ol>
              {plan.calls.map((call, index) => (
                <li key={index}>
                  <strong>
                    Call {index + 1} · Chain {call.chain}
                  </strong>
                  <dl>
                    <dt>To</dt>
                    <dd>
                      <code>{call.to}</code>
                    </dd>
                    <dt>Native value (wei)</dt>
                    <dd>{call.value}</dd>
                  </dl>
                  <details>
                    <summary>Calldata</summary>
                    <code>{call.data}</code>
                  </details>
                  {progress[index] && (
                    <p role="status">
                      {progress[index].state}
                      {progress[index].hash && (
                        <>
                          {" "}
                          · <code>{progress[index].hash}</code>
                        </>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {plan.calls.length > 0 && (
              <button
                className="primary"
                disabled={
                  executing ||
                  attempted ||
                  wallet.toLowerCase() !== plan.account.toLowerCase()
                }
                onClick={execute}
              >
                {executing
                  ? "Waiting for wallet / confirmation…"
                  : attempted
                    ? "Request already attempted — rebuild to continue"
                    : "Sign and execute in wallet"}
              </button>
            )}
            {!wallet && (
              <p>Connect this account’s wallet to execute the preview.</p>
            )}
          </section>
        )}
        {Object.values(progress).some((item) => item.hash) && (
          <section aria-label="Transaction history">
            <h3>Transaction history</h3>
            <p>
              Keep these hashes to check any pending or completed calls before
              starting again.
            </p>
            {Object.values(progress)
              .filter((item) => item.hash)
              .map((item) => (
                <p className="history" key={item.index}>
                  Call {item.index + 1}: {item.state} · <code>{item.hash}</code>
                </p>
              ))}
          </section>
        )}
      </section>
      <footer>
        <span>Sprinter Credit · Developer demo</span>
        <span>Live transactions use real assets and network gas.</span>
      </footer>
    </main>
  );
}
