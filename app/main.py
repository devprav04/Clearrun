import logging
import os
import time
import uuid

from decouple import config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .routers import auth, users, vendors, instruments, maintenance, inventory, reports, settings_router, pdf_reports
from .database import engine, SessionLocal
from . import models

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s — %(message)s',
)
log = logging.getLogger('cleanrun')

app = FastAPI(title='CleanRun IMMS', version='2.0.0', docs_url='/api/docs', redoc_url='/api/redoc')


@app.on_event('startup')
def on_startup():
    log.info('Running database migrations...')
    models.Base.metadata.create_all(bind=engine)
    log.info('Database ready.')

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── Request logging + unique request ID ──────────────────────────────────────
@app.middleware('http')
async def request_logging_middleware(request: Request, call_next):
    rid = str(uuid.uuid4())[:8]
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000)
    log.info('%s %s %s %dms req_id=%s', request.method, request.url.path, response.status_code, elapsed, rid)
    response.headers['X-Request-ID'] = rid
    return response

# ── Global error handler — never expose stack traces to clients ───────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.exception('Unhandled error on %s %s', request.method, request.url.path)
    return JSONResponse(status_code=500, content={'detail': 'Internal server error.'})

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
