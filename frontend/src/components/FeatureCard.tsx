import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tag: string;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  tag,
}: FeatureCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-slate-900">
      {/* Hover glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl transition group-hover:bg-emerald-500/20" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
            <Icon size={23} />
          </div>

          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-500">
            {tag}
          </span>
        </div>

        <h3 className="mt-6 text-xl font-semibold text-white">
          {title}
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
    </article>
  );
}

export default FeatureCard;