import {
  useEffect,
  useMemo,
  useState,
} from "react";

type HistoryItem = {
  id?: number | string;
  food_name?: string | null;
  freshness_status?: string | null;
  freshness_score?: number | null;
  confidence?: number | null;
  predicted_shelf_life?: number | null;
  recommendation?: string | null;
  timestamp?: string | null;
};

const API_URL = "http://127.0.0.1:8000/api";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getStatusTone(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes("spoiled") ||
    value.includes("rotten") ||
    value.includes("bad")
  ) {
    return {
      text: "text-red-300",
      badge:
        "border-red-500/25 bg-red-500/10 text-red-300",
      bar: "bg-red-400",
    };
  }

  if (
    value.includes("slightly") ||
    value.includes("unripe") ||
    value.includes("warning") ||
    value.includes("moderate")
  ) {
    return {
      text: "text-yellow-300",
      badge:
        "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
      bar: "bg-yellow-400",
    };
  }

  return {
    text: "text-emerald-300",
    badge:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    bar: "bg-emerald-400",
  };
}

function getFoodEmoji(food: string): string {
  const value = food.toLowerCase();

  if (value.includes("banana")) return "🍌";
  if (value.includes("apple")) return "🍎";
  if (value.includes("tomato")) return "🍅";
  if (value.includes("orange")) return "🍊";
  if (value.includes("mango")) return "🥭";
  if (value.includes("pineapple")) return "🍍";
  if (value.includes("cucumber")) return "🥒";
  if (value.includes("eggplant")) return "🍆";

  return "🥬";
}

function Comparison() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/history?limit=100`
      );

      if (!response.ok) {
        throw new Error(
          `History request failed: ${response.status}`
        );
      }

      const data = await response.json();

      if (
        !data?.success ||
        !Array.isArray(data.history)
      ) {
        throw new Error(
          "Invalid history response."
        );
      }

      setHistory(data.history);
    } catch (loadError) {
      console.error(
        "Failed to load comparison history:",
        loadError
      );

      setError(
        "Unable to load scan history. Make sure the FastAPI backend is running."
      );
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadHistory();

    const interval = window.setInterval(
      loadHistory,
      5000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const selectableHistory = useMemo(
    () =>
      history.filter(
        (item) =>
          item?.id !== undefined &&
          item?.id !== null
      ),
    [history]
  );

  const selectedItems = useMemo(
    () =>
      selectedIds
        .map((id) =>
          selectableHistory.find(
            (item) => String(item.id) === id
          )
        )
        .filter(
          (
            item
          ): item is HistoryItem =>
            Boolean(item)
        ),
    [selectedIds, selectableHistory]
  );

  const toggleSelection = (
    id: string
  ) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        );
      }

      if (current.length >= 5) {
        return current;
      }

      return [...current, id];
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const averageFreshness =
    selectedItems.length > 0
      ? selectedItems.reduce(
          (sum, item) =>
            sum +
            Number(
              item.freshness_score ?? 0
            ),
          0
        ) / selectedItems.length
      : 0;

  const averageConfidence =
    selectedItems.length > 0
      ? selectedItems.reduce(
          (sum, item) =>
            sum +
            Number(
              item.confidence ?? 0
            ),
          0
        ) / selectedItems.length
      : 0;

  return (
    <main className="min-h-screen bg-[#020617] px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">

        {/* HERO */}

        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/20 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  FreshLens AI • Food Comparison
                </span>
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Compare Foods
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">
                Select 2–5 previous analyses and compare freshness,
                spoilage status, shelf life and AI confidence side by side.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Selection
              </p>

              <p className="mt-2 text-3xl font-black text-white">
                {selectedItems.length}
                <span className="text-slate-500">/5</span>
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Choose up to five scans
              </p>
            </div>
          </div>
        </section>

        {/* SUMMARY */}

        {selectedItems.length > 0 && (
          <section className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/15 bg-slate-900 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Selected Analyses
              </p>

              <p className="mt-2 text-3xl font-black text-white">
                {selectedItems.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Foods in comparison
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/15 bg-slate-900 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Average Freshness
              </p>

              <p className="mt-2 text-3xl font-black text-emerald-300">
                {averageFreshness.toFixed(1)}/100
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Across selected scans
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-500/15 bg-slate-900 p-5 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Average Confidence
              </p>

              <p className="mt-2 text-3xl font-black text-cyan-300">
                {averageConfidence.toFixed(1)}%
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Across selected scans
              </p>
            </div>
          </section>
        )}

        {/* SELECTOR */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                Select scans
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Comparison Inputs
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Click a scan to add or remove it from the comparison.
              </p>
            </div>

            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-red-500/40 hover:text-red-300"
              >
                Clear Selection
              </button>
            )}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loaded && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-10 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
              <p className="mt-4 text-sm text-slate-500">
                Loading scan history...
              </p>
            </div>
          )}

          {loaded &&
            !error &&
            selectableHistory.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-10 text-center">
                <div className="text-5xl">📊</div>

                <h3 className="mt-4 text-xl font-bold">
                  No scans available
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Run at least two FreshLens AI analyses before opening
                  a food comparison.
                </p>
              </div>
            )}

          {selectableHistory.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selectableHistory.map(
                (item) => {
                  const id = String(item.id);
                  const selected =
                    selectedIds.includes(id);

                  const food =
                    item.food_name?.trim() ||
                    "Unknown Food";

                  const status =
                    item.freshness_status?.trim() ||
                    "Unknown";

                  const score = clamp(
                    Number(
                      item.freshness_score ?? 0
                    )
                  );

                  const confidence = clamp(
                    Number(
                      item.confidence ?? 0
                    )
                  );

                  const tone =
                    getStatusTone(status);

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        toggleSelection(id)
                      }
                      disabled={
                        !selected &&
                        selectedIds.length >= 5
                      }
                      className={`text-left rounded-2xl border p-5 transition ${
                        selected
                          ? "border-emerald-400/40 bg-emerald-500/5 shadow-[0_0_0_1px_rgba(52,211,153,0.08)]"
                          : "border-slate-800 bg-slate-950 hover:border-slate-700"
                      } ${
                        !selected &&
                        selectedIds.length >= 5
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-2xl">
                            {getFoodEmoji(food)}
                          </span>

                          <div>
                            <h3 className="font-bold text-white">
                              {food}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.timestamp
                                ? new Date(
                                    item.timestamp
                                  ).toLocaleString()
                                : "Unknown date"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            selected
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-slate-700 bg-slate-900 text-slate-500"
                          }`}
                        >
                          {selected
                            ? "Selected"
                            : "Select"}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.badge}`}
                        >
                          {status}
                        </span>

                        <span className="text-sm font-bold text-emerald-300">
                          {score.toFixed(0)}/100
                        </span>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${tone.bar}`}
                          style={{
                            width: `${score}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Shelf life
                        </span>

                        <span className="font-semibold text-slate-300">
                          {item.predicted_shelf_life !==
                          undefined &&
                          item.predicted_shelf_life !==
                            null
                            ? `${Number(
                                item.predicted_shelf_life
                              ).toFixed(1)} days`
                            : "N/A"}
                        </span>

                        <span className="text-slate-500">
                          Confidence
                        </span>

                        <span className="font-semibold text-cyan-300">
                          {confidence.toFixed(0)}%
                        </span>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* COMPARISON TABLE */}

        {selectedItems.length >= 2 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                Side-by-side analysis
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Food Comparison
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Compare the selected AI assessments using the same output fields.
              </p>
            </div>

            <div className="overflow-x-auto">
              <div
                className="min-w-[760px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: `180px repeat(${selectedItems.length}, minmax(150px, 1fr))`,
                }}
              >
                <div className="border-b border-slate-800 p-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Metric
                </div>

                {selectedItems.map(
                  (item) => (
                    <div
                      key={`head-${String(
                        item.id
                      )}`}
                      className="border-b border-slate-800 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {getFoodEmoji(
                            item.food_name ||
                              ""
                          )}
                        </span>

                        <span className="font-bold">
                          {item.food_name ||
                            "Unknown"}
                        </span>
                      </div>
                    </div>
                  )
                )}

                <div className="border-b border-slate-800 p-4 text-sm text-slate-500">
                  Status
                </div>

                {selectedItems.map(
                  (item) => {
                    const tone =
                      getStatusTone(
                        item.freshness_status ||
                          "Unknown"
                      );

                    return (
                      <div
                        key={`status-${String(
                          item.id
                        )}`}
                        className="border-b border-slate-800 p-4"
                      >
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.badge}`}
                        >
                          {item.freshness_status ||
                            "Unknown"}
                        </span>
                      </div>
                    );
                  }
                )}

                <div className="border-b border-slate-800 p-4 text-sm text-slate-500">
                  Freshness
                </div>

                {selectedItems.map(
                  (item) => {
                    const score = clamp(
                      Number(
                        item.freshness_score ??
                          0
                      )
                    );

                    return (
                      <div
                        key={`fresh-${String(
                          item.id
                        )}`}
                        className="border-b border-slate-800 p-4"
                      >
                        <p className="font-black text-emerald-300">
                          {score.toFixed(0)}/100
                        </p>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{
                              width: `${score}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}

                <div className="border-b border-slate-800 p-4 text-sm text-slate-500">
                  Spoilage Risk
                </div>

                {selectedItems.map(
                  (item) => (
                    <div
                      key={`risk-${String(
                        item.id
                      )}`}
                      className="border-b border-slate-800 p-4 text-sm font-semibold text-slate-300"
                    >
                      {item.freshness_status
                        ?.toLowerCase()
                        .includes(
                          "spoiled"
                        )
                        ? "High"
                        : "See full result"}
                    </div>
                  )
                )}

                <div className="border-b border-slate-800 p-4 text-sm text-slate-500">
                  Shelf Life
                </div>

                {selectedItems.map(
                  (item) => (
                    <div
                      key={`shelf-${String(
                        item.id
                      )}`}
                      className="border-b border-slate-800 p-4 font-bold text-white"
                    >
                      {item.predicted_shelf_life !==
                      undefined &&
                      item.predicted_shelf_life !==
                        null
                        ? `${Number(
                            item.predicted_shelf_life
                          ).toFixed(1)} days`
                        : "N/A"}
                    </div>
                  )
                )}

                <div className="p-4 text-sm text-slate-500">
                  AI Confidence
                </div>

                {selectedItems.map(
                  (item) => {
                    const confidence =
                      clamp(
                        Number(
                          item.confidence ??
                            0
                        )
                      );

                    return (
                      <div
                        key={`confidence-${String(
                          item.id
                        )}`}
                        className="p-4 font-bold text-cyan-300"
                      >
                        {confidence.toFixed(0)}%
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </section>
        )}

        {selectedItems.length === 1 && (
          <div className="mt-8 rounded-2xl border border-yellow-500/15 bg-yellow-500/5 p-5 text-center">
            <p className="font-semibold text-yellow-200">
              Select at least one more scan to start the comparison.
            </p>
          </div>
        )}

        {/* FOOTER */}

        <div className="mt-10 text-center">
          <p className="text-xs leading-6 text-slate-600">
            Comparison values are taken directly from stored FreshLens AI
            analysis records. They are research/prototype estimates and should
            not be treated as a food-safety guarantee.
          </p>
        </div>
      </div>
    </main>
  );
}

export default Comparison;
