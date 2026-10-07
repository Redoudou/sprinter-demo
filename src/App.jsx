import React, { lazy, Suspense, useState } from "react";
import { journeys, journeyMetrics, formatMoney } from "./journeys";
import "./index.css";
import "./explorer.css";
const CreditWorkspace = lazy(() => import("./CreditWorkspace"));

function FlowMap({ id, step, amount }) {
  const lending = id === "liquidity" || id === "operator";
  return (
    <div
      className={`flow-map phase-${step}`}
      aria-label="Illustrative capital flow"
    >
      <div className="map-caption">
        <span className="status-dot" />
        ILLUSTRATIVE JOURNEY <span>0{step + 1} / 04</span>
      </div>
      <div className="flow-source">
        <span className="node-icon">{lending ? "◈" : "▣"}</span>
        <div>
          <small>
            {id === "operator"
              ? "Customer request"
              : id === "card"
                ? "Customer assets"
                : "You start with"}
          </small>
          <strong>{formatMoney(amount)}</strong>
          <span>{lending ? "USDC" : "Collateral value"}</span>
        </div>
        <span className="flow-check">{step > 0 ? "✓" : "01"}</span>
      </div>
      <div className={`flow-connector ${step > 0 ? "lit" : ""}`}>
        <span>↓</span>
        <small>
          {lending ? "Capital joins the network" : "Assets back a credit line"}
        </small>
      </div>
      <div className={`flow-hub ${step > 0 ? "lit" : ""}`}>
        <div className="hub-logo">↗</div>
        <div>
          <strong>sprinter</strong>
          <span>{lending ? "Shared liquidity" : "Your credit line"}</span>
        </div>
        <span className="hub-state">
          {step === 3 ? "Cycle complete" : step > 0 ? "In motion" : "Ready"}
        </span>
      </div>
      <div className={`flow-connector branching ${step > 1 ? "lit" : ""}`}>
        <span>↓</span>
        <small>
          {lending
            ? "Liquidity goes where it is needed"
            : "USDC goes where you choose"}
        </small>
      </div>
      {lending ? (
        <div className="network-row">
          {["Base", "Arbitrum", "Optimism"].map((name, index) => (
            <div
              key={name}
              className={`network-node ${step > 1 && (id === "liquidity" || index === 1) ? "lit" : ""}`}
            >
              <span className={`chain-symbol chain-${index}`}>
                {index === 0 ? "—" : index === 1 ? "A" : "O"}
              </span>
              <strong>{name}</strong>
              <small>
                {step === 3
                  ? "Settled"
                  : step > 1
                    ? "Transfer activity"
                    : "Example network"}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <div className={`spending-node ${step > 1 ? "lit" : ""}`}>
          <span>{id === "card" ? "▰" : "↗"}</span>
          <div>
            <strong>
              {id === "card" ? "Everyday spending" : "Your wallet or recipient"}
            </strong>
            <small>
              {step === 2
                ? id === "card"
                  ? "$25 example purchase"
                  : `${formatMoney(Math.round(amount * 0.3))} example credit draw`
                : step === 3
                  ? "Debt repaid · collateral releasable"
                  : "USDC available after borrowing"}
            </small>
          </div>
        </div>
      )}
      <div className={`cycle-note ${step === 3 ? "lit" : ""}`}>
        <span>↻</span>
        {lending
          ? "Settlement returns capital to the pool"
          : "Repayment makes collateral available again"}
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("explore");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("liquidity");
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(10000);
  const journey = journeys[selected];
  function choose(id) {
    setSelected(id);
    setStep(0);
  }
  if (mode === "live")
    return (
      <>
        <div className="mode-return">
          <button
            className="subtle"
            disabled={busy}
            onClick={() => setMode("explore")}
          >
            ← Back to use cases
          </button>
          <span>Live Credit workspace · real wallet transactions</span>
        </div>
        <Suspense
          fallback={
            <p className="mode-return" role="status">
              Opening live Credit tools…
            </p>
          }
        >
          <CreditWorkspace onBusyChange={setBusy} />
        </Suspense>
      </>
    );
  return (
    <main className="explorer">
      <header className="explorer-header">
        <a
          className="brand"
          href="https://sprinter.tech"
          target="_blank"
          rel="noreferrer"
        >
          <span className="brand-mark">↗</span>sprinter
          <span className="tag">PLAYGROUND</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#journey">Explore use cases</a>
          <button className="subtle" onClick={() => setMode("live")}>
            Live Credit demo ↗
          </button>
        </nav>
      </header>
      <section className="explorer-hero">
        <div>
          <p className="eyebrow">A LITTLE CAPITAL. MORE POSSIBILITIES.</p>
          <h1>
            What could you
            <br />
            do with <span>Sprinter?</span>
          </h1>
          <p>
            Put liquidity to work. Access credit. Build a better spending
            experience. Pick a goal and see how it plays out.
          </p>
          <a className="hero-link" href="#journey">
            Find your use case <span>↓</span>
          </a>
        </div>
        <aside className="hero-note">
          <div className="orbit-art" aria-hidden="true">
            <div className="orbit-ring ring-1" />
            <div className="orbit-ring ring-2" />
            <span className="orbit-center">↗</span>
            <span className="orbit-point point-1">Liquidity</span>
            <span className="orbit-point point-2">Credit</span>
            <span className="orbit-point point-3">Possibility</span>
          </div>
          <span className="simulation-pill">
            Interactive walkthrough · no wallet needed
          </span>
        </aside>
      </section>
      <section
        id="journey"
        className="journey-picker"
        aria-label="Choose your goal"
      >
        <div className="section-heading">
          <h2>Start with what you want to do.</h2>
          <span>01 — CHOOSE YOUR GOAL</span>
        </div>
        <div className="persona-grid">
          {Object.entries(journeys).map(([id, item]) => (
            <button
              key={id}
              aria-pressed={selected === id}
              className={`persona-card ${selected === id ? "selected" : ""}`}
              onClick={() => choose(id)}
            >
              <span className="persona-top">
                <span className="persona-icon">{item.icon}</span>
                <span className="persona-arrow">↗</span>
              </span>
              <strong>{item.label}</strong>
              <small>{item.audience}</small>
              <span className="persona-product">{item.product}</span>
            </button>
          ))}
        </div>
      </section>
      <section
        className="journey-stage"
        aria-label={`${journey.audience} walkthrough`}
      >
        <div className="journey-heading">
          <div>
            <p className="eyebrow">
              {journey.product} / {journey.audience}
            </p>
            <h2>{journey.title}</h2>
            <p>{journey.description}</p>
          </div>
          <span className="simulation-pill">Simulation</span>
        </div>
        <div className="journey-content">
          <div className="journey-controls">
            <div
              className="step-switcher"
              role="group"
              aria-label="Journey steps"
            >
              {journey.steps.map((label, index) => (
                <button
                  key={label}
                  aria-pressed={step === index}
                  className={`${step === index ? "current" : ""} ${step > index ? "complete" : ""}`}
                  onClick={() => setStep(index)}
                >
                  <span>{step > index ? "✓" : index + 1}</span>
                  <small>{label}</small>
                </button>
              ))}
            </div>
            <div className="story" key={`${selected}-${step}`}>
              <span className="chapter">STEP 0{step + 1}</span>
              <h3>{journey.headings[step]}</h3>
              <p aria-live="polite">{journey.stories[step]}</p>
            </div>
            <div className="amount-control">
              <label htmlFor="example-amount">
                {journey.input}
                <output htmlFor="example-amount">{formatMoney(amount)}</output>
              </label>
              <input
                id="example-amount"
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={amount}
                onChange={(event) => {
                  setAmount(Number(event.target.value));
                  setStep(0);
                }}
              />
              <div>
                <span>$1,000</span>
                <span>$100,000</span>
              </div>
            </div>
            <button
              className="primary journey-next"
              onClick={() => setStep((current) => (current + 1) % 4)}
            >
              {journey.buttons[step]}
              <span>{step === 3 ? "↻" : "→"}</span>
            </button>
            <p className="simulation-explainer">
              Example only. No funds move and no wallet connects.
            </p>
          </div>
          <FlowMap id={selected} step={step} amount={amount} />
        </div>
        <div
          className="journey-metrics"
          role="region"
          aria-label="Example outcome"
        >
          {journeyMetrics(selected, step, amount).map(
            ([title, value, description]) => (
              <div key={title}>
                <span>{title}</span>
                <strong>{value}</strong>
                <small>{description}</small>
              </div>
            ),
          )}
        </div>
        <div className="journey-assumption">
          <span>ⓘ</span>
          <p>{journey.note}</p>
        </div>
      </section>
      <section className="outcome-section">
        <div>
          <p className="eyebrow">WHAT CHANGES FOR YOU</p>
          <h2>{journey.outcome}</h2>
          <p>{journey.who}</p>
          <a href={journey.source} target="_blank" rel="noreferrer">
            Read about this use case ↗
          </a>
        </div>
        <div className="next-step-card">
          <span className="eyebrow">TAKE THE NEXT STEP</span>
          <h3>
            {selected === "borrower" || selected === "card"
              ? "Try the real Credit flow."
              : "Explore the liquidity model."}
          </h3>
          <p>
            {selected === "borrower" || selected === "card"
              ? "The live workspace lets you inspect an account and review Credit actions before signing."
              : "This walkthrough explains the idea. Liquidity deposits and operator fills are not connected in this playground."}
          </p>
          {selected === "borrower" || selected === "card" ? (
            <button onClick={() => setMode("live")}>
              Open live Credit demo ↗
            </button>
          ) : (
            <a
              className="button-link"
              href={journey.source}
              target="_blank"
              rel="noreferrer"
            >
              Explore Sprinter Liquidity ↗
            </a>
          )}
        </div>
      </section>
      <footer>
        <span>↗ sprinter · A playground for possibilities</span>
        <span>
          Illustrative scenarios. Live Credit is a separate experience.
        </span>
      </footer>
    </main>
  );
}
