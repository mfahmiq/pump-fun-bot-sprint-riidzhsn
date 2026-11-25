// Seventh sweep: refine the two full-dataset leaders.
//   node tools/sweep7.ts <kit dir>

import { createStrategy, DEFAULT_PARAMS, type StrategyParams } from "../strategy.ts";
import { loadDataset, makeHello, phaseSeed, simulate } from "./sim.ts";

const kit = process.argv[2];
if (kit === undefined) {
  console.error("usage: node tools/sweep7.ts <kit dir>");
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

const w4 = { whaleSol: 4, maxAge: 30, confirmBuys: 3 };
const w2nw = { whaleSol: 2, maxAge: 30, confirmBuys: 3, exitOnWhaleSell: false };
run("w4 confirm3", { ...w4 });
run("w4 confirm3 no whale-sell", { ...w4, exitOnWhaleSell: false });
run("w4 confirm3 tp40/sl08", { ...w4, takeProfit: 0.4, stopLoss: 0.08 });
run("w4 confirm3 tp25/sl05", { ...w4, takeProfit: 0.25, stopLoss: 0.05 });
run("w4 confirm3 tp20/sl08", { ...w4, takeProfit: 0.2, stopLoss: 0.08 });
run("w4 confirm3 stake0.15", { ...w4, stakeSol: 0.15 });
run("w4 confirm3 stake0.20", { ...w4, stakeSol: 0.2 });
run("w4 confirm3 age45", { ...w4, maxAge: 45 });
run("w4 confirm3 age60", { ...w4, maxAge: 60 });
run("w4 confirm3 minSol0.5", { ...w4, confirmMinSol: 0.5 });
run("w4 confirm3 minSol0.1", { ...w4, confirmMinSol: 0.1 });
run("w4 confirm3 slots5", { ...w4, confirmSlots: 5 });
run("w4 confirm3 slots20", { ...w4, confirmSlots: 20 });
run("w4 confirm3 no dev-sell", { ...w4, exitOnDevSell: false });
run("w4 confirm3 hold80", { ...w4, maxHold: 80 });
run("w2 confirm3 no whale-sell", { ...w2nw });
run("w2nw tp40/sl08", { ...w2nw, takeProfit: 0.4, stopLoss: 0.08 });
run("w2nw tp25/sl05", { ...w2nw, takeProfit: 0.25, stopLoss: 0.05 });
run("w2nw stake0.15", { ...w2nw, stakeSol: 0.15 });
run("w2nw age60", { ...w2nw, maxAge: 60 });
run("w2nw minSol0.5", { ...w2nw, confirmMinSol: 0.5 });
run("w2nw confirm2", { whaleSol: 2, maxAge: 30, confirmBuys: 2, exitOnWhaleSell: false });
run("w2.5 confirm3 no whale-sell", { whaleSol: 2.5, maxAge: 30, confirmBuys: 3, exitOnWhaleSell: false });
run("w3 confirm3 no whale-sell tp40", { whaleSol: 3, maxAge: 30, confirmBuys: 3, exitOnWhaleSell: false, takeProfit: 0.4, stopLoss: 0.08 });
