import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Brain,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

const steps = [
  {
    number: "01",
    title: "Upload Food Image",
    short: "Take or upload a clear food photo.",
    description:
      "Start by uploading an image of the food you want to analyze. FreshLens AI uses the image as the primary input for its computer vision pipeline.",
    icon: Camera,
    status: "IMAGE READY",
  },
  {
    number: "02",
    title: "AI Vision Analysis",
    short: "AI identifies the food and examines it.",
    description:
      "The vision system identifies the food item while the freshness model analyzes visible characteristics such as color, appearance, and signs associated with freshness.",
    icon: Brain,
    status: "AI ANALYZING",
  },
  {
    number: "03",
    title: "Freshness Prediction",
    short: "Get a freshness classification.",
    description:
      "FreshLens AI combines the model outputs to estimate the current freshness condition and confidence of the prediction.",
    icon: BarChart3,
    status: "PREDICTION READY",
  },
  {
    number: "04",
    title: "Take Action",
    short: "See shelf life and recommendation.",
    description:
      "The final result presents an estimated shelf-life range, visual condition, confidence score, and an easy-to-understand recommendation.",
    icon: CheckCircle2,
    status: "RESULT COMPLETE",
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const step = steps[activeStep];
  const ActiveIcon = step.icon;

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-slate-950 px-6 py-28"
    >
      {/* BACKGROUND */}

      <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 right-[-180px] h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mx-auto max-w-3xl text-center">

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-400">
            <Sparkles size={16} />
            Simple. Intelligent. Fast.
          </div>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            How FreshLens AI
            <span className="block text-emerald-400">
              Works
            </span>
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-400">
            From a simple food image to an intelligent freshness result
            in just a few steps.
          </p>

        </div>

        {/* STEP INDICATOR */}

        <div className="relative mx-auto mt-16 max-w-5xl">

          {/* CONNECTING LINE */}

          <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-slate-800 md:block" />

          <div
            className="absolute left-[12%] top-7 hidden h-px bg-emerald-400 transition-all duration-500 md:block"
            style={{
              width:
                activeStep === 0
                  ? "0%"
                  : `${(activeStep / (steps.length - 1)) * 76}%`,
            }}
          />

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">

            {steps.map((item, index) => {
              const Icon = item.icon;

              const isActive = index === activeStep;
              const isCompleted = index < activeStep;

              return (
                <button
                  key={item.number}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className="group relative text-center"
                >

                  {/* NUMBER */}

                  <div
                    className={`relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 ${
                      isActive
                        ? "scale-110 border-emerald-400 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20"
                        : isCompleted
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
                        : "border-slate-700 bg-slate-900 text-slate-500 group-hover:border-emerald-400/40 group-hover:text-emerald-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={22} />
                    ) : (
                      <Icon size={21} />
                    )}
                  </div>

                  <p
                    className={`mt-4 text-sm font-bold transition ${
                      isActive
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }`}
                  >
                    STEP {item.number}
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      isActive
                        ? "text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {item.title}
                  </p>

                </button>
              );
            })}

          </div>

        </div>

        {/* MAIN INTERACTIVE CARD */}

        <div className="mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.15fr]">

          {/* LEFT VISUAL */}

          <div className="relative min-h-[390px] overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8">

            {/* GLOW */}

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

            {/* TOP STATUS */}

            <div className="relative flex items-center justify-between">

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                FRESHLENS PIPELINE
              </div>

              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs font-semibold text-emerald-400">
                {step.status}
              </span>

            </div>

            {/* CENTER */}

            <div className="relative flex min-h-[300px] flex-col items-center justify-center text-center">

              <div
                key={activeStep}
                className="flex h-28 w-28 animate-pulse items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 shadow-[0_0_60px_rgba(52,211,153,0.08)]"
              >
                <ActiveIcon size={48} />
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.25em] text-slate-600">
                PROCESS {step.number}
              </p>

              <h3 className="mt-2 text-2xl font-bold text-white">
                {step.title}
              </h3>

            </div>

          </div>

          {/* RIGHT CONTENT */}

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 lg:p-10">

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Step {step.number}
                </p>

                <h3 className="mt-3 text-3xl font-bold text-white">
                  {step.title}
                </h3>

              </div>

              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 sm:flex">
                <ActiveIcon size={22} />
              </div>

            </div>

            <p className="mt-6 text-base leading-8 text-slate-400">
              {step.description}
            </p>

            {/* PROGRESS */}

            <div className="mt-9">

              <div className="mb-3 flex items-center justify-between text-xs">

                <span className="text-slate-500">
                  Pipeline progress
                </span>

                <span className="font-semibold text-emerald-400">
                  {Math.round(
                    ((activeStep + 1) / steps.length) * 100
                  )}
                  %
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{
                    width: `${
                      ((activeStep + 1) / steps.length) * 100
                    }%`,
                  }}
                />

              </div>

            </div>

            {/* ACTIONS */}

            <div className="mt-10 flex flex-wrap gap-3">

              <button
                type="button"
                disabled={activeStep === 0}
                onClick={() =>
                  setActiveStep((prev) =>
                    Math.max(0, prev - 1)
                  )
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={activeStep === steps.length - 1}
                onClick={() =>
                  setActiveStep((prev) =>
                    Math.min(
                      steps.length - 1,
                      prev + 1
                    )
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next Step
                <ArrowRight size={17} />
              </button>

            </div>

          </div>

        </div>

        {/* BOTTOM FLOW */}

        <div className="mx-auto mt-10 max-w-6xl rounded-2xl border border-slate-800 bg-slate-900/30 p-5">

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">

            {steps.map((item, index) => (
              <div
                key={item.number}
                className="flex items-center gap-3"
              >

                <button
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`transition ${
                    index === activeStep
                      ? "font-bold text-emerald-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {item.title}
                </button>

                {index !== steps.length - 1 && (
                  <ArrowRight
                    size={14}
                    className="text-slate-700"
                  />
                )}

              </div>
            ))}

          </div>

        </div>

      </div>
    </section>
  );
}