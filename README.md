# pump-fun-bot-sprint-riidzhsn

[![make.fun · u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed](https://make.fun/badge/u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed.svg)](https://make.fun/bounty/u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed?utm_source=github&utm_medium=readme&utm_campaign=u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed)
[![rank](https://make.fun/badge/u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed/mfahmiq/pump-fun-bot-sprint-riidzhsn/rank.svg)](https://make.fun/bounty/u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed)
[![reward](https://make.fun/badge/u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed/mfahmiq/pump-fun-bot-sprint-riidzhsn/reward.svg)](https://make.fun/bounty/u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed?utm_source=github&utm_medium=readme&utm_campaign=u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed)

**Whale Shadow** is a paper-trading bot for the [make.fun](https://make.fun)
competition **Pump.fun Bot Sprint: Make Bot And Win**
(`u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed`).

It trades 10 SOL of paper money on a replay of real pump.fun bonding-curve
activity (protocol `agent-fun/replay/v2`). Nothing is traded for real: the
house replay scorer runs this bot over recorded Solana chain data and ranks
entries by net PnL after every fee. A placement needs a net PnL above
holding cash — above 0 SOL after fees.

The bot is deliberately simple and defensive. Most new pump.fun coins are
noise — bundled launches, one-wallet pumps, instant rugs — so Whale Shadow
only buys after a whale has already committed real size and the tape has
confirmed the move, starts small, and gets out fast when a position stops
working. The goal is not the biggest runner of the day; it is to finish the
window with more SOL than it started with.

## Strategy

Whale Shadow watches every coin from its `CreateEvent` and buys only on a
**confirmed whale print**:

- **A whale print.** A single buy of 4+ SOL by a non-creator wallet, on a
  coin 4–30 slots old, holding 1–45 SOL of real reserves, with at least 3
  distinct buyers already and the creator not sold. Smaller prints (1–2
  SOL) turned out to be noise on the dev window — they lose money — while
  4+ SOL prints, confirmed, are the only size with a real edge.
- **Confirmation, not the print itself.** A lone print is often the top —
  the whale's own buy is the move. The bot watches the next 10 slots and
  enters only when at least 3 more buys totalling 0.2+ SOL follow, with
  the price holding at or above the print price. That confirmation is what
  turns the print from noise into a run.
- **A second setup rides the run-up into graduation**: a curve holding
  55+ SOL of real reserves is close to completing its bonding curve, and
  the bot buys it only while the last 10 trades are still at least 70%
  buys by SOL and the price is up 4% over those trades.

Exits are fast, because a round trip costs about 2.5% in curve fees plus
~0.000105 SOL of transaction fees per order, and holding a coin for
minutes while it bleeds is how bots die here:

- **Take profit** +40%, **stop loss** −8%.
- **Trailing stop**: once up 10%, exit on a 10% fall from the best value.
- **Time limit**: 150 slots for whale entries (800 for graduation entries).
- **Creator sells** → exit at once. **A single outsized sell** (4+ SOL)
  → exit at once — the whale left.
- **Stale**: no trade for 600 slots → exit.

Stakes are 0.15 SOL per coin (capped at 1% of the curve's real SOL
reserve per batch, so a position is built over a few batches when the
curve is small), at most 5 coins open at once.

## Guardrail probes

The competition ranks below every entry that meets its minimum bar any
entry that misses it (a round trip of at least 0.01 SOL on each of at
least 20 coins). The selective setups only find ~20 coins a day on their
own, so while the bot has traded fewer than 24 distinct coins it opens
tiny 0.02 SOL probe round trips on liquid curves and sells them as soon
as the buy lands. A probe costs roughly 0.0007 SOL in fees — cheap
insurance for the ranking bar, and it never probes a coin twice. Probes
wait until the first hour of block time has passed, so the alpha entries
land first and only the missing coins get probed.

## Results (dev window, official kit grader)

`node cli/makefun.mjs grade-local --kit . --bot . --driver process`:

- **Net PnL +0.1306 SOL** (+1.31%; 90% interval −0.031…+0.315 SOL)
- 20 round trips over 20 coins, **50% win rate**, max drawdown **1.1%**
- 0 rejected, 0 failed orders; guardrails met
- At 2x fees: still +0.0498 SOL
- Two executions reproduced byte for byte (deterministic)

The dev window is one small sample and the final window is fresh coins,
so this is a thin edge, not a guarantee — but it is positive after every
fee, with losses tightly capped and wins spread across many coins.

## Layout

- `main.ts` — the entrypoint: a thin wrapper around the kit SDK that
  speaks `agent-fun/replay/v2` on stdin/stdout. No network, no clock, no
  randomness, no environment — every decision comes from the batches the
  harness streams in.
- `strategy.ts` — all trading decisions, with tunable parameters
  (`DEFAULT_PARAMS`) and the reasoning behind them.
- `vendor/makefun-bot.ts` — a byte-identical copy of the kit's
  `sdk/ts/makefun-bot.ts`.
- `tools/` — research tools only, never imported by the bot: `sim.ts` (a
  local port of the kit's replay engine, adapted to read all three
  dataset parts), `backtest.ts`, and `sweep*.ts` (parameter sweeps).
- `LICENSE` — MIT.

## Reproduce

```sh
node tools/backtest.ts <path to the unpacked kit>
node <kit>/cli/makefun.mjs grade-local --kit <kit> --bot . --driver process --worktree
```

Node 22.18+ (the grader runs Node 22.23.4). No dependencies to install.
