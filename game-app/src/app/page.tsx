"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Card = {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const SYMBOLS = [
  "🚀",
  "🌈",
  "🎧",
  "🍕",
  "🎲",
  "🧠",
  "🐉",
  "🪄",
];

const TOTAL_PAIRS = SYMBOLS.length;

const createDeck = (): Card[] => {
  const deck = SYMBOLS.flatMap((symbol, idx) => [
    {
      id: idx * 2,
      symbol,
      isFlipped: false,
      isMatched: false,
    },
    {
      id: idx * 2 + 1,
      symbol,
      isFlipped: false,
      isMatched: false,
    },
  ]);

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
  }
  return `${seconds}.${tenths}s`;
};

export default function Home() {
  const [cards, setCards] = useState<Card[]>(() => createDeck());
  const [activeCards, setActiveCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [status, setStatus] = useState<"ready" | "playing" | "won">("ready");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const progress = useMemo(
    () => Math.round((matches / TOTAL_PAIRS) * 100),
    [matches],
  );

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearPendingTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutsRef.current = [];
  }, []);

  const resetGame = useCallback(() => {
    stopInterval();
    clearPendingTimeouts();
    setCards(createDeck());
    setActiveCards([]);
    setMoves(0);
    setMatches(0);
    setStatus("ready");
    setElapsedMs(0);
    startTimeRef.current = null;
  }, [stopInterval, clearPendingTimeouts]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("emoji-memory-best");
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) {
        startTransition(() => {
          setBestTime(parsed);
        });
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      stopInterval();
      clearPendingTimeouts();
    };
  }, [stopInterval, clearPendingTimeouts]);

  useEffect(() => {
    if (status !== "playing") {
      stopInterval();
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = performance.now();
    }

    stopInterval();
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Math.round(performance.now() - startTimeRef.current));
      }
    }, 100);

    return () => {
      stopInterval();
    };
  }, [status, stopInterval]);

  const handleCardClick = useCallback(
    (index: number) => {
      if (status === "won" || activeCards.length === 2) {
        return;
      }

      const card = cards[index];
      if (card.isMatched || card.isFlipped) {
        return;
      }

      if (status === "ready") {
        setStatus("playing");
      }

      const revealedCards = cards.map((item, idx) =>
        idx === index ? { ...item, isFlipped: true } : item,
      );
      const newActive = [...activeCards, index];

      setCards(revealedCards);
      setActiveCards(newActive);

      if (newActive.length === 2) {
        setMoves((prev) => prev + 1);
        const [first, second] = newActive;

        if (revealedCards[first].symbol === revealedCards[second].symbol) {
          const timeoutId = setTimeout(() => {
            setCards((prevCards) =>
              prevCards.map((item, idx) =>
                idx === first || idx === second
                  ? { ...item, isMatched: true }
                  : item,
              ),
            );
            setActiveCards([]);
            setMatches((prev) => {
              const next = prev + 1;
              if (next === TOTAL_PAIRS) {
                const finalElapsed = startTimeRef.current
                  ? Math.round(performance.now() - startTimeRef.current)
                  : elapsedMs;
                stopInterval();
                startTimeRef.current = null;
                setElapsedMs(finalElapsed);
                setStatus("won");
                setBestTime((prevBest) => {
                  if (prevBest === null || finalElapsed < prevBest) {
                    window.localStorage.setItem(
                      "emoji-memory-best",
                      String(finalElapsed),
                    );
                    return finalElapsed;
                  }
                  return prevBest;
                });
              }
              return next;
            });
          }, 350);
          timeoutsRef.current.push(timeoutId);
        } else {
          const timeoutId = setTimeout(() => {
            setCards((prevCards) =>
              prevCards.map((item, idx) =>
                idx === first || idx === second
                  ? { ...item, isFlipped: false }
                  : item,
              ),
            );
            setActiveCards([]);
          }, 900);
          timeoutsRef.current.push(timeoutId);
        }
      }
    },
    [status, activeCards, cards, elapsedMs, stopInterval],
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 pb-16 pt-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_55%)]" />
      <div className="relative z-10 w-full max-w-5xl">
        <header className="flex flex-col items-center gap-3 text-center sm:gap-4">
          <span className="rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
            Emoji Memory Match
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Flip, remember, and race against the clock
          </h1>
          <p className="max-w-2xl text-balance text-sm text-white/70 sm:text-base">
            Find all {TOTAL_PAIRS} matching emoji pairs. Keep your streak going,
            improve your memory, and beat your best time.
          </p>
        </header>

        <section className="mt-10 grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:gap-8 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-4 sm:gap-6">
            <div className="rounded-2xl bg-white/5 p-4 text-center shadow-lg shadow-black/10 sm:text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Time
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatTime(elapsedMs)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-center shadow-lg shadow-black/10 sm:text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Moves
              </p>
              <p className="mt-2 text-3xl font-semibold">{moves}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-center shadow-lg shadow-black/10 sm:text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Matches
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {matches}/{TOTAL_PAIRS}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-center shadow-lg shadow-black/10 sm:text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Best Time
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {bestTime !== null ? formatTime(bestTime) : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs uppercase tracking-[0.35em] text-white/50">
              Progress {progress}%
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 sm:gap-5">
            {cards.map((card, index) => {
              const isRevealed = card.isFlipped || card.isMatched;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(index)}
                  className={`group relative aspect-square select-none rounded-3xl border border-white/10 bg-white/10 p-0 text-4xl font-semibold transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white/20 hover:shadow-[0_12px_40px_-20px_rgba(79,70,229,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 sm:text-5xl ${
                    isRevealed
                      ? "bg-white text-slate-900 shadow-[0_12px_40px_-20px_rgba(255,255,255,0.7)]"
                      : status === "won" || activeCards.length === 2
                        ? "pointer-events-none opacity-60"
                        : ""
                  } ${card.isMatched ? "scale-105 bg-emerald-200 text-emerald-900" : ""}`}
                >
                  <span
                    className={`flex h-full w-full items-center justify-center transition-opacity duration-200 ${
                      isRevealed ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {card.symbol}
                  </span>
                  {!isRevealed && (
                    <span className="absolute inset-0 flex items-center justify-center text-base font-medium uppercase tracking-[0.3em] text-white/30 transition-opacity duration-300 group-hover:opacity-60">
                      Tap
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div
              className={`text-center text-sm text-white/60 transition-opacity ${
                status === "won" ? "opacity-100" : "opacity-80"
              }`}
            >
              {status === "won"
                ? "You did it! Ready for another round?"
                : "Reveal two cards at a time and remember where the pairs hide."}
            </div>
            <button
              type="button"
              onClick={resetGame}
              className="rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              {status === "ready" ? "Shuffle Deck" : "Play Again"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
