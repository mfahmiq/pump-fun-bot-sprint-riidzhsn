// Parameter sweep for strategy.ts on the kit's dev window (local sim).
// Loads the dataset once, then runs each config in-process and prints one
// line per config: net PnL, trips, wins, coins, max drawdown.
//
//   node tools/sweep.ts <kit dir>

import { createStrategy, DEFAULT_PARAMS, type StrategyParams } from "../strategy.ts";
import { loadDataset, makeHello, phaseSeed, simulate } from "./sim.ts";

const kit = process.argv[2];
if (kit === undefined) {
  console.error("usage: node tools/sweep.ts <kit dir>");
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

run("default", {});
run("whale-only (grad off)", { gradMinRealSol: 10000 });
run("grad-only (whale off)", { whaleSol: 10000 });
run("whale 1.0 SOL", { whaleSol: 1 });
run("whale 2.0 SOL", { whaleSol: 2 });
run("whale 0.3 SOL", { whaleSol: 0.3 });
run("tp12/sl06", { takeProfit: 0.12, stopLoss: 0.06 });
run("tp25/sl12", { takeProfit: 0.25, stopLoss: 0.12 });
run("tp15/sl05", { takeProfit: 0.15, stopLoss: 0.05 });
run("tp30/sl10", { takeProfit: 0.3, stopLoss: 0.1 });
run("hold 40", { maxHold: 40 });
run("hold 80", { maxHold: 80 });
run("hold 300", { maxHold: 300 });
run("maxAge 60", { maxAge: 60 });
run("maxAge 30", { maxAge: 30 });
run("minBuyers 5", { minBuyers: 5 });
run("minBuyers 1", { minBuyers: 1 });
run("minRunup 0", { minRunup: 0 });
run("minRunup 0.10", { minRunup: 0.1 });
run("no trailing", { trailArm: 0, trail: 0 });
run("trail 0.06", { trailArm: 0.08, trail: 0.06 });
run("stake 0.10", { stakeSol: 0.1 });
run("stake 0.03", { stakeSol: 0.03 });
run("no whale-sell exit", { exitOnWhaleSell: false });
run("no dev-sell exit", { exitOnDevSell: false });
run("stale off", { staleSlots: 0 });
run("grad tp 0.18", { gradTakeProfit: 0.18 });
run("grad minReal 40", { gradMinRealSol: 40 });
run("grad minReal 70", { gradMinRealSol: 70 });
