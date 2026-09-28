from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_database
from app.routes.analysis import router as analysis_router
from app.routes.history import router as history_router
from app.routes.weather import router as weather_router
from app.routes.iot import router as iot_router


app = FastAPI(
    title="FreshLens AI API",
    description="AI-powered food freshness analysis API",
    version="1.0.0",
)
init_database()

# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# ============================================================
# ROUTES
# ============================================================

app.include_router(
    analysis_router,
    prefix="/api",
)
app.include_router(
    history_router,
    prefix="/api",
)
app.include_router(
    weather_router, 
    prefix="/api")
app.include_router(
    iot_router, 
    prefix="/api")


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {

        "status":
            "online",

        "service":
            "FreshLens AI API",

        "version":
            "1.0.0",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():

    return {

        "status":
            "healthy"
    }