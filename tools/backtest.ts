// Offline backtest of strategy.ts on the kit's dev window with the local
// engine port (tools/sim.ts, adapted from the kit's pilot baselines).
//
//   node tools/backtest.ts <kit dir> ['{"stakeSol":0.05}'] [--trips]
//
// Prints net PnL, fills, coins, drawdown and reject reasons; --trips lists
// every round trip. This is a research tool only; the grader's own engine
// is what scores (see `makefun grade-local`).

import { createStrategy, DEFAULT_PARAMS, type StrategyParams } from "../strategy.ts";
import { loadDataset, makeHello, phaseSeed, simulate } from "./sim.ts";

const kit = process.argv[2];
if (kit === undefined) {
  console.error("usage: node tools/backtest.ts <kit dir> [params json] [--trips]");
  process.exit(2);
}
const overrides =
  process.argv[3] !== undefined && process.argv[3].startsWith("{")
    ? (JSON.parse(process.argv[3]) as Partial<StrategyParams>)
    : {};
const ds = loadDataset(kit);
const hello = makeHello(phaseSeed("pilot-pumpfun-replay", "dev", ds.sha256));
const params = { ...DEFAULT_PARAMS, ...overrides };
const r = simulate(ds, hello, createStrategy(params));
const sol = (x: bigint) => (Number(x) / 1e9).toFixed(6);
console.log(
  `net ${sol(r.netPnl)} SOL  fills ${r.fills}  coins ${r.mints}  trips ${r.trips.length}  wins ${r.trips.filter((t) => t.pnl > 0n).length}  dd ${r.maxDrawdown.toFixed(4)}  rejected ${r.rejected} ${JSON.stringify(r.rejectReasons)}  failed ${r.failed}`,
);
const noFail = simulate(ds, hello, createStrategy(params), { failKey: null });
const twoX = simulate(ds, hello, createStrategy(params), { feeMultiplier: 2n });
console.log(`without failed txs ${sol(noFail.netPnl)}  at 2x fees ${sol(twoX.netPnl)}`);
if (process.argv.includes("--trips")) {
  for (const t of r.trips) console.log(t.mint, t.open, t.close - t.open, sol(t.pnl));
}
