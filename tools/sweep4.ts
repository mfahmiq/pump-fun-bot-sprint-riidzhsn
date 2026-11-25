// Fourth sweep: refine around whale 1 SOL + confirm2.
//   node tools/sweep4.ts <kit dir>

import { createStrategy, DEFAULT_PARAMS, type StrategyParams } from "../strategy.ts";
import { loadDataset, makeHello, phaseSeed, simulate } from "./sim.ts";

const kit = process.argv[2];
if (kit === undefined) {
  console.error("usage: node tools/sweep4.ts <kit dir>");
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

const base = { whaleSol: 1, maxAge: 30, confirmBuys: 2 };
run("w1 age30 confirm2", { ...base });
run("w0.75 age30 confirm2", { whaleSol: 0.75, maxAge: 30, confirmBuys: 2 });
run("w1.25 age30 confirm2", { whaleSol: 1.25, maxAge: 30, confirmBuys: 2 });
run("w1 age20 confirm2", { whaleSol: 1, maxAge: 20, confirmBuys: 2 });
run("w1 age45 confirm2", { whaleSol: 1, maxAge: 45, confirmBuys: 2 });
run("w1 age60 confirm2", { whaleSol: 1, maxAge: 60, confirmBuys: 2 });
run("w1 age30 confirm2 slots10", { ...base, confirmSlots: 10 });
run("w1 age30 confirm2 slots30", { ...base, confirmSlots: 30 });
run("w1 age30 confirm2 minSol0.5", { ...base, confirmMinSol: 0.5 });
run("w1 age30 confirm2 minSol0.1", { ...base, confirmMinSol: 0.1 });
run("w1 age30 confirm3", { whaleSol: 1, maxAge: 30, confirmBuys: 3 });
run("w1 age30 confirm1", { whaleSol: 1, maxAge: 30, confirmBuys: 1 });
run("w1 age30 confirm2 minBuyers5", { ...base, minBuyers: 5 });
run("w1 age30 confirm2 minBuyers1", { ...base, minBuyers: 1 });
run("w1 age30 confirm2 tp25/sl08", { ...base, takeProfit: 0.25, stopLoss: 0.08 });
run("w1 age30 confirm2 tp12/sl06", { ...base, takeProfit: 0.12, stopLoss: 0.06 });
run("w1 age30 confirm2 tp15/sl05", { ...base, takeProfit: 0.15, stopLoss: 0.05 });
run("w1 age30 confirm2 no trail", { ...base, trailArm: 0, trail: 0 });
run("w1 age30 confirm2 trail0.06", { ...base, trailArm: 0.08, trail: 0.06 });
run("w1 age30 confirm2 no dev-sell", { ...base, exitOnDevSell: false });
run("w1 age30 confirm2 no whale-sell", { ...base, exitOnWhaleSell: false });
run("w1 age30 confirm2 stake0.08", { ...base, stakeSol: 0.08 });
run("w1 age30 confirm2 stake0.03", { ...base, stakeSol: 0.03 });
run("w1 age30 confirm2 hold80", { ...base, maxHold: 80 });
run("w1 age30 confirm2 hold300", { ...base, maxHold: 300 });
run("w1 age30 confirm2 minReal2", { ...base, minRealSol: 2 });
run("w1 age30 confirm2 maxReal20", { ...base, maxRealSol: 20 });
run("w1 age30 confirm2 minRunup0", { ...base, minRunup: 0 });
run("w1 age30 confirm2 minAge10", { ...base, minAge: 10 });
run("w1 age30 confirm2 minAge0", { ...base, minAge: 0 });
