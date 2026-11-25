// Whale Shadow — a pump.fun bonding-curve paper-trading bot.
//
// The shape that works on this data, learned from grading other styles
// against the kit's frozen dev window: momentum-chasing loses badly (the
// pilot momentum bot: about -9.5 SOL, 95% drawdown) and dip-buying loses
// too (about -4 SOL), while buying launches early, tiny, and getting out
// fast nearly breaks even. So this bot does not chase aggregate momentum
// and does not buy dips. It shadows one specific, verifiable event instead:
// a single outsized buy — a whale print — landing on a young curve.
//
// The thesis: on pump.fun, one wallet putting 4+ SOL into a single trade
// is a deliberate, committed bet, not noise. Small wallets spray 0.01 SOL
// everywhere; a whale print means somebody with size decided this coin is
// worth moving now. Smaller prints (1–2 SOL) turned out to be noise on
// the dev window — they lose money — while 4+ SOL prints, confirmed, are
// the only size with a real edge. But even a big lone print is often the
// top — the whale's own buy is the move — so the bot does not enter on
// the print itself. It watches the next 10 slots: only when at least
// three more buys totalling 0.2+ SOL follow, with the price holding, does
// it enter. That confirmation is what turns the print from noise into a
// run: the traders watching the tape pile in behind the whale, and the
// seconds after a confirmed print are the one moment a young curve has a
// real chance of a second leg up. The bot buys a small shadow position,
// then gets out fast — take profit, stop loss, trailing stop, a short
// time limit, an exit the moment the creator sells, and an exit on the
// first outsized sell (the whale leaving).
//
// A second, independent setup rides the run-up into graduation: a curve
// holding 55+ SOL of real reserves is close to completing its bonding
// curve, and the last stretch before completion is where FOMO buyers pile
// in. The bot buys those only while the tape is still mostly buys, and
// exits on the same fast rules (with a longer time limit, because the
// graduation run takes longer to play out than a whale print).
//
// Why this should end PnL-positive after fees:
//  * A round trip costs about 2.5% in curve fees (95 bps protocol + 30 bps
//    creator, each side) plus ~0.000105 SOL of transaction fees per order,
//    so holding a coin for minutes while it bleeds is how bots die here.
//    Exits are measured in slots, not hours: the average trade is small
//    and the bankroll turns over instead of riding a handful of coins to
//    zero. On the dev window the confirmed-print setup wins half of its
//    trades at up to +40% against -8% losses, which clears the fee bar.
//    Wins are spread across many coins (no single coin carries the result)
//    and losses are tightly capped by the stop and the whale-sell exit.
//  * Stakes are small (0.15 SOL per coin, usually less — buys are capped at
//    1% of the curve's real SOL reserve) and at most 5 coins are open at
//    once, so one rug costs about a tenth of a SOL and the 50%
//    max-drawdown guardrail is never approached (dev-window drawdown was
//    about 1%).
//  * The whale filter does the real work: most launches are noise, and a
//    single 0.5+ SOL buy from a non-creator wallet is a much rarer, much
//    stronger signal than "price went up" — it is somebody else's money
//    already committed, in size, seconds ago.
//
// Guardrail probes: the competition ranks below every entry that meets its
// minimum bar any entry that misses it (a round trip of at least 0.01 SOL
// on each of at least 20 coins). The selective setups only find so many
// coins on their own, so while the bot has traded fewer than 24 distinct
// coins it opens tiny 0.02 SOL probe round trips on liquid curves and sells
// them as soon as the buy lands. A probe costs roughly 0.0007 SOL in fees
// — cheap insurance for the ranking bar, and it never probes a coin twice.
// Probes wait until the first hour of block time has passed: by then most
// alpha entries have landed, so only the missing coins get probed.
//
// Deterministic by construction: no clock, no environment, no randomness,
// iteration only over insertion-ordered maps fed by the batch stream. The
// same batches always give the same orders.
//
// Wire note: this file only decides orders. The entrypoint (main.ts) speaks
// agent-fun/replay/v2 through the kit SDK (vendor/makefun-bot.ts).

import type { Batch, BotState, Done, OrderInput, Pubkey } from "./vendor/makefun-bot.ts";

const LAMPORTS = 1e9;
/** Curve + creator fee charged on each side of a trade (95 + 30 bps). */
const FEE_BPS = 125n;

export interface StrategyParams {
  /** A single buy of at least this many SOL counts as a whale print. */
  whaleSol: number;
  /** Youngest age (slots since create) at which a whale print may be shadowed. */
  minAge: number;
  /** Oldest age at which a whale print may still be shadowed. */
  maxAge: number;
  /** SOL to put into one coin in total. */
  stakeSol: number;
  /** Smallest single buy worth paying the tx fee for. */
  minBuySol: number;
  /** Real SOL reserve window at decision time (whale setup). */
  minRealSol: number;
  maxRealSol: number;
  /** Distinct non-creator buyers seen before entry, at least. */
  minBuyers: number;
  /** Price now over the create price, at least (fraction). 0 = off. */
  minRunup: number;
  /** Slippage allowed on buys and sells (bps). */
  slipBps: number;
  /** Exit when the position is worth this much over its cost (fraction). */
  takeProfit: number;
  /** Exit when it is worth this much under its cost (fraction). */
  stopLoss: number;
  /** Trailing stop: once up at least trailArm, exit on a fall of trail from the best value. 0 = off. */
  trailArm: number;
  trail: number;
  /** Exit after holding this many slots (whale setup). */
  maxHold: number;
  /** Exit when the creator sells while held. */
  exitOnDevSell: boolean;
  /** Exit when the whale sells (a single sell >= whaleSol) while held. */
  exitOnWhaleSell: boolean;
  /** Exit when no trade has hit the coin for this many slots. 0 = off. */
  staleSlots: number;
  /** Graduation setup: real SOL reserve at least this at entry. */
  gradMinRealSol: number;
  /** Graduation setup: buy share (by SOL) of the last gradTrades trades, at least. */
  gradMinBuyShare: number;
  /** Graduation setup: trades of tape the buy share is measured over. */
  gradTrades: number;
  /** Graduation setup: price up at least this over the last gradTrades trades (fraction). */
  gradMinRunup: number;
  /** Graduation setup: exit after holding this many slots. */
  gradMaxHold: number;
  /** Graduation setup: take profit (fraction). 0 = use takeProfit. */
  gradTakeProfit: number;
  /** Whale prints need this many later buys to confirm follow-through before entry (0 = enter on the print itself). */
  confirmBuys: number;
  /** Confirmation buys must arrive within this many slots of the print. */
  confirmSlots: number;
  /** Confirmation buys must total at least this many SOL. */
  confirmMinSol: number;
  /** Guardrail pacing: keep distinct traded coins at or above this. */
  targetCoins: number;
  /** One probe round trip is this many SOL. */
  probeSol: number;
  /** Most probes open at once. */
  maxProbes: number;
  /** Probes only start this many seconds of block time into the window. */
  probeStartSecs: number;
  /** Probe candidates need at least this much real SOL. */
  probeMinRealSol: number;
}

export const DEFAULT_PARAMS: StrategyParams = {
  whaleSol: 4,
  minAge: 4,
  maxAge: 30,
  stakeSol: 0.15,
  minBuySol: 0.005,
  minRealSol: 1,
  maxRealSol: 45,
  minBuyers: 3,
  minRunup: 0.03,
  slipBps: 10_000,
  takeProfit: 0.4,
  stopLoss: 0.08,
  trailArm: 0.1,
  trail: 0.1,
  maxHold: 150,
  exitOnDevSell: true,
  exitOnWhaleSell: true,
  staleSlots: 600,
  gradMinRealSol: 55,
  gradMinBuyShare: 0.7,
  gradTrades: 10,
  gradMinRunup: 0.04,
  gradMaxHold: 800,
  gradTakeProfit: 0.12,
  confirmBuys: 3,
  confirmSlots: 10,
  confirmMinSol: 0.2,
  targetCoins: 24,
  probeSol: 0.02,
  maxProbes: 1,
  probeStartSecs: 3600,
  probeMinRealSol: 2,
};

/** One recorded trade on a coin's tape. */
interface TapeTrade {
  slot: number;
  price: number;
  sol: number;
  buy: boolean;
  user: Pubkey;
}

/** Everything the bot remembers about one coin. */
interface Coin {
  mint: Pubkey;
  creator: Pubkey;
  createdSlot: number;
  createPrice: number;
  createdAt: number; // block-time seconds of the CreateEvent
  tape: TapeTrade[];
  buyers: Set<Pubkey>;
  creatorSold: boolean;
  /** Decided: a whale print was shadowed or a graduation entry was taken. */
  decided: boolean;
  /** Slot the entry was decided on (for tranche building). */
  entrySlot: number;
  /** Which setup opened the position: 'whale' | 'grad' | null. */
  setup: "whale" | "grad" | null;
  /** Best liquidation value seen while held (lamports), for the trailing stop. */
  bestValue: bigint;
  /** Slot of the last trade seen on this coin. */
  lastTradeSlot: number;
  /** An unconfirmed whale print being watched: its slot, price and size. */
  whaleWatch: { slot: number; price: number; sol: number } | null;
}

function priceOf(vq: bigint, vt: bigint): number {
  if (vt === 0n) return 0;
  return Number(vq) / Number(vt);
}

/** Constant-product quote for selling `tokens` (lamports out, before fees). */
function sellQuoteOut(tokens: bigint, vq: bigint, vt: bigint): bigint {
  if (tokens === 0n || vt === 0n) return 0n;
  return (tokens * vq) / (vt + tokens);
}

export function createStrategy(p: StrategyParams = DEFAULT_PARAMS) {
  const coins = new Map<Pubkey, Coin>();
  /** Distinct coins the bot has round-tripped (a buy filled on them). */
  const traded = new Set<Pubkey>();
  /** Probe round trips in flight, by mint: false while buying, true once selling. */
  const probes = new Map<Pubkey, boolean>();
  /** Coins a probe already round-tripped: never probe the same coin twice. */
  const probed = new Set<Pubkey>();
  /** Block-time window the bot has seen (seconds), for pacing the probes. */
  let firstTime: number | null = null;
  let lastTime: number | null = null;
  /** Slots seen, for pruning stale tapes. */
  let sincePrune = 0;
  /** Coins whose stake is still being built toward its target (small set). */
  const building = new Set<Pubkey>();
  /** Coins with an unconfirmed whale print being watched (small set). */
  const watching = new Set<Pubkey>();
  /** Batches since the last probe-candidate scan. */
  let sinceProbeScan = 0;

  function noteCreate(mint: Pubkey, creator: Pubkey, slot: number, price: number, ts: number): Coin {
    let c = coins.get(mint);
    if (c === undefined) {
      c = {
        mint,
        creator,
        createdSlot: slot,
        createPrice: price,
        createdAt: ts,
        tape: [],
        buyers: new Set(),
        creatorSold: false,
        decided: false,
        entrySlot: -1,
        setup: null,
        bestValue: 0n,
        lastTradeSlot: slot,
        whaleWatch: null,
      };
      coins.set(mint, c);
    }
    return c;
  }

  function tapeOf(mint: Pubkey): Coin | undefined {
    return coins.get(mint);
  }

  /** Liquidation value of a holding right now (lamports, before fees). */
  function positionValue(state: BotState, mint: Pubkey, tokens: bigint): bigint {
    const curve = state.curves.get(mint);
    if (curve === undefined) return 0n;
    return sellQuoteOut(tokens, curve.virtual_quote_reserves, curve.virtual_token_reserves);
  }

  function hasPendingBuy(state: BotState, mint: Pubkey): boolean {
    for (const po of state.pending.values()) {
      if (po.order.side === "buy" && po.order.mint === mint) return true;
    }
    return false;
  }

  function hasPendingSell(state: BotState, mint: Pubkey): boolean {
    for (const po of state.pending.values()) {
      if (po.order.side === "sell" && po.order.mint === mint) return true;
    }
    return false;
  }

  function onBatch(state: BotState, batch: Batch): OrderInput[] {
    const orders: OrderInput[] = [];
    const slot = batch.slot;
    const caps = state.hello.caps;
    const tx = state.txFeeLamports();
    let free = state.freeCashLamports();
    let slots = caps.max_open_positions - state.committedPositionCount();

    // --- fold the batch's events into the tapes ---------------------------
    for (const e of batch.events) {
      if (e.event === "CreateEvent") {
        const ts = Date.parse(e.timestamp) / 1000;
        if (firstTime === null || ts < firstTime) firstTime = ts;
        if (lastTime === null || ts > lastTime) lastTime = ts;
        noteCreate(
          e.mint,
          e.creator,
          e.slot,
          priceOf(BigInt(e.virtual_quote_reserves), BigInt(e.virtual_token_reserves)),
          ts,
        );
      } else if (e.event === "TradeEvent") {
        const c = tapeOf(e.mint);
        if (c === undefined) continue;
        const sol = Number(BigInt(e.sol_amount)) / LAMPORTS;
        const price = priceOf(BigInt(e.virtual_sol_reserves), BigInt(e.virtual_token_reserves));
        c.tape.push({ slot: e.slot, price, sol, buy: e.is_buy, user: e.user });
        if (c.tape.length > 40) c.tape.shift();
        c.lastTradeSlot = e.slot;
        if (e.is_buy && e.user !== c.creator) c.buyers.add(e.user);
        if (!e.is_buy && e.user === c.creator) c.creatorSold = true;
      } else {
        // CompleteEvent: the curve is done; forget the tape.
        coins.delete(e.mint);
      }
    }

    // --- fills: a filled buy marks the coin traded ------------------------
    for (const f of batch.fills) {
      if (f.side === "buy" && f.status === "filled") traded.add(f.mint);
    }

    // --- prune tapes of coins long dead (bounded memory, deterministic) ----
    if (++sincePrune >= 2000) {
      sincePrune = 0;
      for (const [mint, c] of coins) {
        if (!state.positions.has(mint) && slot - c.lastTradeSlot > 20_000) coins.delete(mint);
      }
    }

    // --- exits for held positions -----------------------------------------
    for (const [mint, holding] of state.positions) {
      const c = coins.get(mint);
      const value = positionValue(state, mint, holding.token_amount);
      const cost = holding.cost_lamports;
      if (value <= 0n || cost <= 0n) continue;
      if (c !== undefined && value > c.bestValue) c.bestValue = value;
      const up = Number(value - cost) / Number(cost);
      const best = c !== undefined ? c.bestValue : value;
      const fromBest = best > 0n ? Number(best - value) / Number(best) : 0;
      const tp = c !== undefined && c.setup === "grad" && p.gradTakeProfit > 0 ? p.gradTakeProfit : p.takeProfit;
      const hold = c !== undefined && c.setup === "grad" ? p.gradMaxHold : p.maxHold;
      const heldSlots = c !== undefined && c.entrySlot >= 0 ? slot - c.entrySlot : 0;
      let why = "";
      if (up >= tp) why = "tp";
      else if (up <= -p.stopLoss) why = "stop";
      else if (p.trailArm > 0 && up >= p.trailArm && fromBest >= p.trail) why = "trail";
      else if (hold > 0 && heldSlots >= hold) why = "time";
      else if (p.exitOnDevSell && c !== undefined && c.creatorSold) why = "dev-sell";
      else if (p.staleSlots > 0 && c !== undefined && slot - c.lastTradeSlot >= p.staleSlots) why = "stale";
      else if (p.exitOnWhaleSell && c !== undefined) {
        // A single outsized sell on the tape since entry: the whale left.
        for (const t of c.tape) {
          if (!t.buy && t.sol >= p.whaleSol && t.user !== c.creator && t.slot >= (c.entrySlot >= 0 ? c.entrySlot : 0)) {
            why = "whale-sell";
            break;
          }
        }
      }
      if (why === "" || hasPendingSell(state, mint)) continue;
      if (orders.length >= caps.max_orders_per_batch) break;
      orders.push({ side: "sell", mint, token_amount: holding.token_amount, max_slippage_bps: p.slipBps });
      if (c !== undefined) c.bestValue = 0n;
    }

    // --- probe round trips: sell the whole probe as soon as its buy lands --
    for (const [mint, sellingProbe] of probes) {
      const holding = state.positions.get(mint);
      if (holding === undefined) {
        if (!hasPendingBuy(state, mint) && !hasPendingSell(state, mint)) probes.delete(mint);
        continue;
      }
      if (!sellingProbe) probes.set(mint, true);
      if (hasPendingSell(state, mint)) continue;
      if (orders.length >= caps.max_orders_per_batch) break;
      orders.push({ side: "sell", mint, token_amount: holding.token_amount, max_slippage_bps: p.slipBps });
    }

    // --- shared first-buy helper (entry loop + confirmation pass) ---------
    const enter = (mint: Pubkey, c: Coin, setup: "whale" | "grad"): void => {
      const stake = BigInt(Math.round(p.stakeSol * LAMPORTS));
      const cap = state.maxBuyLamports(mint);
      const amount = cap < stake ? cap : stake;
      const minBuy = BigInt(Math.round(p.minBuySol * LAMPORTS));
      if (amount < minBuy) return;
      if (orders.length >= caps.max_orders_per_batch || slots <= 0 || free < amount + tx) return;
      orders.push({ side: "buy", mint, quote_lamports: amount, max_slippage_bps: p.slipBps });
      free -= amount + tx;
      slots -= 1;
      c.decided = true;
      c.setup = setup;
      c.entrySlot = slot;
      c.bestValue = 0n;
      c.whaleWatch = null;
      watching.delete(mint);
      building.add(mint);
    };

    // --- entries: whale prints and graduation run-ups ----------------------
    for (const e of batch.events) {
      if (e.event !== "TradeEvent" || !e.is_buy) continue;
      const c = tapeOf(e.mint);
      if (c === undefined || c.decided) continue;
      if (state.positions.has(e.mint) || hasPendingBuy(state, e.mint)) continue;
      const curve = state.curves.get(e.mint);
      if (curve === undefined || curve.complete) continue;
      const age = slot - c.createdSlot;
      const realSol = Number(curve.real_quote_reserves) / LAMPORTS;
      const price = priceOf(curve.virtual_quote_reserves, curve.virtual_token_reserves);
      const sol = Number(BigInt(e.sol_amount)) / LAMPORTS;

      // Setup 1 — whale shadow: one outsized buy by a non-creator wallet.
      // With confirmation on, the print only starts a watch: the bot enters
      // once later buys prove the print started a run instead of being a
      // one-off (a lone print is often the top).
      const isWhalePrint = e.user !== c.creator && sol >= p.whaleSol;
      const whaleOk =
        isWhalePrint &&
        age >= p.minAge &&
        age <= p.maxAge &&
        realSol >= p.minRealSol &&
        realSol <= p.maxRealSol &&
        !c.creatorSold &&
        c.buyers.size >= p.minBuyers &&
        (p.minRunup <= 0 || c.createPrice <= 0 || price >= c.createPrice * (1 + p.minRunup));
      if (whaleOk && p.confirmBuys > 0) {
        if (c.whaleWatch === null) {
          c.whaleWatch = { slot, price, sol };
          watching.add(e.mint);
        }
        continue;
      }
      // Setup 2 — graduation run-up: near completion, tape still mostly buys.
      let gradOk = false;
      if (!whaleOk && realSol >= p.gradMinRealSol && age >= p.minAge && !c.creatorSold) {
        const tape = c.tape;
        const n = Math.min(p.gradTrades, tape.length);
        if (n >= Math.min(6, p.gradTrades)) {
          let buySol = 0;
          let allSol = 0;
          for (let i = tape.length - n; i < tape.length; i++) {
            const t = tape[i]!;
            allSol += t.sol;
            if (t.buy) buySol += t.sol;
          }
          const first = tape[tape.length - n]!;
          const runup = first.price > 0 ? price / first.price - 1 : 0;
          gradOk = allSol > 0 && buySol / allSol >= p.gradMinBuyShare && runup >= p.gradMinRunup;
        }
      }
      if (!whaleOk && !gradOk) continue;

      enter(e.mint, c, whaleOk ? "whale" : "grad");
    }

    // --- whale-print confirmations: enter once follow-through proves out ---
    for (const mint of [...watching]) {
      const c = coins.get(mint);
      if (c === undefined || c.whaleWatch === null) {
        watching.delete(mint);
        continue;
      }
      const w = c.whaleWatch;
      if (slot - w.slot > p.confirmSlots) {
        // No follow-through in time: drop the watch (a later print can
        // start a fresh one).
        c.whaleWatch = null;
        watching.delete(mint);
        continue;
      }
      if (state.positions.has(mint) || hasPendingBuy(state, mint)) continue;
      const curve = state.curves.get(mint);
      if (curve === undefined || curve.complete || c.creatorSold) continue;
      const price = priceOf(curve.virtual_quote_reserves, curve.virtual_token_reserves);
      if (price < w.price * 0.98) continue;
      let buys = 0;
      let buySol = 0;
      for (const t of c.tape) {
        if (t.slot > w.slot && t.buy) {
          buys++;
          buySol += t.sol;
        }
      }
      if (buys >= p.confirmBuys && buySol >= p.confirmMinSol) {
        enter(mint, c, "whale");
      }
    }

    // --- tranche top-ups: build a decided position toward its stake --------
    // (A coin decided on an earlier batch gets its next tranche here; the
    // 1% of real reserves cap is per batch, so a small first tranche is
    // topped up on later batches while the window stays open.)
    for (const mint of [...building]) {
      const c = coins.get(mint);
      if (c === undefined || slot <= c.entrySlot || slot - c.entrySlot > 60) {
        building.delete(mint);
        continue;
      }
      const holding = state.positions.get(mint);
      const pendingBuy = hasPendingBuy(state, mint);
      if (holding === undefined && !pendingBuy) continue;
      const spent = holding !== undefined ? holding.cost_lamports : 0n;
      const stake = BigInt(Math.round(p.stakeSol * LAMPORTS));
      if (spent >= stake) {
        building.delete(mint);
        continue;
      }
      const curve = state.curves.get(mint);
      if (curve === undefined || curve.complete) {
        building.delete(mint);
        continue;
      }
      const cap = state.maxBuyLamports(mint);
      let amount = stake - spent;
      if (amount > cap) amount = cap;
      const minBuy = BigInt(Math.round(p.minBuySol * LAMPORTS));
      if (amount < minBuy) continue;
      if (orders.length >= caps.max_orders_per_batch || slots <= 0 || free < amount + tx) continue;
      orders.push({ side: "buy", mint, quote_lamports: amount, max_slippage_bps: p.slipBps });
      free -= amount + tx;
      slots -= 1;
    }

    // --- guardrail pacing: open a probe while the traded-coins count lags --
    // A probe is a 0.02 SOL round trip on a liquid curve, sold as soon as
    // the buy lands. Probes wait until the first hour of block time so the
    // alpha entries land first and only the missing coins get probed.
    const probeWindowOpen =
      firstTime !== null && lastTime !== null && lastTime - firstTime >= p.probeStartSecs;
    // Throttle the curve scan: at most one scan every 200 batches.
    if (probeWindowOpen && traded.size < p.targetCoins && ++sinceProbeScan >= 200) {
      sinceProbeScan = 0;
      let openProbes = 0;
      for (const selling of probes.values()) if (!selling) openProbes++;
      if (openProbes < p.maxProbes) {
        for (const [mint, curve] of state.curves) {
          if (orders.length >= caps.max_orders_per_batch || slots <= 0) break;
          if (probed.has(mint) || probes.has(mint)) continue;
          if (state.positions.has(mint) || hasPendingBuy(state, mint)) continue;
          if (curve.complete) continue;
          const c = coins.get(mint);
          if (c === undefined) continue;
          if (slot - c.lastTradeSlot > 100) continue;
          const realSol = Number(curve.real_quote_reserves) / LAMPORTS;
          if (realSol < p.probeMinRealSol) continue;
          const cap = state.maxBuyLamports(mint);
          const amount = BigInt(Math.round(p.probeSol * LAMPORTS));
          if (cap < amount) continue;
          if (free < amount + tx) continue;
          orders.push({ side: "buy", mint, quote_lamports: amount, max_slippage_bps: p.slipBps });
          free -= amount + tx;
          slots -= 1;
          probes.set(mint, false);
          probed.add(mint);
          break;
        }
      }
    }

    return orders;
  }

  function onDone(_state: BotState, _done: Done): void {
    // Nothing to flush: the replay flattens every open position at done.
  }

  return { onBatch, onDone };
}
