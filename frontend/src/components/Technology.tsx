import {
  BrainCircuit,
  Database,
  Cpu,
  Globe,
  ImageIcon,
  Radio,
  Server,
  Sparkles,
} from "lucide-react";

const technologies = [
  {
    icon: Globe,
    name: "React + TypeScript",
    category: "Frontend",
    description: "Responsive and type-safe user interface",
  },
  {
    icon: Server,
    name: "Node.js + Express",
    category: "Backend",
    description: "REST API and application services",
  },
  {
    icon: Database,
    name: "MongoDB",
    category: "Database",
    description: "User, scan and prediction data",
  },
  {
    icon: ImageIcon,
    name: "Computer Vision",
    category: "AI Vision",
    description: "Visual food-condition analysis",
  },
  {
    icon: BrainCircuit,
    name: "Machine Learning",
    category: "Prediction",
    description: "Freshness and shelf-life estimation",
  },
  {
    icon: Cpu,
    name: "FastAPI",
    category: "ML Service",
    description: "Python model inference API",
  },
  {
    icon: Sparkles,
    name: "Generative AI",
    category: "AI Assistant",
    description: "Prediction explanation and recommendations",
  },
  {
    icon: Radio,
    name: "IoT Sensors",
    category: "Environment",
    description: "Temperature and humidity monitoring",
  },
];

function Technology() {
  return (
    <section
      id="technology"
      className="relative overflow-hidden bg-slate-950 px-6 py-28"
    >
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
            Built With Modern Technology
          </div>

          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            The Technology Behind
            <span className="block text-emerald-400">
              FreshLens AI
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            A full-stack architecture connecting modern web technologies,
            computer vision, machine learning, generative AI and IoT.
          </p>
        </div>

        {/* Architecture Flow */}
        <div className="mt-16 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4">

            {/* User */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white">
              User / Food Image
            </div>

            <div className="h-8 w-px bg-emerald-500/30" />

            {/* Frontend */}
            <div className="w-full max-w-xl rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">
                Presentation Layer
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                React + TypeScript
              </p>

              <p className="mt-1 text-sm text-slate-500">
                UI · Scanner · Dashboard · Analytics
              </p>
            </div>

            <div className="h-8 w-px bg-emerald-500/30" />

            {/* Backend */}
            <div className="w-full max-w-xl rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-5 text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-cyan-400">
                Application Layer
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                Node.js + Express
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Authentication · REST API · Business Logic
              </p>
            </div>

            <div className="h-8 w-px bg-emerald-500/30" />

            {/* AI / Data Layer */}
            <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <Database
                  className="mx-auto text-emerald-400"
                  size={24}
                />

                <p className="mt-3 font-semibold text-white">
                  MongoDB
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Users · Scans · Predictions
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <BrainCircuit
                  className="mx-auto text-emerald-400"
                  size={24}
                />

                <p className="mt-3 font-semibold text-white">
                  FastAPI + ML
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Vision · Classification · Prediction
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <Radio
                  className="mx-auto text-emerald-400"
                  size={24}
                />

                <p className="mt-3 font-semibold text-white">
                  IoT Layer
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Temperature · Humidity
                </p>
              </div>

            </div>

            <div className="h-8 w-px bg-emerald-500/30" />

            {/* AI Output */}
            <div className="w-full max-w-xl rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-5 text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-purple-400">
                Intelligence Layer
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                AI Explanation & Recommendations
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Risk analysis · Explanation · Storage recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Technology Cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {technologies.map((technology) => {
            const Icon = technology.icon;

            return (
              <div
                key={technology.name}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-white/[0.04]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Icon size={21} />
                </div>

                <p className="mt-5 text-xs font-medium uppercase tracking-wider text-emerald-400">
                  {technology.category}
                </p>

                <h3 className="mt-2 font-semibold text-white">
                  {technology.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {technology.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export default Technology;