import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Droplets,
  Activity,
} from "lucide-react";

interface HeroProps {
  onScan: () => void;
}

function Hero({ onScan }: HeroProps) {
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [showResult, setShowResult] = useState(false);

  /* =========================================
     AUTOMATIC DEMO ANIMATION
  ========================================= */

  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((previous) => {
        if (previous >= 100) {
          setShowResult(true);
          return 100;
        }

        return previous + 1;
      });
    }, 45);

    return () => clearInterval(interval);
  }, []);

  /* =========================================
     RESET DEMO
  ========================================= */

  const restartDemo = () => {
    setScanProgress(0);
    setShowResult(false);
    setIsScanning(false);

    setTimeout(() => {
      setIsScanning(true);

      setTimeout(() => {
        setIsScanning(false);
      }, 2200);
    }, 150);
  };

  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden bg-slate-950 pt-28"
    >
      {/* =====================================
          BACKGROUND
      ===================================== */}

      <div className="pointer-events-none absolute inset-0">

        <div className="absolute left-1/4 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="absolute right-1/4 top-40 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/5 blur-3xl" />

      </div>


      {/* =====================================
          GRID
      ===================================== */}

      <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>


      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2">

        {/* ===================================
            LEFT SIDE
        =================================== */}

        <div>

          {/* BADGE */}

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-400">

            <Sparkles size={16} />

            AI-Powered Food Intelligence

            <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

          </div>


          {/* HEADING */}

          <h1 className="mt-7 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">

            Know Your Food.

            <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Before It's Too Late.
            </span>

          </h1>


          {/* DESCRIPTION */}

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">

            FreshLens AI combines computer vision, environmental intelligence
            and machine learning to estimate food freshness and remaining
            shelf life.

          </p>


          {/* =================================
              BUTTONS
          ================================= */}

          <div className="mt-9 flex flex-wrap gap-4">

            <button
              onClick={onScan}
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition duration-300 hover:-translate-y-1 hover:bg-emerald-400 hover:shadow-emerald-400/25"
            >

              <ScanLine size={20} />

              Scan Food

              <ArrowRight
                size={18}
                className="transition duration-300 group-hover:translate-x-1"
              />

            </button>


            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3.5 font-semibold text-slate-200 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/50 hover:text-emerald-400"
            >

              Explore How It Works

              <ArrowRight
                size={17}
                className="transition duration-300 group-hover:translate-x-1"
              />

            </a>

          </div>


          {/* =================================
              TRUST
          ================================= */}

          <div className="mt-9 flex flex-wrap gap-6 text-sm text-slate-400">

            <div className="flex items-center gap-2">
              <ShieldCheck
                size={18}
                className="text-emerald-400"
              />

              AI-assisted analysis
            </div>

            <div className="flex items-center gap-2">
              <ScanLine
                size={18}
                className="text-emerald-400"
              />

              Computer vision
            </div>

            <div className="flex items-center gap-2">
              <Activity
                size={18}
                className="text-emerald-400"
              />

              Smart freshness detection
            </div>

          </div>


          {/* =================================
              MINI STATS
          ================================= */}

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30">

              <p className="text-2xl font-bold text-white">
                AI
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Vision Analysis
              </p>

            </div>


            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30">

              <p className="text-2xl font-bold text-emerald-400">
                24/7
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Food Monitoring
              </p>

            </div>


            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30">

              <p className="text-2xl font-bold text-white">
                ML
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Smart Prediction
              </p>

            </div>

          </div>

        </div>


        {/* ===================================
            RIGHT SIDE
        =================================== */}

        <div className="relative mx-auto w-full max-w-xl">

          {/* GLOW */}

          <div className="absolute -inset-10 rounded-full bg-emerald-400/5 blur-3xl" />


          {/* MAIN CARD */}

          <div className="relative rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">

            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6">


              {/* HEADER */}

              <div className="mb-5 flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">

                    <Leaf
                      size={20}
                      className="text-emerald-400"
                    />

                  </div>

                  <div>

                    <p className="text-sm font-semibold text-white">
                      FreshLens Scanner
                    </p>

                    <p className="text-xs text-slate-500">
                      AI Vision Engine
                    </p>

                  </div>

                </div>


                <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                  <span className="text-xs text-emerald-400">
                    Online
                  </span>

                </div>

              </div>


              {/* =================================
                  SCANNER
              ================================= */}

              <div
                className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-slate-900 transition duration-500 ${
                  isScanning
                    ? "border-emerald-400/70 shadow-[0_0_40px_rgba(52,211,153,0.12)]"
                    : "border-dashed border-emerald-400/40"
                }`}
              >

                {/* CORNER MARKS */}

                <div className="absolute left-5 top-5 h-8 w-8 border-l-2 border-t-2 border-emerald-400/70" />

                <div className="absolute right-5 top-5 h-8 w-8 border-r-2 border-t-2 border-emerald-400/70" />

                <div className="absolute bottom-5 left-5 h-8 w-8 border-b-2 border-l-2 border-emerald-400/70" />

                <div className="absolute bottom-5 right-5 h-8 w-8 border-b-2 border-r-2 border-emerald-400/70" />


                {/* FOOD */}

                <div
                  className={`relative z-10 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 text-7xl shadow-2xl transition duration-700 ${
                    isScanning
                      ? "scale-110"
                      : "scale-100"
                  }`}
                >
                  🍎
                </div>


                {/* SCANNING LINE */}

                <div
                  className="absolute left-8 right-8 h-px bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                  style={{
                    top: `${15 + (scanProgress * 0.7)}%`,
                  }}
                />


                {/* SCAN STATUS */}

                <div className="absolute bottom-6 left-0 right-0 text-center">

                  {!showResult ? (
                    <>
                      <p className="font-semibold text-white">
                        Analyzing Food
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        AI Vision Analysis {scanProgress}%
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2">

                        <CheckCircle2
                          size={18}
                          className="text-emerald-400"
                        />

                        <p className="font-semibold text-emerald-400">
                          Analysis Complete
                        </p>

                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Freshness detected successfully
                      </p>
                    </>
                  )}

                </div>

              </div>


              {/* =================================
                  PROGRESS
              ================================= */}

              <div className="mt-4">

                <div className="mb-2 flex justify-between text-xs">

                  <span className="text-slate-500">
                    AI Analysis
                  </span>

                  <span className="font-semibold text-emerald-400">
                    {scanProgress}%
                  </span>

                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-100"
                    style={{
                      width: `${scanProgress}%`,
                    }}
                  />

                </div>

              </div>


              {/* =================================
                  RESULT CARDS
              ================================= */}

              <div className="mt-5 grid grid-cols-2 gap-4">

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition duration-300 hover:border-emerald-400/30">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Freshness
                  </p>

                  <div className="mt-2 flex items-center gap-2">

                    <CheckCircle2
                      size={18}
                      className="text-emerald-400"
                    />

                    <p className="text-xl font-bold text-emerald-400">
                      Fresh
                    </p>

                  </div>

                </div>


                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition duration-300 hover:border-emerald-400/30">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Confidence
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    94%
                  </p>

                </div>

              </div>


              {/* =================================
                  ENVIRONMENT
              ================================= */}

              <div className="mt-4 grid grid-cols-2 gap-3">

                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-400/10">

                    <Thermometer
                      size={17}
                      className="text-orange-300"
                    />

                  </div>

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Temperature
                    </p>

                    <p className="text-sm font-semibold text-white">
                      4.2°C
                    </p>

                  </div>

                </div>


                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10">

                    <Droplets
                      size={17}
                      className="text-cyan-300"
                    />

                  </div>

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Humidity
                    </p>

                    <p className="text-sm font-semibold text-white">
                      62%
                    </p>

                  </div>

                </div>

              </div>


              {/* =================================
                  DEMO BUTTON
              ================================= */}

              <button
                onClick={restartDemo}
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-sm font-semibold text-slate-300 transition duration-300 hover:border-emerald-400/40 hover:bg-emerald-400/5 hover:text-emerald-400"
              >
                Replay AI Analysis
              </button>

            </div>

          </div>


          {/* =================================
              FLOATING SHELF CARD
          ================================= */}

          <div className="absolute -bottom-7 -left-5 hidden rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl backdrop-blur-xl sm:block">

            <p className="text-xs uppercase tracking-wider text-slate-500">
              Estimated Shelf Life
            </p>

            <div className="mt-2 flex items-end gap-2">

              <span className="text-2xl font-bold text-white">
                3–6
              </span>

              <span className="mb-1 text-xs text-slate-500">
                days
              </span>

            </div>

            <div className="mt-2 h-1 w-20 overflow-hidden rounded-full bg-slate-800">

              <div className="h-full w-[72%] rounded-full bg-emerald-400" />

            </div>

          </div>


          {/* =================================
              FLOATING AI CARD
          ================================= */}

          <div className="absolute -right-5 top-12 hidden rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl backdrop-blur-xl md:block">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10">

                <Sparkles
                  size={18}
                  className="text-emerald-400"
                />

              </div>

              <div>

                <p className="text-xs text-slate-500">
                  AI STATUS
                </p>

                <p className="text-sm font-semibold text-emerald-400">
                  Analysis Ready
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================
          BOTTOM SCROLL INDICATOR
      ===================================== */}

      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-slate-600 md:flex">

        <span className="text-[10px] uppercase tracking-[3px]">
          Explore
        </span>

        <div className="h-8 w-px bg-gradient-to-b from-emerald-400/50 to-transparent" />

      </div>


      {/* =====================================
          ANIMATION CSS
      ===================================== */}

      <style>{`

        @keyframes heroFloat {
          0% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-8px);
          }

          100% {
            transform: translateY(0px);
          }
        }

        @keyframes heroPulse {
          0% {
            opacity: 0.4;
          }

          50% {
            opacity: 1;
          }

          100% {
            opacity: 0.4;
          }
        }

      `}</style>

    </section>
  );
}

export default Hero;