import React from "react";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  tone?: "green" | "blue" | "yellow" | "red" | "slate";
};

function MetricCard({
  label,
  value,
  description,
  tone = "green",
}: MetricCardProps) {
  const valueClass =
    tone === "red"
      ? "text-red-300"
      : tone === "yellow"
        ? "text-yellow-300"
        : tone === "blue"
          ? "text-cyan-300"
          : tone === "slate"
            ? "text-slate-200"
            : "text-emerald-300";

  const borderClass =
    tone === "red"
      ? "border-red-500/15"
      : tone === "yellow"
        ? "border-yellow-500/15"
        : tone === "blue"
          ? "border-cyan-500/15"
          : tone === "slate"
            ? "border-slate-700"
            : "border-emerald-500/15";

  return (
    <div
      className={`rounded-2xl border ${borderClass} bg-slate-950/80 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className={`mt-3 text-3xl font-black ${valueClass}`}>
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function StatusBadge({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "yellow" | "slate";
}) {
  const classes =
    tone === "yellow"
      ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-300"
      : tone === "slate"
        ? "border-slate-700 bg-slate-900 text-slate-400"
        : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] ${classes}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "yellow"
            ? "bg-yellow-300"
            : tone === "slate"
              ? "bg-slate-500"
              : "bg-emerald-300"
        }`}
      />
      {children}
    </span>
  );
}

function Evaluation() {
  return (
    <main className="min-h-screen bg-[#020617] px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* HERO */}
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/20 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-emerald-400/8 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <StatusBadge tone="green">
                FreshLens AI • Model Evaluation
              </StatusBadge>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Model Evaluation
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">
                A transparent view of the verified evaluation evidence currently
                available in FreshLens AI. Regression metrics below come from the
                trained shelf-life model and are reported at dataset level.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Primary evaluated model
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                XGBoost
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Shelf-life regression
              </p>

              <div className="mt-4">
                <StatusBadge tone="yellow">
                  Regression evaluation
                </StatusBadge>
              </div>
            </div>
          </div>
        </section>

        {/* REGRESSION METRICS */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
              Verified metrics
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Shelf-Life Model Evaluation
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              These metrics describe how the trained XGBoost shelf-life regressor
              performed on its held-out evaluation data. They are not per-image
              confidence probabilities.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <MetricCard
              label="MAE"
              value="4.79 d"
              description="Mean absolute error in predicted remaining shelf life."
              tone="green"
            />

            <MetricCard
              label="RMSE"
              value="6.44 d"
              description="Root mean squared error; larger prediction errors receive more weight."
              tone="blue"
            />

            <MetricCard
              label="R²"
              value="0.442"
              description="Coefficient of determination for the evaluated regression task."
              tone="yellow"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
                ⓘ
              </div>

              <div>
                <h3 className="font-bold text-cyan-200">
                  How to explain these numbers in viva
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  MAE tells you the average absolute prediction error in days.
                  RMSE emphasizes larger errors. R² summarizes how much variance
                  in the shelf-life target is explained by the regression model.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PIPELINE */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
              Evaluation context
            </p>

            <h2 className="mt-2 text-2xl font-black">
              FreshLens AI Model Stack
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The current application combines multiple components. Only metrics
              that are actually available and verified are shown as numeric
              evaluation results.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-2xl">👁</div>
              <h3 className="mt-3 font-bold">Food Detection</h3>
              <p className="mt-1 text-sm text-slate-500">
                Vision-based food identification with per-image confidence.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-2xl">🧠</div>
              <h3 className="mt-3 font-bold">Freshness Model</h3>
              <p className="mt-1 text-sm text-slate-500">
                Local freshness signal used as part of the final fusion.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-2xl">✨</div>
              <h3 className="mt-3 font-bold">Gemini Vision</h3>
              <p className="mt-1 text-sm text-slate-500">
                Visual reasoning and descriptive evidence generation.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-2xl">🌡</div>
              <h3 className="mt-3 font-bold">Environment</h3>
              <p className="mt-1 text-sm text-slate-500">
                Weather and IoT context contribute to the multimodal analysis.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
              <div className="text-2xl">⏳</div>
              <h3 className="mt-3 font-bold text-emerald-200">
                Shelf-Life
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                XGBoost regression is evaluated with the verified metrics above.
              </p>
            </div>
          </div>
        </section>

        {/* CLASSIFICATION METRICS */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-400">
                Classification evaluation
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Accuracy • Precision • Recall • F1
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                These values require a verified labeled test set for the freshness
                classifier. They are intentionally not fabricated from dashboard
                scan history.
              </p>
            </div>

            <StatusBadge tone="slate">
              Not numerically evaluated
            </StatusBadge>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Accuracy", "Not available"],
              ["Precision", "Not available"],
              ["Recall", "Not available"],
              ["F1 Score", "Not available"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </p>

                <p className="mt-3 text-xl font-black text-slate-300">
                  {value}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Requires a verified labeled classification test set.
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl">
                ⛔
              </div>

              <div>
                <h3 className="font-bold text-slate-200">
                  Confusion Matrix
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Not shown yet because the current project evidence does not
                  provide a verified classification test-set confusion matrix.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MODEL TRANSPARENCY */}
        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
              Transparency
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Evaluation vs. Confidence
            </h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-bold text-white">
                  Per-image confidence
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Example: Food Detection confidence 99% on a specific image.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-bold text-white">
                  Dataset-level evaluation
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Example: shelf-life MAE, RMSE and R² measured across evaluation
                  data.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-950/30 to-slate-900 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
              Project readiness
            </p>

            <h2 className="mt-2 text-2xl font-black">
              What FreshLens can demonstrate today
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              {[
                "XGBoost shelf-life model with verified regression metrics",
                "Food-specific freshness and spoilage outputs",
                "Multimodal image + environment fusion",
                "Grad-CAM visual explainability",
                "Dashboard-backed scan history and analytics",
                "Downloadable analysis report",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/10 p-3"
                >
                  <span className="mt-0.5 text-emerald-300">✓</span>
                  <span className="leading-6 text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER NOTE */}
        <div className="mt-10 text-center">
          <p className="text-xs leading-6 text-slate-600">
            Evaluation values shown here are drawn from the currently verified
            FreshLens AI model artifacts. Missing classification metrics are
            intentionally left unreported rather than estimated from inference
            history.
          </p>
        </div>
      </div>
    </main>
  );
}

export default Evaluation;
