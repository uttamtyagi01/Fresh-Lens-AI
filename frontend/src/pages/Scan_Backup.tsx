import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ============================================================
// TYPES
// ============================================================

type ShelfLife = {
  min?: number | string;
  max?: number | string;
  range?: string;
  estimated?: number | string;
  estimated_days?: number | string;
  likely_range?: string;
  confidence?: number | string;
};

type Spoilage = {
  probability?: number | string;
  risk?: string;
};

type Breakdown = {
  visual_quality?: number | string;
  color_condition?: number | string;
  texture_indicators?: number | string;
  spots_defects?: number | string;
  environmental_risk?: number | string;
};

type ExplainabilityFactor = {
  category?: string;
  factor?: string;
  impact?: string;
};

type GradCamExplanation = {
  available?: boolean;
  method?: string;
  target_class?: string;
  focus_area?: string;
  heatmap_base64?: string;
  note?: string;
};

type AnalysisResult = {
  food_name?: string;
  food_class?: string;
  detected_food?: string;
  food?: string;
  raw_food_label?: string;

  food_confidence?: number | string;
  food_identification_confidence?: number | string;

  status?: string;
  freshness_status?: string;
  freshness?: string;

  freshness_score?: number | string;
  score?: number | string;

  confidence?: number | string;
  ai_confidence?: number | string;
  model_confidence?: number | string;

  model_label?: string;
  local_model_label?: string;
  local_model_status?: string;
  local_model_score?: number | string;
  local_model_confidence?: number | string;

  gemini_used?: boolean;
  gemini_available?: boolean;
  gemini_model?: string;
  analysis_source?: string;
  gemini_analysis?: unknown;

  multimodal_mode?: string;

  visual_condition?: string;
  condition?: string;
  visual_signs?: string[];

  visual_quality?: number | string;
  color_condition?: number | string;
  texture_indicators?: number | string;
  spots_defects?: number | string;

  freshness_breakdown?: Breakdown;
  breakdown?: Breakdown;
  visual_breakdown?: Breakdown;

  spoilage_probability?: number | string;
  spoilage_probability_percent?: number | string;
  spoilage_risk?: string;
  spoilage?: Spoilage;

  spoilage_forecast?: {
    next_24_hours?: number | string;
    next_48_hours?: number | string;
    next_72_hours?: number | string;
    next_5_days?: number | string;
  };

  shelf_life?: string | ShelfLife;
  estimated_shelf_life_days?: ShelfLife;
  shelf_life_days?: ShelfLife;
  dynamic_shelf_life?: ShelfLife;

  shelf_life_model?: string;
  shelf_life_model_food_type?: string;
  shelf_life_model_validation?: {
    mae_days?: number | string;
    rmse_days?: number | string;
    r2?: number | string;
  };
  shelf_life_prediction_error_band_days?: number | string;

  temperature?: number | string | null;
  temperature_c?: number | string | null;
  humidity?: number | string | null;
  humidity_percent?: number | string | null;
  storage_method?: string | null;
  age_hours?: number | string | null;
  age_days?: number | string | null;

  environment_available?: boolean;
  environmental_risk?: number | string;
  environmental_risk_score?: number | string;
  environmental_risk_level?: string;
  environmental_factors?: string[];

  environment_status?: string;

  // Frontend-preserved source snapshots. These keep Weather and IoT
  // visible in the result even when the backend uses one numeric
  // environment input as the primary signal.
  ui_weather_context?: {
    location?: string;
    latitude?: number;
    longitude?: number;
    temperature?: number;
    humidity?: number;
    apparent_temperature?: number;
    wind_speed_kmh?: number;
    source?: string;
  };

  ui_iot_context?: {
    temperature?: number;
    humidity?: number;
    storage_method?: string;
    source?: string;
  };

  ui_environment_note?: string;

  environment?: {
    temperature_c?: number | string | null;
    humidity_percent?: number | string | null;
    storage_method?: string | null;
    risk_score?: number | string;
    risk_level?: string;
    factors?: string[];
  };

  explainability?: {
    main_risk_factor?: string;
    factors?: ExplainabilityFactor[];
    visual_evidence?: string[];
    gradcam?: GradCamExplanation | null;
  };

  main_risk_factor?: string;
  risk_factors?: Array<string | ExplainabilityFactor>;

  recommendation?: string;
  research_estimate?: boolean;
  safety_disclaimer?: string;
  model_version?: string;
  analysis_timestamp?: string;
};

type ApiResponse = {
  success?: boolean;
  filename?: string;
  inputs?: {
    temperature?: number | null;
    humidity?: number | null;
    storage_method?: string | null;
    age_hours?: number | null;
    age_days?: number | null;
  };
  result?: AnalysisResult;
  detail?: string;
  message?: string;
};

type SelectedImage = {
  id: string;
  file: File;
  preview: string;
  source: "upload" | "camera";
};

type BatchResult = {
  id: string;
  fileName: string;
  result: AnalysisResult;
};

type LiveWeather = {
  temperature: number;
  humidity: number;
  apparent_temperature?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_kmh?: number;
};

type WeatherApiResponse = {
  success?: boolean;
  source?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  weather?: LiveWeather;
  units?: Record<string, string>;
  detail?: string;
};

type IoTSensorReading = {
  temperature: number;
  humidity: number;
  storage_method: string;
};

type IoTApiResponse = {
  success?: boolean;
  source?: string;
  timestamp?: string;
  sensor?: IoTSensorReading;
  message?: string;
  detail?: string;
};

// ============================================================
// CONSTANTS
// ============================================================

const API_URL =
  "http://127.0.0.1:8000/api/analysis/analyze";

const WEATHER_API_URL =
  "http://127.0.0.1:8000/api/weather/current";

const IOT_API_URL =
  "http://127.0.0.1:8000/api/iot/sensor";

type WeatherLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const WEATHER_LOCATIONS: WeatherLocation[] = [
  {
    id: "dehradun",
    name: "Dehradun",
    latitude: 30.3165,
    longitude: 78.0322,
  },
  {
    id: "delhi",
    name: "New Delhi",
    latitude: 28.6139,
    longitude: 77.2090,
  },
  {
    id: "mumbai",
    name: "Mumbai",
    latitude: 19.0760,
    longitude: 72.8777,
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    latitude: 12.9716,
    longitude: 77.5946,
  },
];

const DEFAULT_WEATHER_LOCATION =
  WEATHER_LOCATIONS[0];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const REQUEST_TIMEOUT = 90_000;
const MAX_IMAGES = 10;

// ============================================================
// HELPERS
// ============================================================

function toNumber(
  value?: number | string | null
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : undefined;
}

function clamp(
  value: number,
  min = 0,
  max = 100
): number {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function normalizePercent(
  value?: number | string | null
): number | undefined {
  const number = toNumber(value);

  if (number === undefined) {
    return undefined;
  }

  if (
    number >= 0 &&
    number <= 1
  ) {
    return number * 100;
  }

  return clamp(number);
}

function formatNumber(
  value?: number | string | null,
  decimals = 2
): string {
  const number = toNumber(value);

  if (number === undefined) {
    return "N/A";
  }

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(decimals);
}

function formatPercent(
  value?: number | string | null
): string {
  const number = normalizePercent(value);
  return number === undefined
    ? "N/A"
    : `${formatNumber(number)}%`;
}

function getFoodName(
  result: AnalysisResult
): string {
  return (
    result.food_name ||
    result.food_class ||
    result.detected_food ||
    result.food ||
    result.raw_food_label ||
    "Unknown Food"
  );
}

function getStatus(
  result: AnalysisResult
): string {
  return (
    result.freshness_status ||
    result.status ||
    result.freshness ||
    "Unknown"
  );
}

function getConfidence(
  result: AnalysisResult
): number | undefined {
  return (
    normalizePercent(result.confidence) ??
    normalizePercent(result.ai_confidence) ??
    normalizePercent(result.model_confidence) ??
    normalizePercent(result.local_model_confidence)
  );
}

function getFreshnessScore(
  result: AnalysisResult
): number | undefined {
  const score =
    toNumber(result.freshness_score) ??
    toNumber(result.score) ??
    toNumber(result.local_model_score);

  return score === undefined
    ? undefined
    : clamp(score);
}

function getSpoilageProbability(
  result: AnalysisResult
): number | undefined {
  const raw =
    result.spoilage_probability_percent ??
    result.spoilage_probability ??
    result.spoilage?.probability;

  const number = toNumber(raw);

  if (number === undefined) {
    return undefined;
  }

  return clamp(number, 0, 100);
}

function formatSpoilagePercent(
  value?: number | string | null
): string {
  const number = toNumber(value);

  if (number === undefined) {
    return "N/A";
  }

  return `${formatNumber(clamp(number, 0, 100))}%`;
}

function getShelfLife(
  result: AnalysisResult
): string | ShelfLife | undefined {
  return (
    result.estimated_shelf_life_days ??
    result.dynamic_shelf_life ??
    result.shelf_life_days ??
    result.shelf_life
  );
}

function formatShelfLife(
  value?: string | ShelfLife
): string {
  if (!value) {
    return "N/A";
  }

  if (typeof value === "string") {
    return value
      .replace(/\b1\s+days\b/gi, "1 day")
      .trim();
  }

  const estimated =
    toNumber(value.estimated) ??
    toNumber(value.estimated_days);

  if (estimated !== undefined) {
    return estimated === 1
      ? "1 day"
      : `${formatNumber(estimated, 1)} days`;
  }

  const min = toNumber(value.min);
  const max = toNumber(value.max);

  if (
    min !== undefined &&
    max !== undefined
  ) {
    if (min === max) {
      return min === 1
        ? "1 day"
        : `${formatNumber(min, 1)} days`;
    }

    return `${formatNumber(min, 1)}-${formatNumber(max, 1)} days`;
  }

  if (value.range) {
    return value.range
      .replace(/\b1\s+days\b/gi, "1 day")
      .trim();
  }

  return "N/A";
}

function getAgeDays(
  result: AnalysisResult
): number | undefined {
  const days = toNumber(result.age_days);

  // The backend uses 0 as its default when food age is not supplied.
  // Treat that default as "not supplied" in the UI.
  if (days !== undefined && days > 0) {
    return days;
  }

  const hours = toNumber(result.age_hours);

  if (hours !== undefined && hours > 0) {
    return hours / 24;
  }

  return undefined;
}

function formatStorageMethod(
  storage?: string | null
): string {
  if (!storage) {
    return "Unknown";
  }

  return storage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getStatusTone(
  status: string
): {
  text: string;
  badge: string;
} {
  const value = status.toLowerCase();

  if (
    value.includes("spoiled") ||
    value.includes("rotten") ||
    value.includes("bad")
  ) {
    return {
      text: "text-red-400",
      badge:
        "border-red-500/30 bg-red-500/10 text-red-400",
    };
  }

  if (
    value.includes("slightly") ||
    value.includes("unripe") ||
    value.includes("warning")
  ) {
    return {
      text: "text-yellow-400",
      badge:
        "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    };
  }

  if (value.includes("fresh")) {
    return {
      text: "text-emerald-400",
      badge:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    };
  }

  return {
    text: "text-slate-300",
    badge:
      "border-slate-700 bg-slate-800 text-slate-300",
  };
}

function saveToHistory(
  result: AnalysisResult
): void {
  try {
    const existing =
      localStorage.getItem(
        "freshlens_scan_history"
      );

    const parsed = existing
      ? JSON.parse(existing)
      : [];

    const history = Array.isArray(parsed)
      ? parsed
      : [];

    const record = {
      id:
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}`,
      foodName: getFoodName(result),
      status: getStatus(result),
      score: formatPercent(
        getFreshnessScore(result)
      ),
      confidence: formatPercent(
        getConfidence(result)
      ),
      spoilageProbability: formatSpoilagePercent(
        getSpoilageProbability(result)
      ),
      spoilageRisk:
        result.spoilage_risk ||
        result.spoilage?.risk ||
        "N/A",
      shelfLife: formatShelfLife(
        getShelfLife(result)
      ),
      temperature:
        result.temperature ??
        result.temperature_c ??
        null,
      humidity:
        result.humidity ??
        result.humidity_percent ??
        null,
      storageMethod:
        result.storage_method ||
        "Unknown",
      ageDays: getAgeDays(result),
      multimodalMode:
        result.multimodal_mode ||
        "image_only",
      recommendation:
        result.recommendation ||
        "No recommendation available.",
      date: new Date().toLocaleString(),
    };

    localStorage.setItem(
      "freshlens_scan_history",
      JSON.stringify(
        [record, ...history].slice(0, 100)
      )
    );
  } catch (error) {
    console.error(
      "Failed to save FreshLens history:",
      error
    );
  }
}



function downloadAnalysisReport(
  result: AnalysisResult,
  fileName?: string,
  index?: number
): void {
  const food = getFoodName(result);
  const status = getStatus(result);
  const freshness = getFreshnessScore(result);
  const confidence = getConfidence(result);
  const spoilage = getSpoilageProbability(result);
  const shelfLife = formatShelfLife(getShelfLife(result));
  const ageDays = getAgeDays(result);
  const temperature =
    result.temperature ?? result.temperature_c;
  const humidity =
    result.humidity ?? result.humidity_percent;
  const storage = formatStorageMethod(result.storage_method);

  const report = [
    'FreshLens AI — Food Freshness Analysis Report',
    '================================================',
    `Generated: ${new Date().toLocaleString()}`,
    `Image: ${fileName || 'Food image'}${index !== undefined ? ` (Image ${index})` : ''}`,
    '',
    'AI ASSESSMENT',
    '--------------',
    `Food: ${food}`,
    `Freshness Status: ${status}`,
    `Freshness Score: ${freshness !== undefined ? `${formatNumber(freshness)} / 100` : 'N/A'}`,
    `AI Confidence: ${confidence !== undefined ? `${formatNumber(confidence)}%` : 'N/A'}`,
    `Spoilage Probability: ${spoilage !== undefined ? `${formatNumber(spoilage)}%` : 'N/A'}`,
    `Spoilage Risk: ${result.spoilage_risk || result.spoilage?.risk || 'N/A'}`,
    `Remaining Shelf-Life: ${shelfLife}`,
    '',
    'ENVIRONMENTAL CONTEXT',
    '---------------------',
    `Primary Environment: ${temperature !== undefined && temperature !== null ? `${formatNumber(temperature, 1)}°C` : 'Not supplied'} / ${humidity !== undefined && humidity !== null ? `${formatNumber(humidity, 1)}%` : 'Not supplied'}`,
    `Storage: ${storage}`,
    `Food Age: ${ageDays !== undefined ? `${formatNumber(ageDays, 1)} days` : 'Not supplied'}`,
    `Environmental Risk: ${result.environmental_risk_score !== undefined ? `${formatNumber(result.environmental_risk_score)}%` : 'N/A'}${result.environmental_risk_level ? ` — ${result.environmental_risk_level}` : ''}`,
    `Fusion Context: ${result.multimodal_mode || 'image_only'}`,
    ...(result.ui_weather_context ? [
      `Weather Context: ${result.ui_weather_context.location || 'Selected location'} • ${result.ui_weather_context.temperature !== undefined ? `${formatNumber(result.ui_weather_context.temperature, 1)}°C` : 'N/A'} • ${result.ui_weather_context.humidity !== undefined ? `${formatNumber(result.ui_weather_context.humidity, 1)}%` : 'N/A'} • ${result.ui_weather_context.source || 'Open-Meteo'}`,
    ] : []),
    ...(result.ui_iot_context ? [
      `IoT Context: ${result.ui_iot_context.temperature !== undefined ? `${formatNumber(result.ui_iot_context.temperature, 1)}°C` : 'N/A'} • ${result.ui_iot_context.humidity !== undefined ? `${formatNumber(result.ui_iot_context.humidity, 1)}%` : 'N/A'} • ${formatStorageMethod(result.ui_iot_context.storage_method)} • ${result.ui_iot_context.source || 'IoT Sensor Simulator'}`,
    ] : []),
    ...(result.ui_environment_note ? [`Environment Note: ${result.ui_environment_note}`] : []),
    '',
    'EXPLAINABILITY',
    '--------------',
    `Main Risk Factor: ${result.main_risk_factor || result.explainability?.main_risk_factor || 'N/A'}`,
    `Visual Condition: ${result.visual_condition || result.condition || 'N/A'}`,
    '',
    'VISUAL EVIDENCE',
    '---------------',
    ...(result.visual_signs?.length ? result.visual_signs.map((sign) => `- ${sign}`) : ['- No detailed visual signs returned.']),
    '',
    'SMART RECOMMENDATION',
    '--------------------',
    result.recommendation || 'Follow appropriate storage practices and monitor the food before consumption.',
    '',
    'RESEARCH / PROTOTYPE NOTICE',
    '---------------------------',
    result.safety_disclaimer ||
      'Freshness, shelf-life and spoilage probability are AI-based research/prototype estimates. They are not a food-safety guarantee and should not replace professional food-safety guidance.',
    '',
    'FreshLens AI',
  ].join('\n');

  const blob = new Blob([report], {
    type: 'text/plain;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeFood = food
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'food';

  anchor.href = url;
  anchor.download = `freshlens-${safeFood}-analysis-report.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ============================================================
// PROFESSIONAL AI PRESENTATION COMPONENTS
// ============================================================

function StatusPill({ status }: { status: string }) {
  const tone = getStatusTone(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide ${tone.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${tone.text.replace(
          "text-",
          "bg-"
        )}`}
      />
      {status}
    </span>
  );
}

function ProgressBar({
  value,
  tone = "emerald",
}: {
  value?: number | string;
  tone?: "emerald" | "red" | "slate";
}) {
  const percentage = clamp(toNumber(value) ?? 0);

  const fillClass =
    tone === "red"
      ? "bg-red-400"
      : tone === "slate"
        ? "bg-slate-400"
        : "bg-emerald-400";

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
      <div
        className={`h-full rounded-full transition-all duration-700 ${fillClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: "default" | "fresh" | "danger" | "warning";
  icon: string;
}) {
  const valueClass =
    tone === "fresh"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-red-300"
        : tone === "warning"
          ? "text-yellow-300"
          : "text-white";

  return (
    <div className="group rounded-2xl border border-white/5 bg-slate-950/80 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:border-emerald-500/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className={`mt-3 text-3xl font-black tracking-tight ${valueClass}`}>
            {value}
          </p>
          {subtext && (
            <p className="mt-1.5 text-xs text-slate-500">{subtext}</p>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  text,
  tone = "default",
  icon,
}: {
  title: string;
  text: string;
  tone?: "default" | "emerald" | "yellow" | "red";
  icon: string;
}) {
  const borderClass =
    tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/[0.04]"
      : tone === "yellow"
        ? "border-yellow-500/20 bg-yellow-500/[0.04]"
        : tone === "red"
          ? "border-red-500/20 bg-red-500/[0.04]"
          : "border-white/5 bg-slate-950/50";

  return (
    <div className={`rounded-2xl border p-5 ${borderClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-base">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
        </div>
      </div>
    </div>
  );
}

function ForecastCard({
  title,
  value,
}: {
  title: string;
  value?: number | string;
}) {
  const number = toNumber(value);
  const percentage = clamp(number ?? 0);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/70 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-black text-red-300">
          {number === undefined ? "N/A" : `${Math.round(percentage)}%`}
        </p>
        {number !== undefined && (
          <span className="text-[11px] font-semibold text-slate-500">
            risk
          </span>
        )}
      </div>
      {number !== undefined && (
        <div className="mt-3">
          <ProgressBar value={percentage} tone="red" />
        </div>
      )}
    </div>
  );
}

function BreakdownItem({
  title,
  value,
  danger = false,
}: {
  title: string;
  value?: number | string;
  danger?: boolean;
}) {
  const number = toNumber(value);
  const safeValue = clamp(number ?? 0);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-300">{title}</p>
        <p
          className={`text-sm font-black ${
            danger ? "text-red-300" : "text-slate-200"
          }`}
        >
          {number === undefined ? "N/A" : `${formatNumber(safeValue)}%`}
        </p>
      </div>

      {number !== undefined && (
        <div className="mt-3">
          <ProgressBar
            value={safeValue}
            tone={danger ? "red" : "emerald"}
          />
        </div>
      )}
    </div>
  );
}

function GradCamCard({
  imageUrl,
  gradcam,
}: {
  imageUrl?: string;
  gradcam?: GradCamExplanation | null;
}) {
  if (!imageUrl || !gradcam?.heatmap_base64) {
    return null;
  }

  return (
    <div className="border-t border-white/5 p-5 sm:p-7">
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.17em] text-fuchsia-300">
            Explainable AI
          </p>
          <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-300">
            {gradcam.method || "Grad-CAM"}
          </span>
        </div>

        <h4 className="mt-1 text-xl font-black text-white">
          AI attention heatmap
        </h4>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          The highlighted region shows where the local freshness model placed
          relatively more influence on this prediction.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Original image
            </p>
            <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-500">
              Input
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-black">
            <img
              src={imageUrl}
              alt="Original food for AI freshness analysis"
              className="aspect-square h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-fuchsia-500/10 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-300">
              AI attention overlay
            </p>
            <span className="rounded-full border border-fuchsia-500/15 bg-fuchsia-500/5 px-2 py-1 text-[10px] font-bold text-fuchsia-300">
              Relative influence
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black">
            <img
              src={imageUrl}
              alt="Food image with AI Grad-CAM attention overlay"
              className="aspect-square h-full w-full object-contain"
            />
            <img
              src={gradcam.heatmap_base64}
              alt="AI Grad-CAM heatmap"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                <span>Lower attention</span>
                <span>Higher attention</span>
              </div>
              <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-300 to-red-500" />
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left sm:text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">
                AI Focus Area
              </p>
              <p className="mt-1 text-sm font-bold text-slate-200">
                {gradcam.focus_area || "Visible food surface"}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            {gradcam.note ||
              "Heatmap intensity is relative and should not be treated as proof of a specific defect or contamination."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  imageUrl,
}: {
  result: AnalysisResult;
  imageUrl?: string;
}) {
  const breakdown =
    result.freshness_breakdown ||
    result.visual_breakdown ||
    result.breakdown;

  const score = getFreshnessScore(result);
  const confidence = getConfidence(result);
  const spoilage = getSpoilageProbability(result);

  const status = getStatus(result);
  const foodName = getFoodName(result);
  const shelf = getShelfLife(result);

  const tone = getStatusTone(status);

  const environmentTemperature =
    toNumber(result.temperature) ??
    toNumber(result.temperature_c);

  const environmentHumidity =
    toNumber(result.humidity) ??
    toNumber(result.humidity_percent);

  const environmentalRisk =
    toNumber(result.environmental_risk) ??
    toNumber(result.environmental_risk_score) ??
    toNumber(result.environment?.risk_score);

  const environmentRiskLevel =
    result.environmental_risk_level ||
    result.environment?.risk_level ||
    "Unknown";

  const forecast = result.spoilage_forecast;

  const shelfConfidence =
    typeof shelf === "object" && shelf
      ? shelf.confidence
      : undefined;

  const shelfRange =
    typeof shelf === "object" && shelf
      ? shelf.likely_range || shelf.range
      : undefined;

  const ageDays = getAgeDays(result);

  const localAssessment =
    result.local_model_status ||
    result.local_model_label ||
    result.model_label ||
    "N/A";

  const localModelDiffersFromFinal =
    localAssessment !== "N/A" &&
    status !== "Unknown" &&
    localAssessment.trim().toLowerCase() !==
      status.trim().toLowerCase();

  const analysisSource = result.analysis_source || "AI analysis pipeline";

  const shelfModel = result.shelf_life_model || "N/A";
  const shelfModelFoodType =
    result.shelf_life_model_food_type || foodName;

  const shelfValidation = result.shelf_life_model_validation;

  const shelfMae = toNumber(shelfValidation?.mae_days);
  const shelfRmse = toNumber(shelfValidation?.rmse_days);
  const shelfR2 = toNumber(shelfValidation?.r2);

  const riskTone =
    environmentRiskLevel.toLowerCase().includes("high")
      ? "red"
      : environmentRiskLevel.toLowerCase().includes("medium")
        ? "yellow"
        : "emerald";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
      {/* RESULT HERO */}
      <div className="relative overflow-hidden border-b border-white/5 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {imageUrl ? (
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black sm:h-24 sm:w-24">
                <img
                  src={imageUrl}
                  alt={foodName}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-3xl sm:h-24 sm:w-24">
                🌿
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                  AI Assessment
                </span>
                {result.research_estimate && (
                  <span className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-300">
                    Prototype
                  </span>
                )}
              </div>

              <h3 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {foodName}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {analysisSource}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <StatusPill status={status} />
            <div className="text-left lg:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Freshness Score
              </p>
              <p className={`mt-1 text-4xl font-black ${tone.text}`}>
                {formatNumber(score)}
                <span className="ml-1 text-lg font-semibold text-slate-600">
                  /100
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KEY METRICS */}
      <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
        <MetricCard
          label="Freshness"
          value={score === undefined ? "N/A" : formatNumber(score)}
          subtext="visual quality score"
          tone={
            status.toLowerCase().includes("spoiled")
              ? "warning"
              : "fresh"
          }
          icon="✦"
        />
        <MetricCard
          label="Spoilage Probability"
          value={formatSpoilagePercent(spoilage)}
          subtext={`risk: ${result.spoilage_risk || "N/A"}`}
          tone="danger"
          icon="⚠"
        />
        <MetricCard
          label="AI Confidence"
          value={formatPercent(confidence)}
          subtext="assessment confidence"
          tone="fresh"
          icon="✓"
        />
      </div>

      {/* SHELF LIFE */}
      <div className="px-5 pb-5 sm:px-7 sm:pb-7">
        <div className="overflow-hidden rounded-[1.75rem] border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.08] via-slate-950/70 to-slate-950/90">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
                  ⏳
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.17em] text-emerald-300">
                    Dynamic Shelf-Life
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Estimated remaining freshness
                  </p>
                </div>
              </div>

              <p className="mt-5 text-4xl font-black tracking-tight text-white">
                {formatShelfLife(shelf)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
              <div className="rounded-2xl border border-white/5 bg-slate-950/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Likely Range
                </p>
                <p className="mt-2 text-lg font-black text-slate-100">
                  {shelfRange || "N/A"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-950/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Prediction Confidence
                </p>
                <p className="mt-2 text-lg font-black text-emerald-300">
                  {formatPercent(shelfConfidence)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FORECAST */}
      <div className="border-t border-white/5 p-5 sm:p-7">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.17em] text-red-300">
              Risk Forecast
            </p>
            <h4 className="mt-1 text-xl font-black text-white">
              Spoilage trend over time
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Prototype time-based projection
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ForecastCard title="Next 24 Hours" value={forecast?.next_24_hours} />
          <ForecastCard title="Next 48 Hours" value={forecast?.next_48_hours} />
          <ForecastCard title="Next 72 Hours" value={forecast?.next_72_hours} />
          <ForecastCard title="Next 5 Days" value={forecast?.next_5_days} />
        </div>
      </div>

      {/* ENVIRONMENT */}
      <div className="border-t border-white/5 p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.17em] text-cyan-300">
              Environmental Intelligence
            </p>
            <h4 className="mt-1 text-xl font-black text-white">
              Storage context
            </h4>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-black ${
              riskTone === "red"
                ? "border-red-500/20 bg-red-500/5 text-red-300"
                : riskTone === "yellow"
                  ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-300"
                  : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
            }`}
          >
            {formatNumber(environmentalRisk)}% risk
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            title="Primary Temperature"
            text={
              environmentTemperature === undefined
                ? "Not supplied"
                : `${formatNumber(environmentTemperature, 1)}°C`
            }
            icon="🌡"
          />
          <InsightCard
            title="Primary Humidity"
            text={
              environmentHumidity === undefined
                ? "Not supplied"
                : `${formatNumber(environmentHumidity, 1)}%`
            }
            icon="💧"
          />
          <InsightCard
            title="Storage"
            text={formatStorageMethod(result.storage_method)}
            icon="📦"
          />
          <InsightCard
            title="Food Age"
            text={
              ageDays === undefined
                ? "Not supplied"
                : `${formatNumber(ageDays, 1)} days`
            }
            icon="🕒"
          />
        </div>

        {(result.ui_weather_context || result.ui_iot_context) && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {result.ui_weather_context && (
              <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
                    Weather Context
                  </p>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200">
                    {result.ui_weather_context.source || "Open-Meteo"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-white">
                  {result.ui_weather_context.location || "Selected location"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <span>Temperature: <b className="text-slate-200">{result.ui_weather_context.temperature === undefined ? "N/A" : `${formatNumber(result.ui_weather_context.temperature, 1)}°C`}</b></span>
                  <span>Humidity: <b className="text-slate-200">{result.ui_weather_context.humidity === undefined ? "N/A" : `${formatNumber(result.ui_weather_context.humidity, 1)}%`}</b></span>
                  <span>Feels Like: <b className="text-slate-200">{result.ui_weather_context.apparent_temperature === undefined ? "N/A" : `${formatNumber(result.ui_weather_context.apparent_temperature, 1)}°C`}</b></span>
                  <span>Wind: <b className="text-slate-200">{result.ui_weather_context.wind_speed_kmh === undefined ? "N/A" : `${formatNumber(result.ui_weather_context.wind_speed_kmh, 1)} km/h`}</b></span>
                </div>
              </div>
            )}

            {result.ui_iot_context && (
              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-300">
                    IoT Sensor Context
                  </p>
                  <span className="rounded-full border border-violet-400/20 bg-violet-400/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-violet-200">
                    {result.ui_iot_context.source || "IoT Sensor Simulator"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-white">
                  Sensor reading
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <span>Temperature: <b className="text-slate-200">{result.ui_iot_context.temperature === undefined ? "N/A" : `${formatNumber(result.ui_iot_context.temperature, 1)}°C`}</b></span>
                  <span>Humidity: <b className="text-slate-200">{result.ui_iot_context.humidity === undefined ? "N/A" : `${formatNumber(result.ui_iot_context.humidity, 1)}%`}</b></span>
                  <span className="col-span-2">Storage: <b className="text-slate-200">{formatStorageMethod(result.ui_iot_context.storage_method)}</b></span>
                </div>
              </div>
            )}
          </div>
        )}

        {result.ui_environment_note && (
          <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Input precedence
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {result.ui_environment_note}
            </p>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                Environmental Risk
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {environmentalRisk === undefined
                  ? "No environmental signal available."
                  : `${environmentalRisk}% — ${environmentRiskLabel(environmentRiskLevel)}`}
              </p>
            </div>

            <div className="w-full sm:max-w-xs">
              <ProgressBar
                value={environmentalRisk}
                tone={environmentalRisk !== undefined && environmentalRisk >= 70 ? "red" : "emerald"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* FRESHNESS BREAKDOWN */}
      <div className="border-t border-white/5 p-5 sm:p-7">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.17em] text-violet-300">
            Visual Signal Breakdown
          </p>
          <h4 className="mt-1 text-xl font-black text-white">
            What the vision system observed
          </h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <BreakdownItem
            title="Visual Quality"
            value={result.visual_quality ?? breakdown?.visual_quality}
          />
          <BreakdownItem
            title="Color Condition"
            value={result.color_condition ?? breakdown?.color_condition}
          />
          <BreakdownItem
            title="Texture Indicators"
            value={result.texture_indicators ?? breakdown?.texture_indicators}
          />
          <BreakdownItem
            title="Spots / Defects"
            value={result.spots_defects ?? breakdown?.spots_defects}
            danger
          />
          <BreakdownItem
            title="Environmental Risk"
            value={result.environmental_risk ?? breakdown?.environmental_risk}
            danger
          />
        </div>
      </div>

      {/* WHY */}
      <div className="border-t border-white/5 p-5 sm:p-7">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.17em] text-amber-300">
            Explainable AI
          </p>
          <h4 className="mt-1 text-xl font-black text-white">
            Why this prediction?
          </h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            The system combines visual evidence, freshness assessment,
            environment and food age to explain the generated estimate.
          </p>
        </div>

        <div className="mb-4 rounded-2xl border border-white/5 bg-slate-950/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
            Main Risk Factor
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {result.explainability?.main_risk_factor ||
              result.main_risk_factor ||
              "Visual condition"}
          </p>
        </div>

        {result.explainability?.factors?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {result.explainability.factors.map((factor, index) => (
              <div
                key={`${factor.factor}-${index}`}
                className="rounded-2xl border border-white/5 bg-slate-950/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {factor.category || "Factor"}
                  </span>
                  <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-400">
                    {factor.impact || "Context"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {factor.factor || "No detail provided."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No detailed explainability factors returned.
          </p>
        )}
      </div>

      <GradCamCard
        imageUrl={imageUrl}
        gradcam={result.explainability?.gradcam}
      />

      {/* MODEL TRANSPARENCY */}
      <div className="border-t border-white/5 p-5 sm:p-7">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.17em] text-sky-300">
            Model Transparency
          </p>
          <h4 className="mt-1 text-xl font-black text-white">
            How FreshLens produced this result
          </h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            title="Food Detection"
            text={`${foodName} • ${formatPercent(
              result.food_confidence ?? result.food_identification_confidence
            )} confidence`}
            icon="👁"
          />
          <InsightCard
            title="Local Model Signal"
            text={`${localAssessment} • ${formatPercent(
              result.local_model_confidence
            )} model confidence`}
            tone={localModelDiffersFromFinal ? "yellow" : "default"}
            icon="🧠"
          />
          <InsightCard
            title="Gemini Vision"
            text={
              result.gemini_used
                ? `Used • ${result.gemini_model || "configured model"}`
                : "Not used • local fallback"
            }
            tone={result.gemini_used ? "emerald" : "default"}
            icon="✨"
          />
          <InsightCard
            title="Context Supplied"
            text={
              result.ui_weather_context && result.ui_iot_context
                ? "image + IoT + weather + environment"
                : result.ui_weather_context
                  ? "image + weather + environment"
                  : result.multimodal_mode || "image_only"
            }
            icon="◈"
          />
          <InsightCard
            title="Shelf-Life Model"
            text={`${shelfModel} • ${shelfModelFoodType}`}
            tone={shelfModel.toLowerCase().includes("xgboost") ? "emerald" : "default"}
            icon="⏳"
          />
        </div>

        {localModelDiffersFromFinal && (
          <div className="mt-4 rounded-2xl border border-yellow-500/15 bg-yellow-500/[0.03] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-yellow-300">
              Fusion note
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              The local freshness model produced a different supporting signal ({localAssessment}).
              The final assessment above is the fused result from the available AI and environmental inputs.
            </p>
          </div>
        )}

        {shelfModel.toLowerCase().includes("xgboost") && (
          <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300">
                  XGBoost validation
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Dataset-level evaluation metrics; these are not per-image confidence probabilities.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                <div className="rounded-xl bg-slate-950/80 px-3 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                    MAE
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-200">
                    {shelfMae === undefined ? "N/A" : `${formatNumber(shelfMae, 2)} d`}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/80 px-3 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                    RMSE
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-200">
                    {shelfRmse === undefined ? "N/A" : `${formatNumber(shelfRmse, 2)} d`}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/80 px-3 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                    R²
                  </p>
                  <p className="mt-1 text-sm font-black text-emerald-300">
                    {shelfR2 === undefined ? "N/A" : formatNumber(shelfR2, 3)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VISUAL SIGNS */}
      <div className="border-t border-white/5 p-5 sm:p-7">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.17em] text-emerald-300">
            Visual Evidence
          </p>
          <h4 className="mt-1 text-xl font-black text-white">
            Signs detected in the image
          </h4>
        </div>

        {result.visual_signs?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {result.visual_signs.map((sign, index) => (
              <div
                key={`${sign}-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-950/50 p-4"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-sm text-emerald-300">
                  ✓
                </span>
                <p className="text-sm leading-6 text-slate-300">{sign}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No detailed visual signs returned.
          </p>
        )}
      </div>

      {/* RECOMMENDATION */}
      <div className="border-t border-white/5 p-5 sm:p-7">
        <div className="rounded-[1.75rem] border border-emerald-500/15 bg-emerald-500/[0.04] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl">
              💡
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.17em] text-emerald-300">
                Smart Recommendation
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {result.recommendation ||
                  "Follow appropriate storage practices and monitor the food before consumption."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="border-t border-yellow-500/10 bg-yellow-500/[0.02] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.17em] text-yellow-300">
              Research / Prototype Estimate
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              {result.safety_disclaimer ||
                "Freshness, shelf-life and spoilage probability are AI-based research/prototype estimates. They are not a food-safety guarantee and should not replace professional food-safety guidance."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function environmentRiskLabel(value: string): string {
  const lower = value.toLowerCase();

  if (lower.includes("high")) return "High";
  if (lower.includes("medium")) return "Medium";
  if (lower.includes("low")) return "Low";
  return "Very Low";
}


function Scan() {
  const [images, setImages] =
    useState<SelectedImage[]>([]);

  const [batchResults, setBatchResults] =
    useState<BatchResult[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [error, setError] =
    useState("");

  const [isDragging, setIsDragging] =
    useState(false);

  const [cameraOpen, setCameraOpen] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  // Environment stays blank initially.
  const [temperature, setTemperature] =
    useState("");

  const [humidity, setHumidity] =
    useState("");

  const [storageMethod, setStorageMethod] =
    useState("");

  const [ageDays, setAgeDays] =
    useState("");

  const [liveWeather, setLiveWeather] =
    useState<LiveWeather | null>(null);

  const [weatherLocationId, setWeatherLocationId] =
    useState(DEFAULT_WEATHER_LOCATION.id);

  const selectedWeatherLocation =
    WEATHER_LOCATIONS.find(
      (location) =>
        location.id === weatherLocationId
    ) || DEFAULT_WEATHER_LOCATION;

  const [weatherLoading, setWeatherLoading] =
    useState(false);

  const [weatherError, setWeatherError] =
    useState("");

  const [iotReading, setIotReading] =
    useState<IoTSensorReading | null>(null);

  const [iotLoading, setIotLoading] =
    useState(false);

  const [iotError, setIotError] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const cameraInputRef =
    useRef<HTMLInputElement>(null);

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const cameraStreamRef =
    useRef<MediaStream | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  // ==========================================================
  // CREATE SELECTED IMAGE
  // ==========================================================

  const createSelectedImage =
    useCallback(
      (
        file: File,
        source: "upload" | "camera"
      ): SelectedImage => ({
        id:
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`,
        file,
        preview:
          URL.createObjectURL(file),
        source,
      }),
      []
    );

  // ==========================================================
  // VALIDATE FILE
  // ==========================================================

  const validateFile =
    useCallback(
      (file: File): string | null => {
        if (
          !file.type.startsWith("image/")
        ) {
          return "Please select a valid JPG, PNG or WEBP image.";
        }

        if (
          file.size > MAX_FILE_SIZE
        ) {
          return "Image is too large. Please select an image below 10 MB.";
        }

        return null;
      },
      []
    );

  // ==========================================================
  // ADD FILES
  // ==========================================================

  const addFiles =
    useCallback(
      (
        fileList: FileList | File[] | undefined,
        source: "upload" | "camera" = "upload"
      ) => {
        if (!fileList) return;

        const incoming = Array.from(
          fileList
        );

        if (!incoming.length) {
          return;
        }

        const remainingSlots =
          Math.max(
            0,
            MAX_IMAGES - images.length
          );

        if (
          remainingSlots === 0
        ) {
          setError(
            `You can scan up to ${MAX_IMAGES} images at once.`
          );
          return;
        }

        const accepted: SelectedImage[] = [];
        const errors: string[] = [];

        for (
          const file of incoming.slice(
            0,
            remainingSlots
          )
        ) {
          const validationError =
            validateFile(file);

          if (validationError) {
            errors.push(
              `${file.name}: ${validationError}`
            );
            continue;
          }

          accepted.push(
            createSelectedImage(
              file,
              source
            )
          );
        }

        if (
          accepted.length
        ) {
          setImages(
            (previous) => [
              ...previous,
              ...accepted,
            ]
          );

          setBatchResults([]);
          setError(
            errors.join(" ")
          );
        } else if (
          errors.length
        ) {
          setError(
            errors.join(" ")
          );
        }
      },
      [
        createSelectedImage,
        images.length,
        validateFile,
      ]
    );

  // ==========================================================
  // FILE INPUT
  // ==========================================================

  const handleImageChange =
    (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      if(!event.target.files){
        return;
      }
      addFiles(
        event.target.files,
        "upload"
      );

      event.target.value = "";
    };

  // ==========================================================
  // REMOVE SINGLE IMAGE
  // ==========================================================

  const removeImage =
    (id: string) => {
      setImages((previous) => {
        const target =
          previous.find(
            (item) => item.id === id
          );

        if (target) {
          URL.revokeObjectURL(
            target.preview
          );
        }

        return previous.filter(
          (item) => item.id !== id
        );
      });

      setBatchResults((previous) =>
        previous.filter(
          (item) => item.id !== id
        )
      );

      setError("");
    };

  // ==========================================================
  // REMOVE ALL
  // ==========================================================

  const clearAllImages =
    () => {
      images.forEach((item) =>
        URL.revokeObjectURL(
          item.preview
        )
      );

      setImages([]);
      setBatchResults([]);
      setCurrentIndex(0);
      setError("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

  // ==========================================================
  // DRAG EVENTS
  // ==========================================================

  const handleDragOver =
    (
      event: React.DragEvent<HTMLDivElement>
    ) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    };

  const handleDragLeave =
    (
      event: React.DragEvent<HTMLDivElement>
    ) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
    };

  const handleDrop =
    (
      event: React.DragEvent<HTMLDivElement>
    ) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      addFiles(
        event.dataTransfer.files,
        "upload"
      );
    };

  // ==========================================================
  // STOP CAMERA
  // ==========================================================

  const stopCamera =
    useCallback(() => {
      const stream =
        cameraStreamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }

      cameraStreamRef.current =
        null;

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject =
          null;
      }

      setCameraOpen(false);
    }, []);

  // ==========================================================
  // ATTACH CAMERA STREAM
  // ==========================================================

  useEffect(() => {
    if (
      cameraOpen &&
      videoRef.current &&
      cameraStreamRef.current
    ) {
      videoRef.current.srcObject =
        cameraStreamRef.current;

      videoRef.current
        .play()
        .catch(() => {
          // Browser may delay autoplay until permission/user gesture.
        });
    }
  }, [cameraOpen]);

  // ==========================================================
  // OPEN CAMERA
  // ==========================================================

  const openCamera =
    async () => {
      setCameraError("");
      setError("");

      if (
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError(
          "Camera is not supported by this browser."
        );
        return;
      }

      try {
        stopCamera();

        // Set UI open first so the video element exists before
        // the stream is attached.
        setCameraOpen(true);

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal: "environment",
                },
                width: {
                  ideal: 1280,
                },
                height: {
                  ideal: 720,
                },
              },
              audio: false,
            }
          );

        cameraStreamRef.current =
          stream;

        // Attach immediately as well as via effect.
        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;
          await videoRef.current.play();
        }
      } catch (cameraOpenError) {
        console.error(
          "Camera error:",
          cameraOpenError
        );

        cameraStreamRef.current =
          null;

        setCameraOpen(false);

        setCameraError(
          "Unable to access the camera. Please allow camera permission and try again."
        );
      }
    };

  // ==========================================================
  // CAMERA CAPTURE
  // ==========================================================

  const capturePhoto =
    () => {
      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      if (
        !video ||
        !canvas ||
        video.readyState < 2 ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        setCameraError(
          "Camera preview is not ready yet. Wait a moment and try again."
        );
        return;
      }

      canvas.width =
        video.videoWidth;
      canvas.height =
        video.videoHeight;

      const context =
        canvas.getContext("2d");

      if (!context) {
        setCameraError(
          "Unable to capture camera frame."
        );
        return;
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setCameraError(
              "Unable to create captured image."
            );
            return;
          }

          const file =
            new File(
              [blob],
              `freshlens-camera-${Date.now()}.jpg`,
              {
                type: "image/jpeg",
              }
            );

          addFiles(
            [file],
            "camera"
          );

          setCameraError("");
        },
        "image/jpeg",
        0.92
      );
    };

  // ==========================================================
  // CAMERA CLEANUP
  // ==========================================================

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      images.forEach((item) =>
        URL.revokeObjectURL(
          item.preview
        )
      );
    };
  }, []);

  // ==========================================================
  // LIVE WEATHER
  // ==========================================================

  const loadLiveWeather =
    async () => {
      setWeatherLoading(true);
      setWeatherError("");

      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        8_000
      );

      try {
        const response = await fetch(
          `${WEATHER_API_URL}?latitude=${selectedWeatherLocation.latitude}&longitude=${selectedWeatherLocation.longitude}`,
          {
            signal: controller.signal,
          }
        );

        const contentType =
          response.headers.get("content-type") || "";

        let data: WeatherApiResponse = {};

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error(
            "Weather service returned an invalid response."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              `Weather request failed with status ${response.status}.`
          );
        }

        const weather = data.weather;

        if (
          !weather ||
          !Number.isFinite(Number(weather.temperature)) ||
          !Number.isFinite(Number(weather.humidity))
        ) {
          throw new Error(
            "Live weather data was incomplete or unavailable."
          );
        }

        setLiveWeather(weather);
        setTemperature(String(weather.temperature));
        setHumidity(String(weather.humidity));
      } catch (weatherFetchError) {
        console.error(
          "FreshLens live weather error:",
          weatherFetchError
        );

        if (
          weatherFetchError instanceof DOMException &&
          weatherFetchError.name === "AbortError"
        ) {
          setWeatherError(
            "Weather request timed out. Please try again."
          );
        } else {
          setWeatherError(
            weatherFetchError instanceof Error
              ? weatherFetchError.message
              : "Unable to load live weather."
          );
        }
      } finally {
        window.clearTimeout(timeout);
        setWeatherLoading(false);
      }
    };

  // ==========================================================
  // SIMULATE IOT SENSOR
  // ==========================================================

  const simulateIoTSensor =
    async () => {
      setIotLoading(true);
      setIotError("");

      try {
        const response = await fetch(
          IOT_API_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              temperature: 28.5,
              humidity: 78,
              storage_method: "room_temperature",
            }),
          }
        );

        const contentType =
          response.headers.get("content-type") || "";

        let data: IoTApiResponse = {};

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error(
            "IoT sensor returned an invalid response."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              `IoT sensor request failed with status ${response.status}.`
          );
        }

        const sensor = data.sensor;

        if (
          !sensor ||
          !Number.isFinite(Number(sensor.temperature)) ||
          !Number.isFinite(Number(sensor.humidity))
        ) {
          throw new Error(
            "IoT sensor data was incomplete or unavailable."
          );
        }

        setIotReading(sensor);

        // Mirror the simulated sensor values into the visible
        // environmental inputs so the user can see exactly what
        // the analysis is receiving.
        setTemperature(String(sensor.temperature));
        setHumidity(String(sensor.humidity));
        setStorageMethod(sensor.storage_method || "unknown");
      } catch (iotFetchError) {
        console.error(
          "FreshLens IoT sensor error:",
          iotFetchError
        );

        setIotError(
          iotFetchError instanceof Error
            ? iotFetchError.message
            : "Unable to simulate IoT sensor."
        );
      } finally {
        setIotLoading(false);
      }
    };

  // ==========================================================
  // HANDLE ANALYZE ONE IMAGE
  // ==========================================================

  const analyzeOne =
    async (
      item: SelectedImage
    ): Promise<AnalysisResult> => {
      const formData =
        new FormData();

      formData.append(
        "image",
        item.file
      );

      // When an IoT reading is active, send the sensor payload
      // as the primary environmental source. Manual values are
      // still used when no IoT reading is active.
      if (!iotReading && temperature.trim()) {
        formData.append(
          "temperature",
          temperature.trim()
        );
      }

      if (!iotReading && humidity.trim()) {
        formData.append(
          "humidity",
          humidity.trim()
        );
      }

      if (
        storageMethod.trim()
      ) {
        formData.append(
          "storage_method",
          storageMethod.trim()
        );
      }

      if (
        ageDays.trim()
      ) {
        const days = Number(ageDays);
        formData.append(
          "age_days",
          String(days)
        );
        formData.append(
          "age_hours",
          String(days * 24)
        );
      }

      if (liveWeather) {
        formData.append(
          "weather_data",
          JSON.stringify({
            ...liveWeather,
            source: "Open-Meteo",
            location: selectedWeatherLocation.name,
            latitude: selectedWeatherLocation.latitude,
            longitude: selectedWeatherLocation.longitude,
          })
        );
      }

      if (iotReading) {
        formData.append(
          "iot_data",
          JSON.stringify({
            ...iotReading,
            source: "IoT Sensor Simulator",
          })
        );
      }

      const controller =
        new AbortController();

      const timeout =
        window.setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT
        );

      try {
        const response =
          await fetch(
            API_URL,
            {
              method: "POST",
              body: formData,
              signal:
                controller.signal,
            }
          );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        let data: ApiResponse = {};

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          data =
            await response.json();
        } else {
          const text =
            await response.text();

          throw new Error(
            text
              ? `Unexpected server response: ${text.slice(
                  0,
                  250
                )}`
              : "Server returned an invalid response."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              data.message ||
              `Analysis failed with status ${response.status}.`
          );
        }

        if (
          !data.success ||
          !data.result
        ) {
          throw new Error(
            data.detail ||
              "The AI analysis did not return a valid result."
          );
        }

        const serverResult = data.result;

        const enrichedResult: AnalysisResult = {
          ...serverResult,
          ui_weather_context: liveWeather
            ? {
                location: selectedWeatherLocation.name,
                latitude: selectedWeatherLocation.latitude,
                longitude: selectedWeatherLocation.longitude,
                temperature: liveWeather.temperature,
                humidity: liveWeather.humidity,
                apparent_temperature: liveWeather.apparent_temperature,
                wind_speed_kmh: liveWeather.wind_speed_kmh,
                source: "Open-Meteo",
              }
            : undefined,
          ui_iot_context: iotReading
            ? {
                temperature: iotReading.temperature,
                humidity: iotReading.humidity,
                storage_method: iotReading.storage_method,
                source: "IoT Sensor Simulator",
              }
            : undefined,
          ui_environment_note:
            liveWeather && iotReading
              ? "The IoT sensor reading is the primary numeric environment input for the current analysis; live weather is preserved and supplied as supplementary environmental context."
              : liveWeather
                ? "The selected live-weather reading supplies the environment context for this analysis."
                : iotReading
                  ? "The IoT sensor reading supplies the environment context for this analysis."
                  : undefined,
          multimodal_mode:
            liveWeather && iotReading
              ? "image + IoT + weather + environment"
              : serverResult.multimodal_mode,
        };

        return enrichedResult;
      } finally {
        window.clearTimeout(
          timeout
        );
      }
    };

  // ==========================================================
  // ANALYZE ALL
  // ==========================================================

  const handleAnalyze =
    async () => {
      if (
        !images.length ||
        loading
      ) {
        if (!images.length) {
          setError(
            "Please upload or capture at least one food image."
          );
        }
        return;
      }

      if (
        temperature.trim() &&
        !Number.isFinite(
          Number(temperature)
        )
      ) {
        setError(
          "Temperature must be a valid number."
        );
        return;
      }

      if (
        humidity.trim()
      ) {
        const value =
          Number(humidity);

        if (
          !Number.isFinite(value) ||
          value < 0 ||
          value > 100
        ) {
          setError(
            "Humidity must be between 0% and 100%."
          );
          return;
        }
      }

      if (
        ageDays.trim()
      ) {
        const value =
          Number(ageDays);

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          setError(
            "Food age must be zero or a positive number."
          );
          return;
        }
      }

      setLoading(true);
      setError("");
      setBatchResults([]);
      setCurrentIndex(0);

      try {
        const results: BatchResult[] = [];

        for (
          let index = 0;
          index < images.length;
          index += 1
        ) {
          const item =
            images[index];

          setCurrentIndex(
            index + 1
          );

          const result =
            await analyzeOne(item);

          const batchResult = {
            id: item.id,
            fileName:
              item.file.name,
            result,
          };

          results.push(
            batchResult
          );

          setBatchResults(
            [...results]
          );

          saveToHistory(
            result
          );
        }
      } catch (analysisError) {
        console.error(
          "FreshLens batch analysis error:",
          analysisError
        );

        if (
          analysisError instanceof
            DOMException &&
          analysisError.name ===
            "AbortError"
        ) {
          setError(
            "Analysis timed out. Please check that FastAPI and the AI models are running."
          );
        } else if (
          analysisError instanceof
          TypeError
        ) {
          setError(
            `Cannot connect to FreshLens AI. Make sure FastAPI is running on ${API_URL}.`
          );
        } else {
          setError(
            analysisError instanceof
              Error
              ? analysisError.message
              : "Something went wrong while analyzing the images."
          );
        }
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================
  // DERIVED
  // ==========================================================

  const previewStorage =
    storageMethod
      ? formatStorageMethod(
          storageMethod
        )
      : "Unknown";

  const latestResults =
    useMemo(
      () => batchResults,
      [batchResults]
    );

  // ==========================================================
  // UI
  // ==========================================================

  const stage =
    latestResults.length > 0
      ? 4
      : loading
        ? 3
        : images.length > 0
          ? 2
          : 1;

  const stageItems = [
    { number: 1, label: "Upload" },
    { number: 2, label: "Configure" },
    { number: 3, label: "Analyze" },
    { number: 4, label: "Results" },
  ];

  return (
    <main className="min-h-screen bg-[#020617] px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* HERO */}
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/20 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-cyan-400/5 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  AI Food Intelligence
                </span>
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                Understand your food
                <span className="block text-emerald-300">
                  before it becomes a problem.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Upload food images, add optional storage conditions, and let
                FreshLens combine vision models with environmental intelligence
                to estimate freshness, spoilage risk and remaining shelf life.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Vision AI",
                  "Gemini reasoning",
                  "Environmental context",
                  "Shelf-life estimation",
                  "Explainable results",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-400"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/5 bg-black/20 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-slate-500">
                Scan workflow
              </p>

              <div className="mt-5 space-y-3">
                {stageItems.map((item, index) => {
                  const complete = stage >= item.number;
                  const active = stage === item.number;

                  return (
                    <div key={item.number} className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-black ${
                          complete
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-white/[0.03] text-slate-600"
                        }`}
                      >
                        {complete && !active ? "✓" : item.number}
                      </div>

                      <div className="flex-1">
                        <p
                          className={`text-xs font-bold ${
                            active ? "text-white" : "text-slate-500"
                          }`}
                        >
                          {item.label}
                        </p>
                      </div>

                      {index < stageItems.length - 1 && (
                        <div
                          className={`hidden h-px w-6 sm:block ${
                            stage > item.number
                              ? "bg-emerald-400/40"
                              : "bg-white/5"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* MAIN SCAN WORKSPACE */}
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-7">
          {/* UPLOAD */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative overflow-hidden rounded-[1.75rem] border-2 border-dashed transition ${
              isDragging
                ? "border-emerald-300 bg-emerald-400/5"
                : "border-white/10 bg-slate-950/60 hover:border-emerald-500/25"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.07),transparent_45%)]" />

            <div className="relative flex min-h-[310px] flex-col items-center justify-center px-5 py-10 text-center sm:min-h-[360px]">
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-[1.6rem] border ${
                  isDragging
                    ? "border-emerald-300/30 bg-emerald-400/10"
                    : "border-white/10 bg-white/[0.03]"
                } text-3xl shadow-2xl`}
              >
                {isDragging ? "📥" : "✦"}
              </div>

              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                {isDragging ? "Release to upload" : "Start a new analysis"}
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                {isDragging ? "Drop food images here" : "Upload your food"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Add up to {MAX_IMAGES} images. Use drag & drop, choose files,
                or capture a fresh frame from your camera.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Choose Images
                </button>

                <button
                  type="button"
                  onClick={openCamera}
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black text-white transition hover:border-emerald-400/30 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  📷 Open Camera
                </button>
              </div>

              <p className="mt-4 text-[11px] font-medium text-slate-600">
                JPG, PNG or WEBP • Max 10 MB per image
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* CAMERA */}
          {cameraOpen && (
            <div className="mt-5 rounded-[1.75rem] border border-emerald-500/15 bg-slate-950/70 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-emerald-300">
                    Live Camera
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Center the food and keep the subject well lit.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-lg border border-white/5 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-white/[0.03] hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="block min-h-[260px] w-full object-cover sm:min-h-[420px]"
                />
              </div>

              {cameraError && (
                <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                  <p className="text-xs font-semibold text-red-300">
                    ⚠️ {cameraError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={capturePhoto}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                📸 Capture & Add
              </button>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* SELECTED IMAGES */}
          {images.length > 0 && (
            <div className="mt-7">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-emerald-300">
                      Selected Foods
                    </p>
                    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                      {images.length}/{MAX_IMAGES}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Each image will be analyzed individually.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearAllImages}
                  disabled={loading}
                  className="w-fit rounded-lg border border-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/5 disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {images.map((item, index) => {
                  const itemResult = batchResults.find(
                    (entry) => entry.id === item.id
                  );

                  return (
                    <div
                      key={item.id}
                      className="group overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60 transition hover:border-emerald-500/20"
                    >
                      <div className="relative aspect-square overflow-hidden bg-black">
                        <img
                          src={item.preview}
                          alt={`Selected food ${index + 1}`}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />

                        <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                          #{index + 1}
                        </div>

                        {item.source === "camera" && (
                          <div className="absolute bottom-3 left-3 rounded-full bg-emerald-400/90 px-2.5 py-1 text-[10px] font-black text-slate-950">
                            Camera
                          </div>
                        )}

                        {itemResult && (
                          <div className="absolute right-3 top-3">
                            <StatusPill status={getStatus(itemResult.result)} />
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <p className="truncate text-sm font-bold text-slate-200">
                          {item.file.name}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-600">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {itemResult ? (
                          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-600">
                              Analysis
                            </p>
                            <p className="mt-1.5 font-black text-emerald-300">
                              {getFoodName(itemResult.result)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatNumber(
                                getFreshnessScore(itemResult.result)
                              )}
                              /100 freshness
                            </p>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                            <p className="text-xs text-slate-600">
                              Ready for analysis
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => removeImage(item.id)}
                          disabled={loading}
                          className="mt-3 w-full rounded-xl border border-white/5 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-300 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ENVIRONMENT */}
          <div className="mt-7 rounded-[1.75rem] border border-white/5 bg-slate-950/60 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-300">
                  Environmental Intelligence
                </p>
                <h3 className="mt-1 text-xl font-black text-white">
                  Add storage context
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Optional • applied to all selected images
              </p>
            </div>

            {/* LIVE WEATHER */}
            <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                      Live Weather
                    </p>
                    {liveWeather && (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-emerald-300">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Fetch current environmental conditions from Open-Meteo for the selected demo location.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[210px]">
                  <label
                    htmlFor="weather-location"
                    className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-600"
                  >
                    Weather Location
                  </label>
                  <select
                    id="weather-location"
                    value={weatherLocationId}
                    onChange={(event) => {
                      setWeatherLocationId(event.target.value);
                      setLiveWeather(null);
                      setWeatherError("");
                    }}
                    disabled={weatherLoading || loading}
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-xs font-bold text-white outline-none transition focus:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {WEATHER_LOCATIONS.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={loadLiveWeather}
                  disabled={weatherLoading || loading}
                  className="shrink-0 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-xs font-black text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {weatherLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
                      Loading weather...
                    </span>
                  ) : (
                    "☁ Load Live Weather"
                  )}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-600">
                <span>Location: {selectedWeatherLocation.name}</span>
                <span>Coordinates: {selectedWeatherLocation.latitude}, {selectedWeatherLocation.longitude}</span>
                <span>Source: Open-Meteo</span>
              </div>

              {liveWeather && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">
                      Temperature
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {formatNumber(liveWeather.temperature, 1)}°C
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">
                      Humidity
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {formatNumber(liveWeather.humidity, 1)}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">
                      Feels Like
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {liveWeather.apparent_temperature === undefined
                        ? "N/A"
                        : `${formatNumber(liveWeather.apparent_temperature, 1)}°C`}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">
                      Wind
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {liveWeather.wind_speed_kmh === undefined
                        ? "N/A"
                        : `${formatNumber(liveWeather.wind_speed_kmh, 1)} km/h`}
                    </p>
                  </div>
                </div>
              )}

              {weatherError && (
                <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                  <p className="text-xs font-semibold text-red-300">
                    ⚠️ {weatherError}
                  </p>
                </div>
              )}
            </div>

            {/* IOT SENSOR SIMULATOR */}
            <div className="mt-5 rounded-2xl border border-violet-500/15 bg-violet-500/[0.03] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
                      IoT Sensor Simulator
                    </p>
                    {iotReading && (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-emerald-300">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Simulated temperature and humidity readings are sent to the IoT endpoint and can be fused into the food analysis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={simulateIoTSensor}
                  disabled={iotLoading || loading}
                  className="shrink-0 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-xs font-black text-violet-200 transition hover:border-violet-300/30 hover:bg-violet-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {iotLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-transparent" />
                      Reading sensor...
                    </span>
                  ) : (
                    "◈ Simulate Sensor Reading"
                  )}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-600">
                <span>Endpoint: /api/iot/sensor</span>
                <span>Source: Software IoT Simulator</span>
              </div>

              {iotReading && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">
                      Sensor Temperature
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {formatNumber(iotReading.temperature, 1)}°C
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">
                      Sensor Humidity
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {formatNumber(iotReading.humidity, 1)}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">
                      Storage Context
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {formatStorageMethod(iotReading.storage_method)}
                    </p>
                  </div>
                </div>
              )}

              {iotError && (
                <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                  <p className="text-xs font-semibold text-red-300">
                    ⚠️ {iotError}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Temperature
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(event) => setTemperature(event.target.value)}
                    placeholder="e.g. 29.4"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 pr-12 text-sm font-semibold text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/40"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
                    °C
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Humidity
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={humidity}
                    onChange={(event) => setHumidity(event.target.value)}
                    placeholder="e.g. 71"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 pr-12 text-sm font-semibold text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/40"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
                    %
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Storage Method
                </span>
                <select
                  value={storageMethod}
                  onChange={(event) => setStorageMethod(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:border-emerald-400/40"
                >
                  <option value="">Select storage</option>
                  <option value="room_temperature">Room Temperature</option>
                  <option value="refrigerated">Refrigerator</option>
                  <option value="freezer">Freezer</option>
                  <option value="pantry">Pantry</option>
                  <option value="counter">Counter</option>
                  <option value="cool_dry_place">Cool / Dry Place</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Food Age
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={ageDays}
                    onChange={(event) => setAgeDays(event.target.value)}
                    placeholder="e.g. 2"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 pr-14 text-sm font-semibold text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/40"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
                    days
                  </span>
                </div>
              </label>
            </div>

            {/* CONTEXT PREVIEW */}
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Temperature",
                  value: temperature ? `${temperature}°C` : "Unknown",
                  icon: "🌡",
                },
                {
                  label: "Humidity",
                  value: humidity ? `${humidity}%` : "Unknown",
                  icon: "💧",
                },
                {
                  label: "Storage",
                  value: previewStorage,
                  icon: "📦",
                },
                {
                  label: "Age",
                  value: ageDays ? `${ageDays} days` : "Unknown",
                  icon: "🕒",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.icon}</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                      {item.label}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-300">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/15 bg-red-500/5 p-4">
              <p className="text-sm font-semibold text-red-300">⚠️ {error}</p>
            </div>
          )}

          {/* ANALYZE CTA */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || images.length === 0}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_14px_40px_rgba(52,211,153,0.12)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="absolute inset-0 translate-y-full bg-white/20 transition duration-500 group-hover:translate-y-0" />

              <span className="relative flex items-center gap-3">
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    Analyzing {currentIndex}/{images.length}
                  </>
                ) : (
                  <>
                    <span className="text-base">✦</span>
                    Analyze {images.length || ""} Food
                    {images.length === 1 ? "" : "s"}
                  </>
                )}
              </span>
            </button>

            {loading && (
              <div className="mt-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      8,
                      (currentIndex / Math.max(images.length, 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        </section>

        {/* RESULTS */}
        {latestResults.length > 0 && (
          <section className="mt-10">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Analysis Complete
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-white">
                  Your AI scan results
                </h2>
              </div>

              <div className="rounded-full border border-white/5 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-500">
                {latestResults.length} completed
              </div>
            </div>

            <div className="space-y-5">
              {latestResults.map((entry, index) => {
                const selected = images.find((item) => item.id === entry.id);

                return (
                  <div key={entry.id}>
                    <div className="mb-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">
                          Image {index + 1}
                        </span>
                        <p className="min-w-0 truncate text-xs font-semibold text-slate-600">
                          {entry.fileName}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          downloadAnalysisReport(
                            entry.result,
                            entry.fileName,
                            index + 1
                          )
                        }
                        disabled={loading}
                        className="shrink-0 self-start rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-3.5 py-2 text-xs font-black text-emerald-200 transition hover:border-emerald-300/25 hover:bg-emerald-400/[0.10] disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
                      >
                        ↓ Download Report
                      </button>
                    </div>

                    <ResultCard
                      result={entry.result}
                      imageUrl={selected?.preview}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="mt-12 border-t border-white/5 pt-8 text-center">
          <p className="text-xs leading-6 text-slate-600">
            FreshLens AI provides AI-based visual and environmental estimates
            of food freshness. Results are for research and informational
            purposes and should not replace professional food-safety guidance.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default Scan;

