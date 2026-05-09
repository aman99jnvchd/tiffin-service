import os
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .db.session import engine
from .models import models
from .api import meals, admin, vendors, auth, orders, addresses, uploads, users

# Initialize Database Tables
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"❌ Database connection failed: {e}")

app = FastAPI(
    title="Tiffin Service API",
    version="1.0.0",
    description="Backend for localized tiffin delivery service"
)

# --- 1. Static Files Setup ---
UPLOAD_DIR = "static/house_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- 2. Middleware & Static Serving ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1515"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# --- 3. Custom Error Handlers ---

# Handle validation errors (e.g., bad phone number, missing fields)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": 422,
            "message": "Validation Error",
            "data": exc.errors()
        }
    )

# Handle all other system crashes
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": 500,
            "message": f"Critical Error: {str(exc)}",
            "data": None
        }
    )

# --- 4. Route Registration ---
# Prefixing /api/v1 for versioning
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])
app.include_router(vendors.router, prefix="/api/v1", tags=["Vendors"])
app.include_router(meals.router, prefix="/api/v1", tags=["Meals"])
app.include_router(addresses.router, prefix="/api/v1", tags=["Addresses"])
app.include_router(orders.router, prefix="/api/v1", tags=["Orders"])
app.include_router(uploads.router, prefix="/api/v1", tags=["Uploads"])
app.include_router(users.router, prefix="/api/v1", tags=["Users"])

# --- 5. Base Health Check ---
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": 200,
        "message": "API is online",
        "city": "Chandigarh (CHD)",
        "docs": "/docs"
    }
