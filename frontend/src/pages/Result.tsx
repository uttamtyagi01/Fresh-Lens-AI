import { useLocation, useNavigate } from "react-router-dom";

/*
========================================================
 TYPES
========================================================
*/

type ShelfLife = {
  min?: number;
  max?: number;
  range?: string;
};

type SpoilageData = {
  probability?: number | string;
  risk?: string;
};

type FreshnessBreakdown = {
  visual_quality?: number | string;
  color_condition?: number | string;
  texture_indicators?: number | string;
  spots_defects?: number | string;
  environmental_risk?: number | string;
};

type ResultData = {
  /*
  ======================================================
  FOOD
  ======================================================
  */

  food_name?: string;
  food_class?: string;
  detected_food?: string;
  food?: string;

  raw_food_label?: string;

  food_confidence?: number | string;
  food_identification_confidence?: number | string;

  /*
  ======================================================
  FRESHNESS
  ======================================================
  */

  freshnessStatus?: string;
  freshness_status?: string;

  status?: string;
  freshness?: string;

  /*
  ======================================================
  SCORE
  ======================================================
  */

  freshnessScore?: number | string;
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

  local_model_status?: string;

  local_model_score?: number | string;

  local_model_confidence?: number | string;

  /*
  ======================================================
  SOURCE
  ======================================================
  */

  analysis_source?: string;
  gemini_used?: boolean;

  /*
  ======================================================
  VISUAL
  ======================================================
  */

  visual_condition?: string;
  condition?: string;

  visual_signs?: string[];

  /*
  ======================================================
  BREAKDOWN
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

  spoilage_probability?: number | string;

  spoilage_probability_percent?: number | string;

  spoilage_risk?: string;

  spoilage?: SpoilageData;

  /*
  ======================================================
  SHELF LIFE
  ======================================================
  */

  shelfLife?: string | ShelfLife;

  shelf_life?: string | ShelfLife;

  shelf_life_min?: number;

  shelf_life_max?: number;

  estimated_shelf_life_days?: ShelfLife;

  dynamic_shelf_life?: ShelfLife;

  shelf_life_days?: ShelfLife;

  /*
  ======================================================
  RECOMMENDATION
  ======================================================
  */

  recommendation?: string;

  /*
  ======================================================
  IMAGE
  ======================================================
  */

  imageUrl?: string;

  image_url?: string;

  filename?: string;

  /*
  ======================================================
  DISCLAIMER
  ======================================================
  */

  safety_disclaimer?: string;

  research_estimate?: boolean;
};


/*
========================================================
HELPERS
========================================================
*/

function toNumber(
  value: unknown,
  fallback = 0
): number {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
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


function formatNumber(
  value: unknown,
  decimals = 2
): string {

  const number = toNumber(value);

  return number.toFixed(decimals);
}


function formatDays(
  value: number
): string {

  if (value === 1) {
    return "1 day";
  }

  return `${value} days`;
}


/*
========================================================
SHELF LIFE
========================================================
*/

function getShelfLife(
  item: ResultData
): string {

  /*
  ------------------------------------------------------
  1. shelfLife
  ------------------------------------------------------
  */

  const shelfLife =
    item.shelfLife ||
    item.shelf_life;


  if (
    typeof shelfLife === "string" &&
    shelfLife.trim()
  ) {

    return shelfLife;
  }


  if (
    shelfLife &&
    typeof shelfLife === "object"
  ) {

    if (
      shelfLife.range &&
      shelfLife.range.trim()
    ) {

      return shelfLife.range;
    }


    const min = shelfLife.min;
    const max = shelfLife.max;


    if (
      min !== undefined &&
      max !== undefined
    ) {

      return min === max
        ? formatDays(min)
        : `${min}-${max} days`;
    }


    if (min !== undefined) {

      return formatDays(min);
    }


    if (max !== undefined) {

      return formatDays(max);
    }
  }


  /*
  ------------------------------------------------------
  2. estimated_shelf_life_days
  ------------------------------------------------------
  */

  if (
    item.estimated_shelf_life_days
  ) {

    const shelf =
      item.estimated_shelf_life_days;


    if (
      shelf.range &&
      shelf.range.trim()
    ) {

      return shelf.range;
    }


    const min = shelf.min;
    const max = shelf.max;


    if (
      min !== undefined &&
      max !== undefined
    ) {

      return min === max
        ? formatDays(min)
        : `${min}-${max} days`;
    }


    if (min !== undefined) {

      return formatDays(min);
    }


    if (max !== undefined) {

      return formatDays(max);
    }
  }


  /*
  ------------------------------------------------------
  3. dynamic_shelf_life
  ------------------------------------------------------
  */

  if (
    item.dynamic_shelf_life
  ) {

    const shelf =
      item.dynamic_shelf_life;


    if (
      shelf.range &&
      shelf.range.trim()
    ) {

      return shelf.range;
    }


    const min = shelf.min;
    const max = shelf.max;


    if (
      min !== undefined &&
      max !== undefined
    ) {

      return min === max
        ? formatDays(min)
        : `${min}-${max} days`;
    }
  }


  /*
  ------------------------------------------------------
  4. shelf_life_min / shelf_life_max
  ------------------------------------------------------
  */

  if (
    item.shelf_life_min !== undefined ||
    item.shelf_life_max !== undefined
  ) {

    const min =
      item.shelf_life_min;

    const max =
      item.shelf_life_max;


    if (
      min !== undefined &&
      max !== undefined
    ) {

      return min === max
        ? formatDays(min)
        : `${min}-${max} days`;
    }


    if (min !== undefined) {

      return formatDays(min);
    }


    if (max !== undefined) {

      return formatDays(max);
    }
  }


  return "N/A";
}


/*
========================================================
BREAKDOWN VALUE
========================================================
*/

function getBreakdownValue(
  item: ResultData,
  key: keyof FreshnessBreakdown,
  fallback = 0
): number {

  const breakdown =
    item.freshness_breakdown ||
    item.breakdown ||
    item.visual_breakdown;


  if (
    breakdown &&
    breakdown[key] !== undefined
  ) {

    return clamp(
      toNumber(
        breakdown[key],
        fallback
      )
    );
  }


  if (
    item[key] !== undefined
  ) {

    return clamp(
      toNumber(
        item[key],
        fallback
      )
    );
  }


  return fallback;
}


/*
========================================================
SPOILAGE PROBABILITY
========================================================
*/

function getSpoilageProbability(
  item: ResultData,
  score: number,
  status: string
): number {

  /*
  ------------------------------------------------------
  Backend value
  ------------------------------------------------------
  */

  if (
    item.spoilage_probability !== undefined
  ) {

    return clamp(
      toNumber(
        item.spoilage_probability
      )
    );
  }


  if (
    item.spoilage_probability_percent !== undefined
  ) {

    return clamp(
      toNumber(
        item.spoilage_probability_percent
      )
    );
  }


  if (
    item.spoilage &&
    item.spoilage.probability !== undefined
  ) {

    return clamp(
      toNumber(
        item.spoilage.probability
      )
    );
  }


  /*
  ------------------------------------------------------
  Frontend fallback
  ------------------------------------------------------
  */

  let probability =
    100 - score;


  const normalized =
    status.toLowerCase();


  if (
    normalized.includes("spoiled") ||
    normalized.includes("rotten")
  ) {

    probability += 15;
  }

  else if (
    normalized.includes("slightly")
  ) {

    probability += 5;
  }

  else if (
    normalized.includes("unripe")
  ) {

    probability -= 5;
  }

  else if (
    normalized.includes("fresh")
  ) {

    probability -= 5;
  }


  return clamp(
    probability
  );
}


/*
========================================================
SPOILAGE RISK
========================================================
*/

function getSpoilageRisk(
  item: ResultData,
  probability: number
): string {

  if (
    item.spoilage_risk
  ) {

    return item.spoilage_risk;
  }


  if (
    item.spoilage?.risk
  ) {

    return item.spoilage.risk;
  }


  if (probability >= 75) {

    return "High";
  }


  if (probability >= 40) {

    return "Medium";
  }


  if (probability >= 15) {

    return "Low";
  }


  return "Very Low";
}


/*
========================================================
SPOILAGE FORECAST
========================================================
*/

function calculateForecast(
  probability: number
) {

  /*
  ------------------------------------------------------
  This is a visual estimate.
  It does NOT mean actual biological spoilage.
  ------------------------------------------------------
  */

  const next24 =
    clamp(
      probability * 0.70
    );

  const next48 =
    clamp(
      probability * 0.82
    );

  const next72 =
    clamp(
      probability * 0.92
    );

  const next5Days =
    clamp(
      probability * 1.08
    );


  return {
    next24,
    next48,
    next72,
    next5Days,
  };
}


/*
========================================================
MAIN COMPONENT
========================================================
*/

export default function Result() {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  const item =
    (location.state as ResultData | null) ||
    null;


  /*
  ======================================================
  NO RESULT
  ======================================================
  */

  if (!item) {

    return (

      <main className="result-page">

        <div className="result-empty">

          <div className="result-icon">
            🔍
          </div>


          <h1>
            No Result Found
          </h1>


          <p>
            Please scan a food item first.
          </p>


          <button
            className="empty-button"
            onClick={() =>
              navigate("/scan")
            }
          >
            Scan Food
          </button>

        </div>


        <style>
          {resultCSS}
        </style>

      </main>
    );
  }


  /*
  ======================================================
  FOOD
  ======================================================
  */

  const food =
    item.food_name ||
    item.food_class ||
    item.detected_food ||
    item.food ||
    "Unknown Food";


  /*
  ======================================================
  STATUS
  ======================================================
  */

  const status =
    item.freshness_status ||
    item.freshnessStatus ||
    item.status ||
    item.freshness ||
    "Unknown";


  /*
  ======================================================
  SCORE
  ======================================================
  */

  const score =
    clamp(
      toNumber(
        item.freshness_score ??
        item.freshnessScore ??
        item.score ??
        0
      )
    );


  /*
  ======================================================
  CONFIDENCE
  ======================================================
  */

  const confidence =
    clamp(
      toNumber(
        item.confidence ??
        item.ai_confidence ??
        item.model_confidence ??
        0
      )
    );


  /*
  ======================================================
  STATUS CLASS
  ======================================================
  */

  const statusValue =
    status.toLowerCase();


  let statusClass =
    "moderate";


  if (
    statusValue.includes("fresh") ||
    statusValue.includes("good")
  ) {

    statusClass =
      "fresh";

  }

  else if (
    statusValue.includes("spoiled") ||
    statusValue.includes("rotten") ||
    statusValue.includes("bad")
  ) {

    /*
    Slightly spoiled remains moderate.
    */

    if (
      statusValue.includes("slightly")
    ) {

      statusClass =
        "moderate";

    }

    else {

      statusClass =
        "spoiled";
    }
  }


  /*
  ======================================================
  SHELF LIFE
  ======================================================
  */

  const shelfLife =
    getShelfLife(item);


  /*
  ======================================================
  SPOILAGE
  ======================================================
  */

  const spoilageProbability =
    getSpoilageProbability(
      item,
      score,
      status
    );


  const spoilageRisk =
    getSpoilageRisk(
      item,
      spoilageProbability
    );


  /*
  ======================================================
  FORECAST
  ======================================================
  */

  const forecast =
    calculateForecast(
      spoilageProbability
    );


  /*
  ======================================================
  BREAKDOWN
  ======================================================
  */

  const visualQuality =
    getBreakdownValue(
      item,
      "visual_quality",
      score
    );


  const colorCondition =
    getBreakdownValue(
      item,
      "color_condition",
      score
    );


  const textureIndicators =
    getBreakdownValue(
      item,
      "texture_indicators",
      score
    );


  const spotsDefects =
    getBreakdownValue(
      item,
      "spots_defects",
      Math.max(
        0,
        100 - score
      )
    );


  const environmentalRisk =
    getBreakdownValue(
      item,
      "environmental_risk",
      Math.max(
        0,
        100 - score
      )
    );


  /*
  ======================================================
  VISUAL CONDITION
  ======================================================
  */

  const visualCondition =
    item.visual_condition ||
    item.condition ||
    (
      statusClass === "fresh"
        ? "Good"
        : statusClass === "spoiled"
        ? "Poor"
        : "Fair"
    );


  /*
  ======================================================
  VISUAL SIGNS
  ======================================================
  */

  const visualSigns =
    Array.isArray(
      item.visual_signs
    )
      ? item.visual_signs.filter(
          sign =>
            typeof sign === "string" &&
            sign.trim()
        )
      : [];


  /*
  ======================================================
  RECOMMENDATION
  ======================================================
  */

  let recommendation =
    item.recommendation ||
    "";


  if (!recommendation) {

    if (
      statusClass === "spoiled"
    ) {

      recommendation =
        "The food appears visually spoiled. Do not rely on image analysis alone to determine food safety.";
    }

    else if (
      spoilageProbability >= 75
    ) {

      recommendation =
        "High visual spoilage risk detected. Do not rely on this image alone to determine food safety.";
    }

    else if (
      spoilageProbability >= 40
    ) {

      recommendation =
        "Moderate visual spoilage risk detected. Inspect carefully and follow proper food storage and safety guidance.";
    }

    else if (
      statusValue.includes("unripe")
    ) {

      recommendation =
        "The food appears visually unripe. It may need additional ripening before use.";
    }

    else if (
      statusValue.includes("slightly")
    ) {

      recommendation =
        "The food appears slightly spoiled. Inspect carefully before consuming.";
    }

    else {

      recommendation =
        "The food appears visually fresh. Store appropriately to help maintain freshness.";
    }
  }


  /*
  ======================================================
  IMAGE
  ======================================================
  */

  const image =
    item.imageUrl ||
    item.image_url ||
    "";


  /*
  ======================================================
  RETURN
  ======================================================
  */

  return (

    <main className="result-page">

      <div className="result-container">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="result-header">

          <p className="eyebrow">
            FRESHLENS AI
          </p>


          <h1>
            Freshness Result
          </h1>


          <p>
            AI-powered visual analysis of your food.
          </p>

        </div>


        {/* =================================================
            MAIN CARD
        ================================================= */}

        <div className="result-card">


          {/* =================================================
              IMAGE
          ================================================= */}

          {image && (

            <div className="result-image-wrapper">

              <img
                src={image}
                alt={food}
                className="result-image"
              />


              {item.filename && (

                <p className="image-filename">
                  {item.filename}
                </p>

              )}

            </div>

          )}


          {/* =================================================
              FOOD
          ================================================= */}

          <div className="result-food">

            <div className="food-emoji">
              🍎
            </div>


            <div>

              <span>
                Food Detected
              </span>


              <h2>
                {food}
              </h2>

            </div>

          </div>


          {/* =================================================
              STATUS
          ================================================= */}

          <div className="result-status">

            <span>
              Freshness Status
            </span>


            <strong
              className={statusClass}
            >
              {status}
            </strong>

          </div>


          {/* =================================================
              TOP STATS
          ================================================= */}

          <div className="result-grid">


            {/* SCORE */}

            <div className="result-stat">

              <span>
                Freshness Score
              </span>


              <strong>
                {formatNumber(score)}
                <small>
                  / 100
                </small>
              </strong>

            </div>


            {/* CONFIDENCE */}

            <div className="result-stat">

              <span>
                AI Confidence
              </span>


              <strong>
                {formatNumber(confidence)}%
              </strong>

            </div>


            {/* SHELF LIFE */}

            <div className="result-stat">

              <span>
                Estimated Shelf Life
              </span>


              <strong>
                {shelfLife}
              </strong>

            </div>

          </div>


          {/* =================================================
              SPOILAGE CARD
          ================================================= */}

          <div className="spoilage-card">

            <div className="section-heading">

              <span>
                Spoilage Assessment
              </span>

            </div>


            <div className="spoilage-main">


              <div>

                <small>
                  Spoilage Probability
                </small>


                <strong>
                  {formatNumber(
                    spoilageProbability
                  )}%
                </strong>

              </div>


              <div
                className={`risk-badge ${spoilageRisk
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {spoilageRisk} Risk
              </div>

            </div>


            <div className="probability-bar">

              <div
                className="probability-fill"
                style={{
                  width: `${spoilageProbability}%`,
                }}
              />

            </div>


            <p className="small-note">
              This is an AI-based visual estimate,
              not a measurement of actual biological
              spoilage or food safety.
            </p>

          </div>


          {/* =================================================
              NEXT PERIOD ESTIMATE
          ================================================= */}

          <div className="forecast-section">

            <div className="section-heading">

              <span>
                Visual Spoilage Trend
              </span>

              <p>
                Estimated risk under similar conditions
              </p>

            </div>


            <div className="forecast-grid">


              <div className="forecast-card">

                <span>
                  Next 24 Hours
                </span>

                <strong>
                  {formatNumber(
                    forecast.next24
                  )}%
                </strong>

              </div>


              <div className="forecast-card">

                <span>
                  Next 48 Hours
                </span>

                <strong>
                  {formatNumber(
                    forecast.next48
                  )}%
                </strong>

              </div>


              <div className="forecast-card">

                <span>
                  Next 72 Hours
                </span>

                <strong>
                  {formatNumber(
                    forecast.next72
                  )}%
                </strong>

              </div>


              <div className="forecast-card">

                <span>
                  Next 5 Days
                </span>

                <strong>
                  {formatNumber(
                    forecast.next5Days
                  )}%
                </strong>

              </div>

            </div>

          </div>


          {/* =================================================
              FRESHNESS BREAKDOWN
          ================================================= */}

          <div className="breakdown-section">

            <div className="section-heading">

              <span>
                Freshness Breakdown
              </span>

              <p>
                Factors contributing to the visual freshness estimate.
              </p>

            </div>


            {/* VISUAL QUALITY */}

            <BreakdownRow
              label="Visual Quality"
              value={visualQuality}
              inverse={false}
            />


            {/* COLOR */}

            <BreakdownRow
              label="Color Condition"
              value={colorCondition}
              inverse={false}
            />


            {/* TEXTURE */}

            <BreakdownRow
              label="Texture Indicators"
              value={textureIndicators}
              inverse={false}
            />


            {/* SPOTS */}

            <BreakdownRow
              label="Spots / Defects"
              value={spotsDefects}
              inverse={true}
            />


            {/* ENVIRONMENT */}

            <BreakdownRow
              label="Environmental Risk"
              value={environmentalRisk}
              inverse={true}
            />

          </div>


          {/* =================================================
              VISUAL CONDITION
          ================================================= */}

          <div className="info-box">

            <span>
              Visual Condition
            </span>


            <strong>
              {visualCondition}
            </strong>

          </div>


          {/* =================================================
              VISUAL SIGNS
          ================================================= */}

          <div className="visual-signs">

            <span>
              Visual Signs Detected
            </span>


            {visualSigns.length > 0 ? (

              <div className="sign-list">

                {visualSigns.map(
                  (sign, index) => (

                    <span
                      key={`${sign}-${index}`}
                      className="sign"
                    >
                      {sign}
                    </span>

                  )
                )}

              </div>

            ) : (

              <p className="no-signs">
                {status === "Fresh"
                  ? "No specific visual warning signs were reported."
                  : "Local freshness model detected signs associated with the current freshness assessment. Visual inspection is recommended."
                }
              </p>

            )}

          </div>


          {/* =================================================
              SMART RECOMMENDATION
          ================================================= */}

          <div className="recommendation">

            <div className="recommendation-title">

              <span className="bulb">
                💡
              </span>

              <span>
                Smart Recommendation
              </span>

            </div>


            <p>
              {recommendation}
            </p>

          </div>


          {/* =================================================
              SOURCE
          ================================================= */}

          {item.analysis_source && (

            <div className="source-box">

              <span>
                Analysis Source
              </span>


              <strong>
                {item.analysis_source}
              </strong>

            </div>

          )}


          {/* =================================================
              RESEARCH DISCLAIMER
          ================================================= */}

          <div className="research-note">

            <div className="research-title">
              ⚠️ Research / Prototype Estimate
            </div>


            <p>
              {item.safety_disclaimer ||
                "Shelf-life and spoilage probabilities are AI-based visual estimates for research and demonstration purposes. They are not a food-safety guarantee."
              }
            </p>

          </div>


          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="result-actions">

            <button
              className="secondary-button"
              onClick={() =>
                navigate("/dashboard")
              }
            >
              ← Dashboard
            </button>


            <button
              className="primary-button"
              onClick={() =>
                navigate("/scan")
              }
            >
              Scan Another Food
            </button>

          </div>

        </div>


        {/* =================================================
            FOOTER NOTE
        ================================================= */}

        <div className="result-note">

          FreshLens AI provides an AI-based
          visual estimate of food freshness.
          Results are for informational and
          research purposes only and should not
          replace professional food-safety guidance.

        </div>

      </div>


      <style>
        {resultCSS}
      </style>

    </main>
  );
}


/*
========================================================
BREAKDOWN COMPONENT
========================================================
*/

function BreakdownRow({
  label,
  value,
  inverse,
}: {
  label: string;
  value: number;
  inverse: boolean;
}) {

  const displayValue =
    clamp(value);


  /*
  For normal metrics:
  high = good.

  For risk metrics:
  high = bad.
  */

  let level =
    "medium";


  if (!inverse) {

    if (displayValue >= 70) {

      level = "good";

    }

    else if (displayValue < 40) {

      level = "bad";

    }

  }

  else {

    if (displayValue >= 70) {

      level = "bad";

    }

    else if (displayValue < 30) {

      level = "good";

    }

  }


  return (

    <div className="breakdown-row">

      <div className="breakdown-top">

        <span>
          {label}
        </span>


        <strong>
          {formatNumber(displayValue)}%
        </strong>

      </div>


      <div className="breakdown-bar">

        <div
          className={`breakdown-fill ${level}`}
          style={{
            width: `${displayValue}%`,
          }}
        />

      </div>

    </div>
  );
}


/*
========================================================
CSS
========================================================
*/

const resultCSS = `

* {
  box-sizing: border-box;
}


/* =====================================================
   PAGE
===================================================== */

.result-page {

  min-height: 100vh;

  padding: 120px 20px 70px;

  background:
    radial-gradient(
      circle at 20% 10%,
      rgba(0,255,170,0.07),
      transparent 35%
    ),
    radial-gradient(
      circle at 80% 80%,
      rgba(40,100,255,0.04),
      transparent 35%
    ),
    #050a10;

  color: white;

}


/* =====================================================
   CONTAINER
===================================================== */

.result-container {

  width: 100%;

  max-width: 920px;

  margin: auto;

}


/* =====================================================
   HEADER
===================================================== */

.result-header {

  text-align: center;

  margin-bottom: 35px;

}


.eyebrow {

  margin: 0;

  color: #41e6a1;

  font-size: 13px;

  font-weight: 800;

  letter-spacing: 3px;

}


.result-header h1 {

  margin: 10px 0;

  font-size: 48px;

  line-height: 1.1;

}


.result-header p {

  margin: 0;

  color: #8291a5;

}


/* =====================================================
   CARD
===================================================== */

.result-card {

  padding: 30px;

  border:
    1px solid
    rgba(100,130,170,0.18);

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(21,35,59,0.96),
      rgba(7,14,25,0.96)
    );

  box-shadow:
    0 20px 60px
    rgba(0,0,0,0.3);

}


/* =====================================================
   IMAGE
===================================================== */

.result-image-wrapper {

  margin-bottom: 30px;

  text-align: center;

}


.result-image {

  display: block;

  width: 100%;

  max-height: 420px;

  object-fit: contain;

  margin: auto;

  border-radius: 18px;

  background: #02070c;

  border:
    1px solid
    rgba(100,130,170,0.18);

  box-shadow:
    0 15px 45px
    rgba(0,0,0,0.35);

}


.image-filename {

  margin-top: 10px;

  color: #63748a;

  font-size: 12px;

}


/* =====================================================
   FOOD
===================================================== */

.result-food {

  display: flex;

  align-items: center;

  gap: 18px;

  padding-bottom: 25px;

  border-bottom:
    1px solid
    rgba(100,130,170,0.15);

}


.food-emoji {

  width: 70px;

  height: 70px;

  display: grid;

  place-items: center;

  border-radius: 18px;

  background:
    rgba(30,50,75,0.8);

  font-size: 38px;

}


.result-food span,
.result-status span,
.result-stat span,
.info-box span,
.visual-signs > span,
.source-box span {

  color: #718198;

  font-size: 12px;

  text-transform: uppercase;

  letter-spacing: 1px;

}


.result-food h2 {

  margin: 6px 0 0;

  font-size: 28px;

}


/* =====================================================
   STATUS
===================================================== */

.result-status {

  padding: 25px 0;

}


.result-status strong {

  display: block;

  margin-top: 8px;

  font-size: 24px;

}


.fresh {

  color: #38e59d;

}


.moderate {

  color: #f0b84c;

}


.spoiled {

  color: #ff725d;

}


/* =====================================================
   STATS
===================================================== */

.result-grid {

  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 15px;

}


.result-stat {

  padding: 20px;

  border-radius: 14px;

  background:
    rgba(4,10,18,0.7);

  border:
    1px solid
    rgba(100,130,170,0.12);

}


.result-stat strong {

  display: block;

  margin-top: 10px;

  font-size: 25px;

}


.result-stat small {

  margin-left: 4px;

  color: #718198;

  font-size: 13px;

  font-weight: 600;

}


/* =====================================================
   SECTION HEADING
===================================================== */

.section-heading {

  margin-bottom: 18px;

}


.section-heading > span {

  display: block;

  color: #718198;

  font-size: 12px;

  text-transform: uppercase;

  letter-spacing: 1px;

}


.section-heading p {

  margin: 6px 0 0;

  color: #63748a;

  font-size: 13px;

}


/* =====================================================
   SPOILAGE
===================================================== */

.spoilage-card {

  margin-top: 22px;

  padding: 22px;

  border-radius: 16px;

  background:
    rgba(255,90,70,0.045);

  border:
    1px solid
    rgba(255,120,90,0.12);

}


.spoilage-main {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 20px;

}


.spoilage-main small {

  display: block;

  color: #718198;

  font-size: 12px;

  text-transform: uppercase;

  letter-spacing: 1px;

}


.spoilage-main strong {

  display: block;

  margin-top: 6px;

  font-size: 30px;

}


.risk-badge {

  padding: 9px 14px;

  border-radius: 999px;

  background:
    rgba(255,255,255,0.05);

  border:
    1px solid
    rgba(255,255,255,0.1);

  font-size: 12px;

  font-weight: 800;

}


.risk-badge.high {

  color: #ff725d;

  border-color:
    rgba(255,114,93,0.3);

}


.risk-badge.medium {

  color: #f0b84c;

  border-color:
    rgba(240,184,76,0.3);

}


.risk-badge.low {

  color: #55d6a0;

  border-color:
    rgba(85,214,160,0.3);

}


.risk-badge.very-low {

  color: #55d6a0;

  border-color:
    rgba(85,214,160,0.3);

}


/* =====================================================
   PROBABILITY BAR
===================================================== */

.probability-bar {

  width: 100%;

  height: 9px;

  margin-top: 18px;

  overflow: hidden;

  border-radius: 999px;

  background:
    rgba(255,255,255,0.06);

}


.probability-fill {

  height: 100%;

  border-radius: inherit;

  background:
    linear-gradient(
      90deg,
      #38e59d,
      #f0b84c,
      #ff725d
    );

  transition:
    width 0.4s ease;

}


.small-note {

  margin: 13px 0 0;

  color: #63748a;

  font-size: 11px;

  line-height: 1.5;

}


/* =====================================================
   FORECAST
===================================================== */

.forecast-section {

  margin-top: 25px;

}


.forecast-grid {

  display: grid;

  grid-template-columns:
    repeat(4, 1fr);

  gap: 12px;

}


.forecast-card {

  padding: 17px;

  border-radius: 14px;

  background:
    rgba(4,10,18,0.7);

  border:
    1px solid
    rgba(100,130,170,0.12);

}


.forecast-card span {

  display: block;

  color: #718198;

  font-size: 11px;

  line-height: 1.4;

}


.forecast-card strong {

  display: block;

  margin-top: 8px;

  font-size: 21px;

}


/* =====================================================
   BREAKDOWN
===================================================== */

.breakdown-section {

  margin-top: 25px;

  padding: 22px;

  border-radius: 16px;

  background:
    rgba(4,10,18,0.55);

  border:
    1px solid
    rgba(100,130,170,0.12);

}


.breakdown-row {

  margin-top: 18px;

}


.breakdown-top {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 15px;

}


.breakdown-top span {

  color: #aebbc9;

  font-size: 13px;

}


.breakdown-top strong {

  color: white;

  font-size: 13px;

}


.breakdown-bar {

  width: 100%;

  height: 7px;

  margin-top: 8px;

  overflow: hidden;

  border-radius: 999px;

  background:
    rgba(255,255,255,0.06);

}


.breakdown-fill {

  height: 100%;

  border-radius: inherit;

  transition:
    width 0.4s ease;

}


.breakdown-fill.good {

  background: #38e59d;

}


.breakdown-fill.medium {

  background: #f0b84c;

}


.breakdown-fill.bad {

  background: #ff725d;

}


/* =====================================================
   INFO BOX
===================================================== */

.info-box {

  margin-top: 20px;

  padding: 20px;

  border-radius: 14px;

  background:
    rgba(4,10,18,0.7);

  border:
    1px solid
    rgba(100,130,170,0.12);

}


.info-box strong {

  display: block;

  margin-top: 8px;

  font-size: 21px;

}


/* =====================================================
   VISUAL SIGNS
===================================================== */

.visual-signs {

  margin-top: 20px;

  padding: 20px;

  border-radius: 14px;

  background:
    rgba(4,10,18,0.7);

  border:
    1px solid
    rgba(100,130,170,0.12);

}


.sign-list {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

  margin-top: 14px;

}


.sign {

  padding: 8px 12px;

  border-radius: 999px;

  border:
    1px solid
    rgba(100,130,170,0.2);

  background:
    rgba(10,20,32,0.8);

  color: #c3cedb;

  font-size: 13px;

}


.no-signs {

  margin: 12px 0 0;

  color: #8291a5;

  font-size: 13px;

  line-height: 1.6;

}


/* =====================================================
   RECOMMENDATION
===================================================== */

.recommendation {

  margin-top: 20px;

  padding: 20px;

  border-radius: 14px;

  background:
    rgba(36,201,135,0.06);

  border:
    1px solid
    rgba(36,201,135,0.15);

}


.recommendation-title {

  display: flex;

  align-items: center;

  gap: 8px;

  color: #41e6a1;

  font-size: 12px;

  font-weight: 800;

  text-transform: uppercase;

  letter-spacing: 1px;

}


.bulb {

  font-size: 18px;

}


.recommendation p {

  margin: 12px 0 0;

  color: #c3cedb;

  line-height: 1.6;

  font-size: 14px;

}


/* =====================================================
   SOURCE
===================================================== */

.source-box {

  margin-top: 18px;

  padding: 16px 18px;

  border-radius: 12px;

  background:
    rgba(255,255,255,0.025);

  border:
    1px solid
    rgba(100,130,170,0.1);

}


.source-box strong {

  display: block;

  margin-top: 7px;

  color: #c3cedb;

  font-size: 13px;

}


/* =====================================================
   RESEARCH NOTE
===================================================== */

.research-note {

  margin-top: 22px;

  padding: 18px;

  border-radius: 14px;

  background:
    rgba(240,184,76,0.045);

  border:
    1px solid
    rgba(240,184,76,0.14);

}


.research-title {

  color: #f0b84c;

  font-size: 13px;

  font-weight: 800;

}


.research-note p {

  margin: 9px 0 0;

  color: #8997a8;

  font-size: 12px;

  line-height: 1.6;

}


/* =====================================================
   ACTIONS
===================================================== */

.result-actions {

  display: flex;

  justify-content: flex-end;

  gap: 12px;

  margin-top: 28px;

}


.primary-button,
.secondary-button,
.empty-button {

  padding: 13px 20px;

  border-radius: 10px;

  font-weight: 800;

  cursor: pointer;

  font-size: 14px;

  transition:
    0.2s ease;

}


.primary-button {

  border: none;

  background: #24c987;

  color: #04120c;

}


.primary-button:hover {

  filter: brightness(1.08);

  transform: translateY(-1px);

}


.secondary-button {

  border:
    1px solid
    rgba(100,130,170,0.3);

  background: transparent;

  color: white;

}


.secondary-button:hover {

  border-color: #41e6a1;

  color: #41e6a1;

}


/* =====================================================
   FOOTER NOTE
===================================================== */

.result-note {

  margin-top: 25px;

  text-align: center;

  color: #63748a;

  font-size: 12px;

  line-height: 1.7;

}


/* =====================================================
   EMPTY
===================================================== */

.result-empty {

  max-width: 500px;

  margin: 100px auto;

  text-align: center;

}


.result-icon {

  font-size: 55px;

}


.result-empty h1 {

  margin: 15px 0 8px;

}


.result-empty p {

  color: #8291a5;

}


.empty-button {

  margin-top: 20px;

  border: none;

  background: #24c987;

  color: #04120c;

}


/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 800px) {

  .result-header h1 {

    font-size: 40px;

  }


  .result-grid {

    grid-template-columns: 1fr;

  }


  .forecast-grid {

    grid-template-columns:
      repeat(2, 1fr);

  }

}


@media (max-width: 600px) {

  .result-page {

    padding:
      90px 14px 50px;

  }


  .result-card {

    padding: 20px;

    border-radius: 18px;

  }


  .result-header h1 {

    font-size: 34px;

  }


  .result-food h2 {

    font-size: 24px;

  }


  .spoilage-main {

    align-items: flex-start;

    flex-direction: column;

  }


  .forecast-grid {

    grid-template-columns: 1fr 1fr;

  }


  .result-actions {

    flex-direction: column;

  }


  .primary-button,
  .secondary-button {

    width: 100%;

  }

}


@media (max-width: 420px) {

  .forecast-grid {

    grid-template-columns: 1fr;

  }

}

`;