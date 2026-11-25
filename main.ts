// Whale Shadow — a pump.fun bonding-curve paper-trading bot for the
// make.fun competition "Pump.fun Bot Sprint: Make Bot And Win"
// (u-riidzhsn-pump-fun-bot-sprint-make-bot-and-win-cb203fed).
//
// The bot trades 10 SOL of paper money on a replay of pump.fun
// bonding-curve activity (protocol agent-fun/replay/v2). It is long-only,
// deterministic and self-contained: no clock, no environment, no
// randomness, no network — every decision comes from the batches the
// harness streams on stdin, so the two graded runs produce identical
// action logs.
//
// Strategy in one paragraph (the full reasoning lives in README.md and in
// strategy.ts): shadow whale prints — buy a small position right after a
// single outsized buy (0.5+ SOL) from a non-creator wallet lands on a
// young curve — and ride the run-up into graduation on curves near
// completion while the tape is still mostly buys. Get out fast: take
// profit, stop loss, trailing stop, short time limit, exit on a creator
// sell or on the first outsized sell. Tiny stakes cycle through many
// coins, so one rug costs ~0.05 SOL and the rare runner pays for the
// losers.
//
// Wire protocol: the harness sends newline-delimited JSON (hello, then one
// batch per slot, then done) on stdin; the bot answers every batch with
// exactly one reply line on stdout echoing its seq. Only the Node standard
// library is used, and nothing is read from outside this repository. The
// entrypoint is a thin wrapper around the kit SDK (vendor/makefun-bot.ts,
// a byte-identical copy of the kit's sdk/ts/makefun-bot.ts); all trading
// decisions live in strategy.ts.

import { runBot } from "./vendor/makefun-bot.ts";
import { createStrategy } from "./strategy.ts";

await runBot(createStrategy());
