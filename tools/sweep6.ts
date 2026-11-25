// Sixth sweep: push selectivity further on the FULL dev dataset.
//   node tools/sweep6.ts <kit dir>

import { createStrategy, DEFAULT_PARAMS, type StrategyParams } from "../strategy.ts";
import { loadDataset, makeHello, phaseSeed, simulate } from "./sim.ts";

const kit = process.argv[2];
if (kit === undefined) {
  console.error("usage: node tools/sweep6.ts <kit dir>");
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

run("w3 confirm3", { whaleSol: 3, maxAge: 30, confirmBuys: 3 });
run("w4 confirm3", { whaleSol: 4, maxAge: 30, confirmBuys: 3 });
run("w5 confirm3", { whaleSol: 5, maxAge: 30, confirmBuys: 3 });
run("w8 confirm3", { whaleSol: 8, maxAge: 30, confirmBuys: 3 });
run("w3 confirm4", { whaleSol: 3, maxAge: 30, confirmBuys: 4 });
run("w3 confirm5", { whaleSol: 3, maxAge: 30, confirmBuys: 5 });
run("w4 confirm4", { whaleSol: 4, maxAge: 30, confirmBuys: 4 });
run("w5 confirm4", { whaleSol: 5, maxAge: 30, confirmBuys: 4 });
run("w3 confirm3 no whale-sell", { whaleSol: 3, maxAge: 30, confirmBuys: 3, exitOnWhaleSell: false });
run("w3 confirm3 tp40/sl08", { whaleSol: 3, maxAge: 30, confirmBuys: 3, takeProfit: 0.4, stopLoss: 0.08 });
run("w3 confirm3 tp25/sl05", { whaleSol: 3, maxAge: 30, confirmBuys: 3, takeProfit: 0.25, stopLoss: 0.05 });
run("w3 confirm3 tp50/sl10", { whaleSol: 3, maxAge: 30, confirmBuys: 3, takeProfit: 0.5, stopLoss: 0.1 });
run("w3 confirm3 age20", { whaleSol: 3, maxAge: 20, confirmBuys: 3 });
run("w3 confirm3 minBuyers5", { whaleSol: 3, maxAge: 30, confirmBuys: 3, minBuyers: 5 });
run("w3 confirm3 minReal5", { whaleSol: 3, maxAge: 30, confirmBuys: 3, minRealSol: 5 });
run("w3 confirm3 stake0.05", { whaleSol: 3, maxAge: 30, confirmBuys: 3, stakeSol: 0.05 });
run("w3 confirm3 minSol0.5", { whaleSol: 3, maxAge: 30, confirmBuys: 3, confirmMinSol: 0.5 });
run("w3 confirm3 slots5", { whaleSol: 3, maxAge: 30, confirmBuys: 3, confirmSlots: 5 });
run("w3 confirm3 slots20", { whaleSol: 3, maxAge: 30, confirmBuys: 3, confirmSlots: 20 });
run("w2 confirm3 no whale-sell", { whaleSol: 2, maxAge: 30, confirmBuys: 3, exitOnWhaleSell: false });
run("w2 confirm4 no whale-sell", { whaleSol: 2, maxAge: 30, confirmBuys: 4, exitOnWhaleSell: false });
run("w2 confirm3 tp40/sl08", { whaleSol: 2, maxAge: 30, confirmBuys: 3, takeProfit: 0.4, stopLoss: 0.08 });
