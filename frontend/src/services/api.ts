/*
========================================================
 FreshLens AI - API Service
========================================================
*/

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

/*
========================================================
 TYPES
========================================================
*/

export type ShelfLife = {
  min?: number;
  max?: number;
  range?: string;
  baseline_min?: number;
  baseline_max?: number;
};

export type SpoilageProbability = {
  probability?: number | string;
  risk?: string;
};

export type FreshnessBreakdown = {
  visual_quality?: number | string;
  color_condition?: number | string;
  texture_indicators?: number | string;
  spots_defects?: number | string;
  environmental_risk?: number | string;
};

export type AnalysisResult = {
  /*
  ======================================================
  FOOD
  ======================================================
  */

  food_class?: string;
  food_name?: string;
  detected_food?: string;
  food?: string;
  raw_food_label?: string;

  food_identification_confidence?: number | string;
  food_confidence?: number | string;

  /*
  ======================================================
  FRESHNESS
  ======================================================
  */

  freshness_status?: string;
  status?: string;
  freshness?: string;

  /*
  ======================================================
  SCORE
  ======================================================
  */

  freshness_score?: number | string;
  score?: number | string;

  /*
  ======================================================
  CONFIDENCE
  ======================================================
  */

  confidence?: number | string;
  ai_confidence?: number | string;
  model_confidence?: number | string;

  /*
  ======================================================
  LOCAL MODEL
  ======================================================
  */

  model_label?: string;
  local_model_label?: string;
  local_model_confidence?: number | string;

  /*
  ======================================================
  GEMINI
  ======================================================
  */

  gemini_used?: boolean;
  analysis_source?: string;
  gemini_analysis?: unknown;

  /*
  ======================================================
  VISUAL
  ======================================================
  */

  visual_signs?: string[];
  visual_condition?: string;
  condition?: string;

  /*
  ======================================================
  FRESHNESS BREAKDOWN
  ======================================================
  */

  visual_quality?: number | string;
  color_condition?: number | string;
  texture_indicators?: number | string;
  spots_defects?: number | string;
  environmental_risk?: number | string;

  freshness_breakdown?: FreshnessBreakdown;
  breakdown?: FreshnessBreakdown;
  visual_breakdown?: FreshnessBreakdown;

  /*
  ======================================================
  SPOILAGE
  ======================================================
  */

  spoilage_probability?: SpoilageProbability;

  spoilage_probability_percent?: number | string;

  spoilage_risk?: string;

  spoilage?: SpoilageProbability;

  /*
  ======================================================
  SHELF LIFE
  ======================================================
  */

  estimated_shelf_life_days?: ShelfLife;

  shelf_life?: ShelfLife;

  shelf_life_days?: ShelfLife;

  dynamic_shelf_life?: ShelfLife;

  /*
  ======================================================
  RECOMMENDATION
  ======================================================
  */

  recommendation?: string;

  /*
  ======================================================
  DISCLAIMER
  ======================================================
  */

  research_estimate?: boolean;

  safety_disclaimer?: string;
};

export type ApiResponse = {
  success: boolean;

  filename?: string;

  result?: AnalysisResult;

  detail?: string;

  message?: string;
};

/*
========================================================
 RESPONSE HELPER
========================================================
*/

async function parseResponse(
  response: Response
): Promise<ApiResponse> {
  let data: ApiResponse | null = null;

  try {
    data =
      (await response.json()) as ApiResponse;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        `Request failed (${response.status})`
    );
  }

  return (
    data || {
      success: false,
      detail:
        "Backend returned an empty response.",
    }
  );
}

/*
========================================================
 ANALYZE FOOD
========================================================
*/

export async function analyzeFood(
  imageFile: File
): Promise<AnalysisResult> {
  if (!imageFile) {
    throw new Error(
      "Please upload a food image first."
    );
  }

  if (
    !imageFile.type.startsWith("image/")
  ) {
    throw new Error(
      "Please select a valid image file."
    );
  }

  const formData = new FormData();

  /*
    IMPORTANT:
    FastAPI backend expects:
    image
  */

  formData.append(
    "image",
    imageFile
  );

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/analysis/analyze`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch (error) {
    console.error(
      "FreshLens API connection error:",
      error
    );

    throw new Error(
      "Cannot connect to FreshLens AI backend. Make sure the FastAPI server is running on port 8000."
    );
  }

  const data =
    await parseResponse(response);

  /*
  ======================================================
  VALIDATE RESPONSE
  ======================================================
  */

  if (!data.success) {
    throw new Error(
      data.detail ||
        data.message ||
        "Food analysis failed."
    );
  }

  if (!data.result) {
    throw new Error(
      "The AI analysis did not return a valid result."
    );
  }

  console.log(
    "FreshLens AI Response:",
    data
  );

  return data.result;
}

/*
========================================================
 BACKEND HEALTH CHECK
========================================================
*/

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/`
      );

    return response.ok;
  } catch {
    return false;
  }
}

/*
========================================================
 GENERIC GET
========================================================
*/

export async function apiGet(
  endpoint: string
): Promise<ApiResponse> {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}${endpoint}`
      );

    return await parseResponse(
      response
    );
  } catch (error) {
    console.error(
      "FreshLens GET error:",
      error
    );

    throw error;
  }
}

/*
========================================================
 GENERIC POST
========================================================
*/

export async function apiPost<T = unknown>(
  endpoint: string,
  body: T
): Promise<ApiResponse> {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(body),
        }
      );

    return await parseResponse(
      response
    );
  } catch (error) {
    console.error(
      "FreshLens POST error:",
      error
    );

    throw error;
  }
}

/*
========================================================
 DEFAULT EXPORT
========================================================
*/

export default {
  analyzeFood,
  checkBackendHealth,
  apiGet,
  apiPost,
};