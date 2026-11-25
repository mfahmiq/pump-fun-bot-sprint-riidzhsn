// Fifth sweep: combos around whale 1 + age30 + confirm2 + slots10.
//   node tools/sweep5.ts <kit dir>

import { createStrategy, DEFAULT_PARAMS, type StrategyParams } from "../strategy.ts";
import { loadDataset, makeHello, phaseSeed, simulate } from "./sim.ts";

const kit = process.argv[2];
if (kit === undefined) {
  console.error("usage: node tools/sweep5.ts <kit dir>");
  process.exit(2);
}
const ds = loadDataset(kit);
const hello = makeHello(phaseSeed("pilot-pumpfun-replay", "dev", ds.sha256));
const sol = (x: bigint) => (Number(x) / 1e9).toFixed(4);

function run(label: string, overrides: Partial<StrategyParams>): void {
  const params = { ...DEFAULT_PARAMS, ...overrides };
  const r = simulate(ds, hello, createStrategy(params));
  const wins = r.trips.filter((t) => t.pnl > 0n).length;
  console.log(
    `${label.padEnd(48)} net ${sol(r.netPnl)}  trips ${String(r.trips.length).padStart(3)}  wins ${String(wins).padStart(3)}  coins ${String(r.mints).padStart(3)}  dd ${r.maxDrawdown.toFixed(3)}  fills ${r.fills}`,
  );
}

const base = { whaleSol: 1, maxAge: 30, confirmBuys: 2, confirmSlots: 10 };
run("slots10 base", { ...base });
run("slots10 + tp25/sl08", { ...base, takeProfit: 0.25, stopLoss: 0.08 });
run("slots10 + tp30/sl10", { ...base, takeProfit: 0.3, stopLoss: 0.1 });
run("slots10 + tp20/sl10", { ...base, takeProfit: 0.2, stopLoss: 0.1 });
run("slots10 + no dev-sell", { ...base, exitOnDevSell: false });
run("slots10 + stake0.08", { ...base, stakeSol: 0.08 });
run("slots10 + stake0.06", { ...base, stakeSol: 0.06 });
run("slots10 + minSol0.5", { ...base, confirmMinSol: 0.5 });
run("slots10 + age20", { ...base, maxAge: 20 });
run("slots10 + tp25/sl08 + no dev-sell", { ...base, takeProfit: 0.25, stopLoss: 0.08, exitOnDevSell: false });
run("slots10 + tp25/sl08 + stake0.08", { ...base, takeProfit: 0.25, stopLoss: 0.08, stakeSol: 0.08 });
run("slots10 + tp25/sl08 + stake0.08 + no dev-sell", { ...base, takeProfit: 0.25, stopLoss: 0.08, stakeSol: 0.08, exitOnDevSell: false });
run("slots10 + tp25/sl08 + minSol0.5", { ...base, takeProfit: 0.25, stopLoss: 0.08, confirmMinSol: 0.5 });
run("slots10 + tp25/sl08 + age20", { ...base, takeProfit: 0.25, stopLoss: 0.08, maxAge: 20 });
run("slots10 + hold80", { ...base, maxHold: 80 });
run("slots10 + stale300", { ...base, staleSlots: 300 });
run("slots10 + trail0.15/0.08", { ...base, trailArm: 0.15, trail: 0.08 });
