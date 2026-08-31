import { useEffect, useMemo, useState } from "react";

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

const HISTORY_KEY = "freshlens_scan_history";

function Dashboard() {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  /* =========================
     LOAD HISTORY
  ========================= */

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);

      if (!saved) {
        setHistory([]);
        setLoaded(true);
        return;
      }

      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        setHistory([]);
        setLoaded(true);
        return;
      }

      /*
       * Defensive conversion.
       * This prevents unexpected API/localStorage objects
       * from being rendered directly by React.
       */
      const safeHistory: ScanRecord[] = parsed.map(
        (item: any, index: number) => ({
          id:
            typeof item?.id === "string"
              ? item.id
              : `history-${Date.now()}-${index}`,

          foodName:
            typeof item?.foodName === "string"
              ? item.foodName
              : "Unknown Food",

          status:
            typeof item?.status === "string"
              ? item.status
              : "Unknown",

          score:
            typeof item?.score === "string"
              ? item.score
              : item?.score !== undefined &&
                  item?.score !== null
                ? String(item.score)
                : "N/A",

          shelfLife:
            typeof item?.shelfLife === "string"
              ? item.shelfLife
              : item?.shelfLife !== undefined &&
                  item?.shelfLife !== null
                ? formatUnknownShelfLife(item.shelfLife)
                : "N/A",

          confidence:
            typeof item?.confidence === "string"
              ? item.confidence
              : item?.confidence !== undefined &&
                  item?.confidence !== null
                ? String(item.confidence)
                : "N/A",

          recommendation:
            typeof item?.recommendation === "string"
              ? item.recommendation
              : "No recommendation available.",

          date:
            typeof item?.date === "string"
              ? item.date
              : "Unknown date",
        })
      );

      setHistory(safeHistory);
    } catch (error) {
      console.error(
        "Failed to load scan history:",
        error
      );

      setHistory([]);
    }

    setLoaded(true);
  };

  /* =========================
     SAFE SHELF LIFE FORMATTER
  ========================= */

  function formatUnknownShelfLife(
    value: unknown
  ): string {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number") {
      return `${value} days`;
    }

    if (
      typeof value === "object" &&
      value !== null
    ) {
      const obj = value as {
        min?: unknown;
        max?: unknown;
      };

      const min =
        typeof obj.min === "number"
          ? obj.min
          : undefined;

      const max =
        typeof obj.max === "number"
          ? obj.max
          : undefined;

      if (
        min !== undefined &&
        max !== undefined
      ) {
        if (min === max) {
          return `${min} days`;
        }

        return `${min}-${max} days`;
      }

      if (min !== undefined) {
        return `${min} days`;
      }

      if (max !== undefined) {
        return `${max} days`;
      }
    }

    return "N/A";
  }

  /* =========================
     DELETE ONE SCAN
  ========================= */

  const deleteScan = (id: string) => {
    const updatedHistory = history.filter(
      (item) => item.id !== id
    );

    setHistory(updatedHistory);

    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error(
        "Failed to update scan history:",
        error
      );
    }
  };

  /* =========================
     CLEAR ALL HISTORY
  ========================= */

  const clearHistory = () => {
    if (history.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to clear all scan history?"
    );

    if (!confirmed) {
      return;
    }

    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error(
        "Failed to clear scan history:",
        error
      );
    }

    setHistory([]);
  };

  /* =========================
     STATUS HELPERS
  ========================= */

  const isFresh = (status: string) => {
    const value =
      typeof status === "string"
        ? status.toLowerCase()
        : "";

    return value.includes("fresh");
  };

  const isSpoiled = (status: string) => {
    const value =
      typeof status === "string"
        ? status.toLowerCase()
        : "";

    return (
      value.includes("spoiled") ||
      value.includes("rotten")
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

  /* =========================
     DASHBOARD STATS
  ========================= */

  const stats = useMemo(() => {
    const total = history.length;

    const fresh = history.filter((item) =>
      isFresh(item.status)
    ).length;

    const spoiled = history.filter((item) =>
      isSpoiled(item.status)
    ).length;

    const moderate =
      total - fresh - spoiled;

    const confidenceValues = history
      .map((item) => {
        const value = String(
          item.confidence || ""
        )
          .replace("%", "")
          .trim();

        return parseFloat(value);
      })
      .filter(
        (value) => !Number.isNaN(value)
      );

    const averageConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce(
            (sum, value) => sum + value,
            0
          ) / confidenceValues.length
        : 0;

    return {
      total,
      fresh,
      spoiled,
      moderate,
      averageConfidence,
    };
  }, [history]);

  /* =========================
     RENDER
  ========================= */

  return (
    <main className="min-h-screen bg-slate-950 px-6 pb-20 pt-32 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              FRESHLENS AI
            </p>

            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
              Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Track your food freshness analysis
              and review your latest scans.
            </p>
          </div>

          <a
            href="/scan"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white transition hover:bg-emerald-400"
          >
            + Scan New Food
          </a>
        </div>

        {/* STATS */}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* TOTAL */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Total Scans
            </p>

            <p className="mt-3 text-4xl font-bold text-white">
              {stats.total}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Images analyzed
            </p>
          </div>

          {/* FRESH */}

          <div className="rounded-2xl border border-emerald-900/50 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Fresh Items
            </p>

            <p className="mt-3 text-4xl font-bold text-emerald-400">
              {stats.fresh}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Currently looking fresh
            </p>
          </div>

          {/* SPOILED */}

          <div className="rounded-2xl border border-red-900/50 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Spoiled Items
            </p>

            <p className="mt-3 text-4xl font-bold text-red-400">
              {stats.spoiled}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Require attention
            </p>
          </div>

          {/* CONFIDENCE */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Avg. Confidence
            </p>

            <p className="mt-3 text-4xl font-bold text-emerald-400">
              {stats.averageConfidence > 0
                ? `${stats.averageConfidence.toFixed(
                    1
                  )}%`
                : "N/A"}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              AI prediction confidence
            </p>
          </div>

        </div>

        {/* FRESHNESS OVERVIEW */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-xl font-bold">
                Freshness Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current distribution of your
                analyzed food.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <span className="rounded-full border border-emerald-500/60 px-4 py-2 text-sm font-medium text-emerald-400">
                Fresh {stats.fresh}
              </span>

              <span className="rounded-full border border-yellow-500/60 px-4 py-2 text-sm font-medium text-yellow-400">
                Moderate {stats.moderate}
              </span>

              <span className="rounded-full border border-red-500/60 px-4 py-2 text-sm font-medium text-red-400">
                Spoiled {stats.spoiled}
              </span>

            </div>
          </div>

          {/* PROGRESS BAR */}

          {stats.total > 0 && (
            <div className="mt-6">

              <div className="h-3 overflow-hidden rounded-full bg-slate-800">

                <div className="flex h-full w-full">

                  {stats.fresh > 0 && (
                    <div
                      className="bg-emerald-400"
                      style={{
                        width: `${
                          (stats.fresh /
                            stats.total) *
                          100
                        }%`,
                      }}
                    />
                  )}

                  {stats.moderate > 0 && (
                    <div
                      className="bg-yellow-400"
                      style={{
                        width: `${
                          (stats.moderate /
                            stats.total) *
                          100
                        }%`,
                      }}
                    />
                  )}

                  {stats.spoiled > 0 && (
                    <div
                      className="bg-red-400"
                      style={{
                        width: `${
                          (stats.spoiled /
                            stats.total) *
                          100
                        }%`,
                      }}
                    />
                  )}

                </div>
              </div>
            </div>
          )}

        </section>

        {/* SCAN HISTORY */}

        <section className="mt-8">

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

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
                onClick={clearHistory}
                className="text-sm font-semibold text-red-400 transition hover:text-red-300"
              >
                Clear History
              </button>
            )}

          </div>

          {/* LOADING */}

          {!loaded && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />

              <p className="mt-4 text-sm text-slate-500">
                Loading scan history...
              </p>

            </div>
          )}

          {/* EMPTY */}

          {loaded &&
            history.length === 0 && (
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

          {/* HISTORY LIST */}

          {loaded &&
            history.length > 0 && (
              <div className="space-y-4">

                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* LEFT */}

                      <div className="flex items-start gap-4">

                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-2xl">
                          🍎
                        </div>

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-lg font-bold">
                              {item.foodName}
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

                              {item.status}

                            </span>

                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {item.date}
                          </p>

                        </div>

                      </div>

                      {/* MIDDLE */}

                      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">

                        <div>
                          <p className="text-xs text-slate-500">
                            Score
                          </p>

                          <p className="mt-1 font-semibold text-emerald-400">
                            {item.score}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Shelf Life
                          </p>

                          <p className="mt-1 font-semibold">
                            {item.shelfLife}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Confidence
                          </p>

                          <p className="mt-1 font-semibold text-emerald-400">
                            {item.confidence}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Recommendation
                          </p>

                          <p
                            title={item.recommendation}
                            className="mt-1 max-w-[180px] truncate text-sm text-slate-300"
                          >
                            {item.recommendation}
                          </p>
                        </div>

                      </div>

                      {/* DELETE */}

                      <button
                        type="button"
                        onClick={() =>
                          deleteScan(item.id)
                        }
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-red-500/50 hover:text-red-400"
                      >
                        Delete
                      </button>

                    </div>
                  </div>
                ))}

              </div>
            )}

        </section>

        {/* FOOTER */}

        <div className="mt-10 text-center">

          <p className="text-xs leading-6 text-slate-600">
            FreshLens AI results are AI-based
            visual estimates for informational
            purposes.
          </p>

        </div>

      </div>
    </main>
  );
}

export default Dashboard;