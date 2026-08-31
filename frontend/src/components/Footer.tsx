import {
  ArrowRight,
  Mail,
  Leaf,
} from "lucide-react";

function Footer() {
  return (
    <>
      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-transparent px-6 py-16 text-center sm:px-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Leaf size={28} />
          </div>

          <p className="mt-7 text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
            Start With FreshLens
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Make every food decision
            <span className="text-emerald-400"> smarter.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400">
            Scan your food, understand its condition, estimate its remaining
            shelf-life and make better storage decisions with AI.
          </p>

          <a
            href="/scan"
            className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-white shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-400"
          >
            Start Your First Scan

            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 px-6 py-14">
        <div className="mx-auto max-w-7xl">

          <div className="grid gap-10 md:grid-cols-4">

            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Leaf size={21} />
                </div>

                <div>
                  <p className="font-bold text-white">
                    FreshLens
                  </p>

                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400">
                    AI
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">
                An intelligent food freshness platform combining computer
                vision, machine learning, environmental intelligence and
                generative AI.
              </p>

              {/* Social / Contact */}
              <div className="mt-6 flex gap-3">

                <a
                  href="mailto:contact@freshlens.ai"
                  aria-label="Email"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  <Mail size={18} />
                </a>

                <a
                  href="#"
                  aria-label="GitHub"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-xs font-bold text-slate-400 transition hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  GH
                </a>

                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-xs font-bold text-slate-400 transition hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  in
                </a>

                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-xs font-bold text-slate-400 transition hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  IG
                </a>

              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-white">
                Product
              </h3>

              <div className="mt-5 space-y-3 text-sm text-slate-500">

                <a
                  href="/#features"
                  className="block transition hover:text-emerald-400"
                >
                  Features
                </a>

                <a
                  href="/#how-it-works"
                  className="block transition hover:text-emerald-400"
                >
                  How It Works
                </a>

                <a
                  href="/#technology"
                  className="block transition hover:text-emerald-400"
                >
                  Technology
                </a>

                <a
                  href="/scan"
                  className="block transition hover:text-emerald-400"
                >
                  Scanner
                </a>

              </div>
            </div>

            {/* Platform */}
            <div>
              <h3 className="text-sm font-semibold text-white">
                Platform
              </h3>

              <div className="mt-5 space-y-3 text-sm text-slate-500">
                <p>AI Vision</p>
                <p>ML Prediction</p>
                <p>IoT Monitoring</p>
                <p>Smart Recommendations</p>
              </div>
            </div>

          </div>

          {/* Bottom */}
          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">

            <p>
              © {new Date().getFullYear()} FreshLens AI. All rights reserved.
            </p>

            <div className="flex gap-5">
              <span className="cursor-pointer transition hover:text-slate-400">
                Privacy
              </span>

              <span className="cursor-pointer transition hover:text-slate-400">
                Terms
              </span>
            </div>

          </div>

        </div>
      </footer>
    </>
  );
}

export default Footer;