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

// ============================================================
// CONSTANTS
// ============================================================

const API_URL =
  "http://127.0.0.1:8000/api/analysis/analyze";

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
  return (
    normalizePercent(result.spoilage_probability) ??
    normalizePercent(result.spoilage_probability_percent) ??
    normalizePercent(result.spoilage?.probability)
  );
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

  if (days !== undefined) {
    return days;
  }

  const hours = toNumber(result.age_hours);

  return hours !== undefined
    ? hours / 24
    : undefined;
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
      spoilageProbability: formatPercent(
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

// ============================================================
// PRESENTATION COMPONENTS
// ============================================================

function BreakdownCard({
  title,
  value,
  danger = false,
}: {
  title: string;
  value?: number | string;
  danger?: boolean;
}) {
  const number = toNumber(value);
  const percentage = clamp(number ?? 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          {title}
        </p>
        <p
          className={
            danger
              ? "font-semibold text-red-400"
              : "font-semibold text-slate-200"
          }
        >
          {number === undefined
            ? "N/A"
            : `${formatNumber(number)}%`}
        </p>
      </div>

      {number !== undefined && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full ${
              danger
                ? "bg-red-500"
                : "bg-emerald-500"
            }`}
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      )}
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
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-red-400">
        {number === undefined
          ? "N/A"
          : `${Math.round(percentage)}%`}
      </p>

      {number !== undefined && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-700"
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
}: {
  result: AnalysisResult;
}) {
  const breakdown =
    result.freshness_breakdown ||
    result.visual_breakdown ||
    result.breakdown;

  const score =
    getFreshnessScore(result);
  const confidence =
    getConfidence(result);
  const spoilage =
    getSpoilageProbability(result);

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

  const forecast =
    result.spoilage_forecast;

  const shelfConfidence =
    typeof shelf === "object" && shelf
      ? shelf.confidence
      : undefined;

  const shelfRange =
    typeof shelf === "object" && shelf
      ? shelf.likely_range ||
        shelf.range
      : undefined;

  const ageDays = getAgeDays(result);

  return (
    <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            AI Analysis Complete
          </p>
          <h3 className="mt-2 text-2xl font-bold">
            {foodName}
          </h3>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${tone.badge}`}
        >
          {status}
        </span>
      </div>

      {/* MAIN STATS */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-sm text-slate-500">
            Freshness Score
          </p>
          <p className={`mt-2 text-3xl font-bold ${tone.text}`}>
            {formatNumber(score)}
            <span className="text-base text-slate-600">
              /100
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-sm text-slate-500">
            AI Confidence
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {formatPercent(confidence)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-sm text-slate-500">
            Spoilage Probability
          </p>
          <p className="mt-2 text-3xl font-bold text-red-400">
            {formatPercent(spoilage)}
          </p>
        </div>
      </div>

      {/* SHELF LIFE */}
      <div className="mt-4 rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
          Dynamic Shelf-Life Prediction
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-600">
              Estimated
            </p>
            <p className="mt-2 text-2xl font-bold">
              {formatShelfLife(shelf)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-600">
              Likely Range
            </p>
            <p className="mt-2 text-xl font-bold text-slate-200">
              {shelfRange || "N/A"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-600">
              Confidence
            </p>
            <p className="mt-2 text-xl font-bold text-emerald-400">
              {formatPercent(shelfConfidence)}
            </p>
          </div>
        </div>
      </div>

      {/* FORECAST */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Spoilage Forecast
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ForecastCard
            title="Next 24 Hours"
            value={forecast?.next_24_hours}
          />
          <ForecastCard
            title="Next 48 Hours"
            value={forecast?.next_48_hours}
          />
          <ForecastCard
            title="Next 72 Hours"
            value={forecast?.next_72_hours}
          />
          <ForecastCard
            title="Next 5 Days"
            value={forecast?.next_5_days}
          />
        </div>
      </div>

      {/* ENVIRONMENT */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          🌡 Environmental Intelligence
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-xs text-slate-600">
              Temperature
            </p>
            <p className="mt-2 text-xl font-bold">
              {environmentTemperature === undefined
                ? "N/A"
                : `${formatNumber(environmentTemperature, 1)}°C`}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-xs text-slate-600">
              Humidity
            </p>
            <p className="mt-2 text-xl font-bold">
              {environmentHumidity === undefined
                ? "N/A"
                : `${formatNumber(environmentHumidity, 1)}%`}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-xs text-slate-600">
              Storage
            </p>
            <p className="mt-2 text-lg font-bold">
              {formatStorageMethod(
                result.storage_method
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-xs text-slate-600">
              Food Age
            </p>
            <p className="mt-2 text-xl font-bold">
              {ageDays === undefined
                ? "N/A"
                : `${formatNumber(ageDays, 1)} days`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div>
            <p className="text-xs text-slate-600">
              Environmental Risk
            </p>
            <p className="mt-1 text-lg font-bold">
              {environmentalRisk === undefined
                ? "N/A"
                : `${formatNumber(environmentalRisk)}%`}
            </p>
          </div>

          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
            {result.environmental_risk_level ||
              result.environment?.risk_level ||
              "N/A"}
          </span>
        </div>
      </div>

      {/* BREAKDOWN */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Freshness Breakdown
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <BreakdownCard
            title="Visual Quality"
            value={
              result.visual_quality ??
              breakdown?.visual_quality
            }
          />
          <BreakdownCard
            title="Color Condition"
            value={
              result.color_condition ??
              breakdown?.color_condition
            }
          />
          <BreakdownCard
            title="Texture Indicators"
            value={
              result.texture_indicators ??
              breakdown?.texture_indicators
            }
          />
          <BreakdownCard
            title="Spots / Defects"
            value={
              result.spots_defects ??
              breakdown?.spots_defects
            }
            danger
          />
          <BreakdownCard
            title="Environmental Risk"
            value={
              result.environmental_risk ??
              breakdown?.environmental_risk
            }
            danger
          />
        </div>
      </div>

      {/* EXPLAINABILITY */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          🧠 Why This Prediction?
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Main risk factor:{" "}
          <span className="text-slate-300">
            {result.explainability
              ?.main_risk_factor ||
              result.main_risk_factor ||
              "Visual condition"}
          </span>
        </p>

        {result.explainability?.factors?.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {result.explainability.factors.map(
              (factor, index) => (
                <div
                  key={`${factor.factor}-${index}`}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-wider text-slate-600">
                      {factor.category ||
                        "Factor"}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {factor.impact ||
                        "Context"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-300">
                    {factor.factor ||
                      "No detail provided."}
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No detailed explainability factors returned.
          </p>
        )}
      </div>

      {/* RECOMMENDATION */}
      <div className="mt-4 rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
          💡 Smart Recommendation
        </p>

        <p className="mt-3 leading-7 text-slate-300">
          {result.recommendation ||
            "Follow appropriate storage practices and monitor the food before consumption."}
        </p>
      </div>

      {/* MODEL INFO */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-600">
              Detected Food
            </p>
            <p className="mt-2 font-semibold">
              {foodName}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-600">
              Food Confidence
            </p>
            <p className="mt-2 font-semibold">
              {formatPercent(
                result.food_confidence ??
                  result.food_identification_confidence
              )}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-600">
              Local Model
            </p>
            <p className="mt-2 font-semibold">
              {result.local_model_label ||
                result.model_label ||
                "N/A"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-600">
              Gemini
            </p>
            <p
              className={`mt-2 font-semibold ${
                result.gemini_used
                  ? "text-emerald-400"
                  : "text-slate-400"
              }`}
            >
              {result.gemini_used
                ? "Used"
                : "Fallback / Not Used"}
            </p>
          </div>
        </div>
      </div>

      {/* VISUAL SIGNS */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Visual Signs Detected
        </p>

        {result.visual_signs?.length ? (
          <div className="mt-4 space-y-2">
            {result.visual_signs.map(
              (sign, index) => (
                <div
                  key={`${sign}-${index}`}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300"
                >
                  <span className="mr-2 text-emerald-400">
                    ✓
                  </span>
                  {sign}
                </div>
              )
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No detailed visual signs returned.
          </p>
        )}
      </div>

      {/* DISCLAIMER */}
      <div className="mt-4 rounded-2xl border border-yellow-900/50 bg-yellow-950/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-yellow-400">
          ⚠️ Research / Prototype Estimate
        </p>

        <p className="mt-3 leading-7 text-slate-400">
          {result.safety_disclaimer ||
            "Freshness, shelf-life and spoilage probability are AI-based research/prototype estimates. They are not a food-safety guarantee and should not replace professional food-safety guidance."}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

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

      if (
        temperature.trim()
      ) {
        formData.append(
          "temperature",
          temperature.trim()
        );
      }

      if (
        humidity.trim()
      ) {
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

        return data.result;
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-20 pt-28 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            🌿 FreshLens AI Food Scanner
          </p>

          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
            Check Your{" "}
            <span className="text-emerald-400">
              Food Freshness
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Upload multiple food images, drag & drop them,
            or capture food directly from your camera.
            FreshLens AI analyzes each item individually.
          </p>
        </div>

        {/* MAIN INPUT CARD */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8">

          {/* IMAGE DROP AREA */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-5 transition sm:p-8 ${
              isDragging
                ? "border-emerald-400 bg-emerald-500/5"
                : "border-slate-700 bg-slate-950"
            }`}
          >
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <div className="mb-5 text-6xl">
                {isDragging
                  ? "📥"
                  : "📷"}
              </div>

              <h2 className="text-2xl font-semibold">
                {isDragging
                  ? "Drop Food Images Here"
                  : "Upload Food Images"}
              </h2>

              <p className="mt-2 max-w-xl text-sm text-slate-500">
                Select one or multiple images, drag them here,
                or use the camera. Up to {MAX_IMAGES} images
                can be analyzed in one batch.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={loading}
                  className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Choose Images
                </button>

                <button
                  type="button"
                  onClick={openCamera}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-bold text-white transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  📷 Open Camera
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-600">
                JPG, PNG or WEBP • Max 10 MB each
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
            <div className="mt-5 rounded-2xl border border-emerald-900/50 bg-slate-950 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-emerald-400">
                    Live Camera Preview
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Center the food and make sure it is well lit.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="block min-h-[260px] w-full object-cover sm:min-h-[380px]"
                />
              </div>

              {cameraError && (
                <div className="mt-4 rounded-xl border border-red-900 bg-red-950/20 p-3">
                  <p className="text-sm text-red-400">
                    ⚠️ {cameraError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={capturePhoto}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
              >
                📸 Capture & Add To Scan
              </button>

              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
          )}

          {/* SELECTED IMAGES */}
          {images.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                    Selected Images ({images.length}/{MAX_IMAGES})
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Each item will be sent to the existing FastAPI analysis endpoint.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearAllImages}
                  disabled={loading}
                  className="w-fit rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {images.map(
                  (item, index) => {
                    const itemResult =
                      batchResults.find(
                        (entry) =>
                          entry.id ===
                          item.id
                      );

                    return (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
                      >
                        <div className="relative aspect-square bg-black">
                          <img
                            src={item.preview}
                            alt={`Selected food ${
                              index + 1
                            }`}
                            className="h-full w-full object-cover"
                          />

                          <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                            #{index + 1}
                          </div>

                          {item.source ===
                            "camera" && (
                            <div className="absolute bottom-2 left-2 rounded-full bg-emerald-500/90 px-2 py-1 text-xs font-semibold text-white">
                              Camera
                            </div>
                          )}
                        </div>

                        <div className="p-3">
                          <p className="truncate text-sm font-medium text-slate-300">
                            {item.file.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {(
                              item.file.size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </p>

                          {itemResult ? (
                            <div className="mt-3 rounded-xl bg-slate-900 p-3">
                              <p className="text-xs text-slate-600">
                                Result
                              </p>
                              <p className="mt-1 font-semibold text-emerald-400">
                                {getFoodName(
                                  itemResult.result
                                )}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {getStatus(
                                  itemResult.result
                                )}{" "}
                                •{" "}
                                {formatNumber(
                                  getFreshnessScore(
                                    itemResult.result
                                  )
                                )}
                                /100
                              </p>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-slate-600">
                              Ready to analyze
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              removeImage(
                                item.id
                              )
                            }
                            disabled={loading}
                            className="mt-3 w-full rounded-lg border border-red-900/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* ENVIRONMENT */}
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                🌡 Environmental Intelligence
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                These values are optional. Leave them blank if unknown.
                The same environmental context is applied to every selected image.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Temperature (°C)
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(event) =>
                    setTemperature(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 29.4"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Humidity (%)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={humidity}
                  onChange={(event) =>
                    setHumidity(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 71"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Storage Method
                </span>
                <select
                  value={storageMethod}
                  onChange={(event) =>
                    setStorageMethod(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
                >
                  <option value="">
                    Select storage method
                  </option>
                  <option value="room_temperature">
                    Room Temperature
                  </option>
                  <option value="refrigerated">
                    Refrigerator
                  </option>
                  <option value="freezer">
                    Freezer
                  </option>
                  <option value="pantry">
                    Pantry
                  </option>
                  <option value="counter">
                    Counter
                  </option>
                  <option value="cool_dry_place">
                    Cool / Dry Place
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Food Age (days)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={ageDays}
                  onChange={(event) =>
                    setAgeDays(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 2"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
                />
              </label>
            </div>

            {/* PREVIEW */}
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Request Preview
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-600">
                    Temperature
                  </p>
                  <p className="mt-1 font-semibold text-slate-300">
                    {temperature
                      ? `${temperature}°C`
                      : "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600">
                    Humidity
                  </p>
                  <p className="mt-1 font-semibold text-slate-300">
                    {humidity
                      ? `${humidity}%`
                      : "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600">
                    Storage
                  </p>
                  <p className="mt-1 font-semibold text-slate-300">
                    {previewStorage}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600">
                    Age
                  </p>
                  <p className="mt-1 font-semibold text-slate-300">
                    {ageDays
                      ? `${ageDays} days`
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4">
              <p className="text-sm font-medium text-red-400">
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* ANALYZE */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={
              loading ||
              images.length === 0
            }
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-4 font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing {currentIndex}/{images.length}...
              </>
            ) : (
              `🔍 Analyze ${
                images.length || ""
              } Food${
                images.length === 1
                  ? ""
                  : "s"
              }`
            )}
          </button>
        </div>

        {/* RESULTS */}
        {latestResults.length > 0 && (
          <div className="mt-8">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Scan Results
                </p>
                <h2 className="mt-1 text-3xl font-bold">
                  {latestResults.length} Result
                  {latestResults.length === 1
                    ? ""
                    : "s"}
                </h2>
              </div>

              {loading && (
                <p className="text-sm text-slate-500">
                  Processing image {currentIndex} of {images.length}…
                </p>
              )}
            </div>

            {latestResults.map(
              (entry, index) => (
                <div key={entry.id}>
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-xs uppercase tracking-wider text-slate-600">
                      Image {index + 1}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-300">
                      {entry.fileName}
                    </p>
                  </div>

                  <ResultCard
                    result={entry.result}
                  />
                </div>
              )
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-10 text-center">
          <p className="text-xs leading-6 text-slate-600">
            FreshLens AI provides AI-based visual and environmental
            estimates of food freshness. Results are for research and
            informational purposes and should not replace professional
            food-safety guidance.
          </p>
        </div>
      </div>
    </main>
  );
}

export default Scan;
