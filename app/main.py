from decouple import config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .routers import auth, users, vendors, instruments, maintenance, inventory, reports, settings_router, pdf_reports

app = FastAPI(title='CleanRun IMMS', version='2.0.0', docs_url='/api/docs', redoc_url='/api/redoc')

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vendors.router)
app.include_router(instruments.router)
app.include_router(maintenance.router)
app.include_router(inventory.router)
app.include_router(reports.router)
app.include_router(pdf_reports.router)
app.include_router(settings_router.router)

# ── Static files (media uploads) ──────────────────────────────────────────────
MEDIA_ROOT = config('MEDIA_ROOT', default='media')
os.makedirs(MEDIA_ROOT, exist_ok=True)
app.mount('/media', StaticFiles(directory=MEDIA_ROOT), name='media')

# ── Serve React SPA ───────────────────────────────────────────────────────────
FRONTEND_DIST = 'frontend/dist'
if os.path.isdir(FRONTEND_DIST):
    app.mount('/assets', StaticFiles(directory=f'{FRONTEND_DIST}/assets'), name='assets')

    @app.get('/{full_path:path}', include_in_schema=False)
    def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(f'{FRONTEND_DIST}/index.html')
