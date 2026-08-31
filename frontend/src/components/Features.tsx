import {
  Camera,
  Brain,
  Clock3,
  ShieldCheck,
  Leaf,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    id: "vision",
    icon: Camera,
    title: "AI Food Vision",
    short: "Identify food instantly",
    description:
      "FreshLens AI analyzes the uploaded food image using computer vision and identifies the most likely food item.",
    stat: "96%+",
    statLabel: "Typical identification confidence",
  },
  {
    id: "freshness",
    icon: Brain,
    title: "Freshness Detection",
    short: "Analyze visible freshness",
    description:
      "Our AI evaluates visual characteristics of the food and estimates whether it appears fresh, unripe, or spoiled.",
    stat: "3",
    statLabel: "Freshness categories",
  },
  {
    id: "shelf",
    icon: Clock3,
    title: "Shelf-Life Estimate",
    short: "Know how long it may last",
    description:
      "Get an estimated remaining shelf-life range so you can decide what to consume first.",
    stat: "1–7",
    statLabel: "Estimated days",
  },
  {
    id: "safe",
    icon: ShieldCheck,
    title: "AI-Assisted Guidance",
    short: "Get an actionable result",
    description:
      "FreshLens combines model predictions with AI vision analysis to provide a clear recommendation.",
    stat: "AI",
    statLabel: "Assisted analysis",
  },
];

export default function Features() {
  const [activeFeature, setActiveFeature] = useState("vision");

  const active =
    features.find((feature) => feature.id === activeFeature) ??
    features[0];

  const ActiveIcon = active.icon;

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-slate-950 px-6 py-28"
    >
      {/* BACKGROUND GLOW */}

      <div className="pointer-events-none absolute left-[-180px] top-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 right-[-150px] h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mx-auto max-w-3xl text-center">

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-400">
            <Sparkles size={16} />
            Intelligent Food Analysis
          </div>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Everything You Need to
            <span className="block text-emerald-400">
              Understand Your Food
            </span>
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-400">
            FreshLens AI combines computer vision and intelligent analysis
            to turn a simple food image into useful freshness information.
          </p>

        </div>

        {/* INTERACTIVE AREA */}

        <div className="mt-16 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">

          {/* LEFT FEATURE LIST */}

          <div className="space-y-3">

            {features.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.id === activeFeature;

              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => setActiveFeature(feature.id)}
                  className={`group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                    isActive
                      ? "border-emerald-400/40 bg-emerald-400/[0.08] shadow-lg shadow-emerald-500/5"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >

                  {/* ACTIVE LINE */}

                  <div
                    className={`absolute bottom-0 left-0 top-0 w-1 rounded-full transition-all ${
                      isActive
                        ? "bg-emerald-400"
                        : "bg-transparent"
                    }`}
                  />

                  <div className="flex items-center gap-4">

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all ${
                        isActive
                          ? "bg-emerald-400/15 text-emerald-400"
                          : "bg-slate-800 text-slate-400 group-hover:text-emerald-400"
                      }`}
                    >
                      <Icon size={22} />
                    </div>

                    <div className="min-w-0 flex-1">

                      <h3 className="font-semibold text-white">
                        {feature.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {feature.short}
                      </p>

                    </div>

                    <ArrowRight
                      size={18}
                      className={`shrink-0 transition-all duration-300 ${
                        isActive
                          ? "translate-x-0 text-emerald-400"
                          : "-translate-x-1 text-slate-700 group-hover:translate-x-0 group-hover:text-slate-400"
                      }`}
                    />

                  </div>

                </button>
              );
            })}

          </div>

          {/* RIGHT DETAIL CARD */}

          <div className="relative min-h-[390px] overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 shadow-2xl">

            {/* DECORATION */}

            <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="pointer-events-none absolute bottom-[-100px] left-[-80px] h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />

            {/* TOP */}

            <div className="relative flex items-center justify-between">

              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400"
              >
                <ActiveIcon size={30} />
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                AI ACTIVE
              </div>

            </div>

            {/* CONTENT */}

            <div className="relative mt-8">

              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                FreshLens Intelligence
              </p>

              <h3 className="mt-3 text-3xl font-bold text-white">
                {active.title}
              </h3>

              <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">
                {active.description}
              </p>

            </div>

            {/* STAT */}

            <div className="relative mt-9 grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">

                <p className="text-xs uppercase tracking-wider text-slate-500">
                  AI Metric
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {active.stat}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {active.statLabel}
                </p>

              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">

                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Analysis
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-400">
                  Live
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Image-based AI processing
                </p>

              </div>

            </div>

            {/* BOTTOM PROGRESS */}

            <div className="relative mt-8">

              <div className="mb-2 flex items-center justify-between text-xs">

                <span className="text-slate-500">
                  AI analysis pipeline
                </span>

                <span className="text-emerald-400">
                  Ready
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                <div className="h-full w-[92%] rounded-full bg-emerald-400 transition-all duration-500" />

              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM INFO */}

        <div className="mt-12 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center">

            <Leaf
              className="mx-auto text-emerald-400"
              size={22}
            />

            <p className="mt-3 font-semibold text-white">
              Reduce Food Waste
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Make better decisions about food before it goes bad.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center">

            <Camera
              className="mx-auto text-emerald-400"
              size={22}
            />

            <p className="mt-3 font-semibold text-white">
              Simple Image Scan
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Upload an image and let AI analyze it.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center">

            <ShieldCheck
              className="mx-auto text-emerald-400"
              size={22}
            />

            <p className="mt-3 font-semibold text-white">
              Clear Results
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Get understandable freshness insights and guidance.
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}