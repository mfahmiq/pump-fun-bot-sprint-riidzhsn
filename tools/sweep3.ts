// Third sweep: whale-print confirmation filters.
//   node tools/sweep3.ts <kit dir>

import { createStrategy, DEFAULT_PARAMS, type StrategyParams } from "../strategy.ts";
import { loadDataset, makeHello, phaseSeed, simulate } from "./sim.ts";

const kit = process.argv[2];
if (kit === undefined) {
  console.error("usage: node tools/sweep3.ts <kit dir>");
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
    `${label.padEnd(46)} net ${sol(r.netPnl)}  trips ${String(r.trips.length).padStart(3)}  wins ${String(wins).padStart(3)}  coins ${String(r.mints).padStart(3)}  dd ${r.maxDrawdown.toFixed(3)}  fills ${r.fills}`,
  );
}

const base = { whaleSol: 2, maxAge: 30 };
run("w2 age30 confirm0 (immediate)", { ...base, confirmBuys: 0 });
run("w2 age30 confirm1", { ...base, confirmBuys: 1 });
run("w2 age30 confirm2 (default)", { ...base });
run("w2 age30 confirm3", { ...base, confirmBuys: 3 });
run("w2 age30 confirm2 slots30", { ...base, confirmSlots: 30 });
run("w2 age30 confirm2 slots10", { ...base, confirmSlots: 10 });
run("w2 age30 confirm2 minSol0.5", { ...base, confirmMinSol: 0.5 });
run("w2 age30 confirm2 minSol0.1", { ...base, confirmMinSol: 0.1 });
run("w3 age30 confirm2", { whaleSol: 3, maxAge: 30 });
run("w3 age30 confirm1", { whaleSol: 3, maxAge: 30, confirmBuys: 1 });
run("w3 age30 confirm3", { whaleSol: 3, maxAge: 30, confirmBuys: 3 });
run("w1.5 age30 confirm2", { whaleSol: 1.5, maxAge: 30 });
run("w1 age30 confirm2", { whaleSol: 1, maxAge: 30 });
run("w2 age60 confirm2", { whaleSol: 2, maxAge: 60 });
run("w2 age180 confirm2", { whaleSol: 2, maxAge: 180 });
run("w2 age30 confirm2 no whale-sell", { ...base, exitOnWhaleSell: false });
run("w2 age30 confirm2 no dev-sell", { ...base, exitOnDevSell: false });
run("w2 age30 confirm2 tp25/sl08", { ...base, takeProfit: 0.25, stopLoss: 0.08 });
run("w2 age30 confirm2 tp12/sl06", { ...base, takeProfit: 0.12, stopLoss: 0.06 });
run("w2 age30 confirm2 hold40", { ...base, maxHold: 40 });
run("w2 age30 confirm2 minBuyers5", { ...base, minBuyers: 5 });
run("w2 age30 confirm2 stake0.03", { ...base, stakeSol: 0.03 });
run("w2 age30 confirm2 stake0.08", { ...base, stakeSol: 0.08 });
