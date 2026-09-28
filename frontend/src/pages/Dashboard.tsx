import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ScanRecord = {
  id: string;
  foodName: string;
  status: string;
  score: string;
  shelfLife: string;
  confidence: string;
  recommendation: string;
  date: string;
};

type HistoryApiItem = {
  id?: number | string;
  food_name?: string | null;
  freshness_status?: string | null;
  freshness_score?: number | null;
  confidence?: number | null;
  predicted_shelf_life?: number | null;
  recommendation?: string | null;
  timestamp?: string | null;
};

const API_URL =
  "http://127.0.0.1:8000/api";

function parsePercent(value: string): number {
  const parsed = Number(
    String(value || "")
      .replace("%", "")
      .replace("/100", "")
      .trim()
  );

  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(100, parsed))
    : 0;
}

function formatCount(value: number): string {
  return Number.isFinite(value)
    ? value.toLocaleString()
    : "0";
}

function getFoodEmoji(food: string): string {
  const value = food.toLowerCase();

  if (value.includes("banana")) return "🍌";
  if (value.includes("apple")) return "🍎";
  if (value.includes("tomato")) return "🍅";
  if (value.includes("orange")) return "🍊";
  if (value.includes("mango")) return "🥭";
  if (value.includes("papaya")) return "🧡";
  if (value.includes("pineapple")) return "🍍";
  if (
    value.includes("cucumber") ||
    value.includes("bitter")
  ) {
    return "🥒";
  }
  if (
    value.includes("eggplant") ||
    value.includes("aubergine")
  ) {
    return "🍆";
  }

  return "🥬";
}

function Dashboard() {
  const [history, setHistory] =
    useState<ScanRecord[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const mapHistoryItem = (
    item: HistoryApiItem
  ): ScanRecord => {
    return {
      id: String(
        item?.id ?? ""
      ),

      foodName:
        typeof item?.food_name ===
        "string"
          ? item.food_name
          : "Unknown Food",

      status:
        typeof item?.freshness_status ===
        "string"
          ? item.freshness_status
          : "Unknown",

      score:
        item?.freshness_score !==
          undefined &&
        item?.freshness_score !== null
          ? `${Number(
              item.freshness_score
            ).toFixed(0)}/100`
          : "N/A",

      shelfLife:
        item?.predicted_shelf_life !==
          undefined &&
        item?.predicted_shelf_life !== null
          ? `${Number(
              item.predicted_shelf_life
            ).toFixed(1)} days`
          : "N/A",

      confidence:
        item?.confidence !==
          undefined &&
        item?.confidence !== null
          ? `${Number(
              item.confidence
            ).toFixed(0)}%`
          : "N/A",

      recommendation:
        typeof item?.recommendation ===
        "string"
          ? item.recommendation
          : "No recommendation available.",

      date:
        item?.timestamp
          ? new Date(
              item.timestamp
            ).toLocaleString()
          : "Unknown date",
    };
  };

  const loadHistory = async (
    silent = false
  ) => {
    if (!silent) {
      setRefreshing(true);
    }

    try {
      const response =
        await fetch(
          `${API_URL}/history?limit=100`
        );

      if (!response.ok) {
        throw new Error(
          `History request failed: ${response.status}`
        );
      }

      const data =
        await response.json();

      if (
        !data?.success ||
        !Array.isArray(
          data.history
        )
      ) {
        throw new Error(
          "Invalid history response from backend."
        );
      }

      const safeHistory =
        data.history.map(
          (
            item: HistoryApiItem
          ) =>
            mapHistoryItem(item)
        );

      setHistory(
        safeHistory
      );
    } catch (error) {
      console.error(
        "Failed to load historical database:",
        error
      );

      if (!silent) {
        setHistory([]);
      }
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialLoad =
      async () => {
        try {
          const response =
            await fetch(
              `${API_URL}/history?limit=100`
            );

          if (!response.ok) {
            throw new Error(
              `History request failed: ${response.status}`
            );
          }

          const data =
            await response.json();

          if (
            !data?.success ||
            !Array.isArray(
              data.history
            )
          ) {
            throw new Error(
              "Invalid history response from backend."
            );
          }

          const safeHistory =
            data.history.map(
              (
                item: HistoryApiItem
              ) =>
                mapHistoryItem(item)
            );

          if (!cancelled) {
            setHistory(
              safeHistory
            );
            setLoaded(true);
          }
        } catch (error) {
          console.error(
            "Failed to load historical database:",
            error
          );

          if (!cancelled) {
            setHistory([]);
            setLoaded(true);
          }
        }
      };

    initialLoad();

    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void loadHistory(true);
          }
        },
        5000
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        interval
      );
    };
  }, []);

  const deleteScan = async (
    id: string
  ) => {
    try {
      const response =
        await fetch(
          `${API_URL}/history/${id}`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {
        throw new Error(
          `Failed to delete scan: ${response.status}`
        );
      }

      setHistory(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );
    } catch (error) {
      console.error(
        "Failed to delete historical scan:",
        error
      );

      window.alert(
        "Unable to delete this scan. Please make sure the backend is running."
      );
    }
  };

  const clearHistory =
    async () => {
      if (
        history.length === 0
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to clear all scan history?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/history`,
            {
              method: "DELETE",
            }
          );

        if (!response.ok) {
          throw new Error(
            `Failed to clear history: ${response.status}`
          );
        }

        setHistory([]);
      } catch (error) {
        console.error(
          "Failed to clear historical database:",
          error
        );

        window.alert(
          "Unable to clear history. Please make sure the backend is running."
        );
      }
    };

  const isFresh = (
    status: string
  ) => {
    const value =
      typeof status ===
      "string"
        ? status
            .toLowerCase()
            .trim()
        : "";

    return (
      value === "fresh" ||
      value.startsWith("fresh ")
    );
  };

  const isSpoiled = (
    status: string
  ) => {
    const value =
      typeof status ===
      "string"
        ? status
            .toLowerCase()
            .trim()
        : "";

    return (
      value.includes("spoiled") ||
      value.includes("rotten") ||
      value.includes("decay")
    );
  };

  const getStatusClass = (
    status: string
  ) => {
    if (isFresh(status)) {
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    }

    if (isSpoiled(status)) {
      return "border-red-500/40 bg-red-500/10 text-red-400";
    }

    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-400";
  };

  const getStatusDot = (
    status: string
  ) => {
    if (isFresh(status)) {
      return "bg-emerald-400";
    }

    if (isSpoiled(status)) {
      return "bg-red-400";
    }

    return "bg-yellow-400";
  };

  const stats = useMemo(() => {
    const total =
      history.length;

    const fresh =
      history.filter(
        (item) =>
          isFresh(
            item.status
          )
      ).length;

    const spoiled =
      history.filter(
        (item) =>
          isSpoiled(
            item.status
          )
      ).length;

    const moderate =
      Math.max(
        0,
        total -
          fresh -
          spoiled
      );

    const confidenceValues =
      history
        .map((item) =>
          parsePercent(
            item.confidence
          )
        )
        .filter(
          (value) =>
            value > 0
        );

    const scoreValues =
      history
        .map((item) =>
          parsePercent(
            item.score
          )
        )
        .filter(
          (value) =>
            value > 0
        );

    const averageConfidence =
      confidenceValues.length >
      0
        ? confidenceValues.reduce(
            (
              sum,
              value
            ) =>
              sum + value,
            0
          ) /
          confidenceValues.length
        : 0;

    const averageScore =
      scoreValues.length >
      0
        ? scoreValues.reduce(
            (
              sum,
              value
            ) =>
              sum + value,
            0
          ) /
          scoreValues.length
        : 0;

    return {
      total,
      fresh,
      spoiled,
      moderate,
      averageConfidence,
      averageScore,
      freshRate:
        total > 0
          ? (fresh / total) * 100
          : 0,
      moderateRate:
        total > 0
          ? (moderate / total) * 100
          : 0,
      spoiledRate:
        total > 0
          ? (spoiled / total) * 100
          : 0,
    };
  }, [history]);

  const foodStats =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      history.forEach(
        (item) => {
          const name =
            item.foodName &&
            item.foodName.trim()
              ? item.foodName.trim()
              : "Unknown Food";

          counts[name] =
            (counts[name] || 0) +
            1;
        }
      );

      return Object.entries(
        counts
      ).sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [history]);

  const foodStatusStats =
    useMemo(() => {
      const result: Record<
        string,
        {
          fresh: number;
          moderate: number;
          spoiled: number;
        }
      > = {};

      history.forEach(
        (item) => {
          const food =
            item.foodName &&
            item.foodName.trim()
              ? item.foodName.trim()
              : "Unknown Food";

          if (!result[food]) {
            result[food] = {
              fresh: 0,
              moderate: 0,
              spoiled: 0,
            };
          }

          if (
            isFresh(
              item.status
            )
          ) {
            result[food].fresh +=
              1;
          } else if (
            isSpoiled(
              item.status
            )
          ) {
            result[food].spoiled +=
              1;
          } else {
            result[food].moderate +=
              1;
          }
        }
      );

      return Object.entries(
        result
      ).sort(
        (a, b) =>
          (
            b[1].fresh +
            b[1].moderate +
            b[1].spoiled
          ) -
          (
            a[1].fresh +
            a[1].moderate +
            a[1].spoiled
          )
      );
    }, [history]);

  const filteredHistory =
    useMemo(() => {
      const query =
        searchTerm
          .toLowerCase()
          .trim();

      return history.filter(
        (item) => {
          const matchesSearch =
            !query ||
            item.foodName
              .toLowerCase()
              .includes(query) ||
            item.status
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter ===
              "All" ||
            (
              statusFilter ===
                "Fresh" &&
              isFresh(
                item.status
              )
            ) ||
            (
              statusFilter ===
                "Moderate" &&
              !isFresh(
                item.status
              ) &&
              !isSpoiled(
                item.status
              )
            ) ||
            (
              statusFilter ===
                "Spoiled" &&
              isSpoiled(
                item.status
              )
            );

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      history,
      searchTerm,
      statusFilter,
    ]);

  const topFood =
    foodStats[0]?.[0] ||
    "No data";

  const attentionRate =
    stats.total > 0
      ? (
          (
            stats.moderate +
            stats.spoiled
          ) /
          stats.total
        ) *
        100
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-6 pb-20 pt-32 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              FRESHLENS AI
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold sm:text-5xl">
                Dashboard
              </h1>

              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
                Live Analytics
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-slate-400">
              Track your food freshness analysis,
              monitor trends, and review your latest scans.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void loadHistory()
              }
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-bold text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

            <a
              href="/scan"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white transition hover:bg-emerald-400"
            >
              + Scan New Food
            </a>
          </div>
        </div>

        {/* PRIMARY STATS */}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  Total Scans
                </p>

                <p className="mt-3 text-4xl font-bold text-white">
                  {formatCount(
                    stats.total
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Images analyzed
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 px-3 py-2 text-xl">
                🔍
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-900/50 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  Fresh Items
                </p>

                <p className="mt-3 text-4xl font-bold text-emerald-400">
                  {formatCount(
                    stats.fresh
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {stats.freshRate.toFixed(1)}% of scans
                </p>
              </div>

              <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xl">
                🌿
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-red-900/50 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  Items Needing Attention
                </p>

                <p className="mt-3 text-4xl font-bold text-red-400">
                  {formatCount(
                    stats.moderate +
                    stats.spoiled
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {attentionRate.toFixed(1)}% of scans
                </p>
              </div>

              <div className="rounded-xl bg-red-500/10 px-3 py-2 text-xl">
                ⚠️
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  Avg. AI Confidence
                </p>

                <p className="mt-3 text-4xl font-bold text-emerald-400">
                  {stats.averageConfidence >
                  0
                    ? `${stats.averageConfidence.toFixed(1)}%`
                    : "N/A"}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Assessment confidence
                </p>
              </div>

              <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xl">
                🧠
              </div>
            </div>
          </div>

        </div>

        {/* FRESHNESS OVERVIEW */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h2 className="text-xl font-bold">
                Freshness Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current distribution across your analyzed food.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <span className="rounded-full border border-emerald-500/60 bg-emerald-500/5 px-4 py-2 text-sm font-medium text-emerald-400">
                Fresh {stats.fresh}
              </span>

              <span className="rounded-full border border-yellow-500/60 bg-yellow-500/5 px-4 py-2 text-sm font-medium text-yellow-400">
                Moderate {stats.moderate}
              </span>

              <span className="rounded-full border border-red-500/60 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400">
                Spoiled {stats.spoiled}
              </span>

            </div>
          </div>

          {stats.total > 0 ? (
            <>
              <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-800">
                <div className="flex h-full w-full">
                  {stats.fresh > 0 && (
                    <div
                      className="bg-emerald-400 transition-all duration-700"
                      style={{
                        width: `${stats.freshRate}%`,
                      }}
                      title={`Fresh: ${stats.freshRate.toFixed(1)}%`}
                    />
                  )}

                  {stats.moderate > 0 && (
                    <div
                      className="bg-yellow-400 transition-all duration-700"
                      style={{
                        width: `${stats.moderateRate}%`,
                      }}
                      title={`Moderate: ${stats.moderateRate.toFixed(1)}%`}
                    />
                  )}

                  {stats.spoiled > 0 && (
                    <div
                      className="bg-red-400 transition-all duration-700"
                      style={{
                        width: `${stats.spoiledRate}%`,
                      }}
                      title={`Spoiled: ${stats.spoiledRate.toFixed(1)}%`}
                    />
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
                    Fresh Rate
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-400">
                    {stats.freshRate.toFixed(1)}%
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
                    Moderate Rate
                  </p>
                  <p className="mt-2 text-2xl font-bold text-yellow-400">
                    {stats.moderateRate.toFixed(1)}%
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
                    Spoiled Rate
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-400">
                    {stats.spoiledRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
              Analytics will appear after your first scan.
            </div>
          )}

        </section>

        {/* ANALYTICS SNAPSHOT */}

        <section className="mt-8">

          <div className="mb-5">
            <h2 className="text-2xl font-bold">
              Analytics Snapshot
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              High-level intelligence derived from your scan history.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Avg. Freshness Score
              </p>

              <p className="mt-3 text-3xl font-bold text-emerald-400">
                {stats.averageScore > 0
                  ? `${stats.averageScore.toFixed(1)}/100`
                  : "N/A"}
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                  style={{
                    width: `${stats.averageScore}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Most Scanned Food
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-2xl">
                  {getFoodEmoji(topFood)}
                </div>

                <div>
                  <p className="font-bold text-white">
                    {topFood}
                  </p>

                  <p className="text-sm text-slate-500">
                    {foodStats[0]?.[1] ?? 0} scans
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Unique Foods
              </p>

              <p className="mt-3 text-3xl font-bold text-cyan-300">
                {foodStats.length}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Detected food categories
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Attention Rate
              </p>

              <p className="mt-3 text-3xl font-bold text-yellow-400">
                {attentionRate.toFixed(1)}%
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Moderate or spoiled scans
              </p>
            </div>

          </div>

        </section>

        {/* FOOD-WISE ANALYTICS */}

        {foodStats.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                Food-wise Analytics
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Distribution of analyses across detected foods.
              </p>
            </div>

            <div className="space-y-5">

              {foodStats.map(
                (
                  [
                    foodName,
                    count,
                  ]
                ) => {
                  const percentage =
                    stats.total > 0
                      ? (
                          count /
                          stats.total
                        ) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        foodName
                      }
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">

                        <div className="flex items-center gap-3">

                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xl">
                            {getFoodEmoji(
                              foodName
                            )}
                          </span>

                          <div>
                            <p className="font-semibold text-slate-200">
                              {foodName}
                            </p>

                            <p className="text-xs text-slate-600">
                              {percentage.toFixed(1)}% of all scans
                            </p>
                          </div>

                        </div>

                        <div className="text-right">
                          <span className="font-bold text-emerald-400">
                            {count}
                          </span>

                          <span className="ml-1 text-xs text-slate-500">
                            scans
                          </span>
                        </div>

                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* FOOD STATUS ANALYTICS */}

        {foodStatusStats.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                Food Status Analytics
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Freshness status breakdown for each detected food.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {foodStatusStats.map(
                (
                  [
                    foodName,
                    statusData,
                  ]
                ) => {
                  const totalForFood =
                    statusData.fresh +
                    statusData.moderate +
                    statusData.spoiled;

                  const freshPct =
                    totalForFood > 0
                      ? (
                          statusData.fresh /
                          totalForFood
                        ) *
                        100
                      : 0;

                  const moderatePct =
                    totalForFood > 0
                      ? (
                          statusData.moderate /
                          totalForFood
                        ) *
                        100
                      : 0;

                  const spoiledPct =
                    totalForFood > 0
                      ? (
                          statusData.spoiled /
                          totalForFood
                        ) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        foodName
                      }
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="mb-5 flex items-center justify-between gap-4">

                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {getFoodEmoji(
                              foodName
                            )}
                          </span>

                          <h3 className="text-lg font-bold">
                            {foodName}
                          </h3>
                        </div>

                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                          {totalForFood} scans
                        </span>

                      </div>

                      <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-800">
                        <div className="flex h-full">
                          {freshPct > 0 && (
                            <div
                              className="bg-emerald-400"
                              style={{
                                width: `${freshPct}%`,
                              }}
                            />
                          )}

                          {moderatePct > 0 && (
                            <div
                              className="bg-yellow-400"
                              style={{
                                width: `${moderatePct}%`,
                              }}
                            />
                          )}

                          {spoiledPct > 0 && (
                            <div
                              className="bg-red-400"
                              style={{
                                width: `${spoiledPct}%`,
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">

                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400">
                            Fresh
                          </span>
                          <span className="font-semibold text-slate-300">
                            {statusData.fresh}{" "}
                            <span className="text-xs text-slate-600">
                              ({freshPct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-yellow-400">
                            Moderate
                          </span>
                          <span className="font-semibold text-slate-300">
                            {statusData.moderate}{" "}
                            <span className="text-xs text-slate-600">
                              ({moderatePct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-red-400">
                            Spoiled
                          </span>
                          <span className="font-semibold text-slate-300">
                            {statusData.spoiled}{" "}
                            <span className="text-xs text-slate-600">
                              ({spoiledPct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* SCAN HISTORY */}

        <section className="mt-8">

          <div className="mb-5 flex flex-col gap-4">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <h2 className="text-2xl font-bold">
                  Scan History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your latest FreshLens AI analyses.
                </p>
              </div>

              {history.length > 0 && (
                <button
                  type="button"
                  onClick={
                    clearHistory
                  }
                  className="w-fit text-sm font-semibold text-red-400 transition hover:text-red-300"
                >
                  Clear History
                </button>
              )}

            </div>

            {/* SEARCH + FILTERS */}

            <div className="flex flex-col gap-3 lg:flex-row">

              <div className="relative flex-1">

                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">
                  🔍
                </span>

                <input
                  type="text"
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search food or status..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                />

              </div>

              <div className="flex flex-wrap gap-2">

                {[
                  "All",
                  "Fresh",
                  "Moderate",
                  "Spoiled",
                ].map(
                  (
                    filter
                  ) => (
                    <button
                      key={
                        filter
                      }
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          filter
                        )
                      }
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        statusFilter ===
                        filter
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white"
                      }`}
                    >
                      {filter}
                    </button>
                  )
                )}

              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">

              <p className="text-xs text-slate-600">
                Showing{" "}
                {filteredHistory.length}{" "}
                of{" "}
                {history.length}{" "}
                scans
              </p>

              {(searchTerm ||
                statusFilter !==
                  "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm(
                      ""
                    );
                    setStatusFilter(
                      "All"
                    );
                  }}
                  className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                >
                  Reset filters
                </button>
              )}

            </div>

          </div>

          {!loaded && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />

              <p className="mt-4 text-sm text-slate-500">
                Loading scan history...
              </p>

            </div>
          )}

          {loaded &&
            history.length ===
              0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">

                <div className="text-5xl">
                  🍎
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  No scans yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Upload a food image and run
                  your first FreshLens AI analysis.
                  Your results will appear here.
                </p>

                <a
                  href="/scan"
                  className="mt-6 inline-flex rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white transition hover:bg-emerald-400"
                >
                  Scan Your First Food
                </a>

              </div>
            )}

          {loaded &&
            history.length >
              0 &&
            filteredHistory.length >
              0 && (
              <div className="space-y-4">

                {filteredHistory.map(
                  (item) => (

                    <div
                      key={
                        item.id
                      }
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700 hover:bg-slate-[900]"
                    >

                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

                        {/* FOOD */}

                        <div className="flex min-w-0 items-start gap-4 xl:w-[28%]">

                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-2xl">
                            {getFoodEmoji(
                              item.foodName
                            )}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-3">

                              <h3 className="truncate text-lg font-bold">
                                {
                                  item.foodName
                                }
                              </h3>

                              <span
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                                  item.status
                                )}`}
                              >

                                <span
                                  className={`h-2 w-2 rounded-full ${getStatusDot(
                                    item.status
                                  )}`}
                                />

                                {
                                  item.status
                                }

                              </span>

                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              {item.date}
                            </p>

                          </div>

                        </div>

                        {/* METRICS */}

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:w-[52%]">

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                              Score
                            </p>
                            <p className="mt-1 font-semibold text-emerald-400">
                              {
                                item.score
                              }
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                              Shelf Life
                            </p>
                            <p className="mt-1 font-semibold text-slate-200">
                              {
                                item.shelfLife
                              }
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                              Confidence
                            </p>
                            <p className="mt-1 font-semibold text-emerald-400">
                              {
                                item.confidence
                              }
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                              Recommendation
                            </p>
                            <p
                              title={
                                item.recommendation
                              }
                              className="mt-1 truncate text-sm text-slate-300"
                            >
                              {
                                item.recommendation
                              }
                            </p>
                          </div>

                        </div>

                        {/* DELETE */}

                        <div className="xl:w-auto">

                          <button
                            type="button"
                            onClick={() =>
                              deleteScan(
                                item.id
                              )
                            }
                            className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-red-500/50 hover:text-red-400 xl:w-auto"
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          {loaded &&
            history.length >
              0 &&
            filteredHistory.length ===
              0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">

                <div className="text-4xl">
                  🔍
                </div>

                <h3 className="mt-4 text-lg font-bold">
                  No matching scans
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Try another food name,
                  status, or filter.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm(
                      ""
                    );
                    setStatusFilter(
                      "All"
                    );
                  }}
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-400"
                >
                  Reset Filters
                </button>

              </div>
            )}

        </section>

        {/* FOOTER */}

        <div className="mt-10 text-center">

          <p className="text-xs leading-6 text-slate-600">
            FreshLens AI results are AI-based
            visual and environmental estimates for
            informational purposes.
          </p>

        </div>

      </div>
    </main>
  );
}

export default Dashboard;
