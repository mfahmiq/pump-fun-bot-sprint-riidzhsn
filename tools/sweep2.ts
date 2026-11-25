// Second sweep: bigger whale prints, younger coins, graduation thresholds.
//   node tools/sweep2.ts <kit dir>

import { createStrategy, DEFAULT_PARAMS, type StrategyParams } from "../strategy.ts";
import { loadDataset, makeHello, phaseSeed, simulate } from "./sim.ts";

const kit = process.argv[2];
if (kit === undefined) {
  console.error("usage: node tools/sweep2.ts <kit dir>");
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
    `${label.padEnd(44)} net ${sol(r.netPnl)}  trips ${String(r.trips.length).padStart(3)}  wins ${String(wins).padStart(3)}  coins ${String(r.mints).padStart(3)}  dd ${r.maxDrawdown.toFixed(3)}  fills ${r.fills}`,
  );
}

run("whale 1.5", { whaleSol: 1.5 });
run("whale 3", { whaleSol: 3 });
run("whale 5", { whaleSol: 5 });
run("whale 2 + age30", { whaleSol: 2, maxAge: 30 });
run("whale 2 + age60", { whaleSol: 2, maxAge: 60 });
run("whale 3 + age30", { whaleSol: 3, maxAge: 30 });
run("whale 3 + age60", { whaleSol: 3, maxAge: 60 });
run("whale 5 + age60", { whaleSol: 5, maxAge: 60 });
run("whale 2 + age30 + minReal2", { whaleSol: 2, maxAge: 30, minRealSol: 2 });
run("whale 2 + age30 + minReal5", { whaleSol: 2, maxAge: 30, minRealSol: 5 });
run("whale 2 + age30 + maxReal20", { whaleSol: 2, maxAge: 30, maxRealSol: 20 });
run("whale 2 + age30 + tp25/sl08", { whaleSol: 2, maxAge: 30, takeProfit: 0.25, stopLoss: 0.08 });
run("whale 2 + age30 + tp12/sl06", { whaleSol: 2, maxAge: 30, takeProfit: 0.12, stopLoss: 0.06 });
run("whale 2 + age30 + hold40", { whaleSol: 2, maxAge: 30, maxHold: 40 });
run("whale 2 + age30 + hold300", { whaleSol: 2, maxAge: 30, maxHold: 300 });
run("whale 2 + age30 + no dev-sell", { whaleSol: 2, maxAge: 30, exitOnDevSell: false });
run("grad 20 / share 0.6", { gradMinRealSol: 20, gradMinBuyShare: 0.6 });
run("grad 30 / share 0.6", { gradMinRealSol: 30, gradMinBuyShare: 0.6 });
run("grad 15 / share 0.6", { gradMinRealSol: 15, gradMinBuyShare: 0.6 });
run("whale 2 + grad 20", { whaleSol: 2, gradMinRealSol: 20, gradMinBuyShare: 0.6 });
run("whale 2 + age30 + grad 20", { whaleSol: 2, maxAge: 30, gradMinRealSol: 20, gradMinBuyShare: 0.6 });
run("whale 2 + age30 + stake 0.03", { whaleSol: 2, maxAge: 30, stakeSol: 0.03 });
run("whale 2 + age30 + stake 0.08", { whaleSol: 2, maxAge: 30, stakeSol: 0.08 });
