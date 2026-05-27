"""Storage source management endpoints."""
import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db, StorageSource, ScanJob, MusicFile, User
from app.services.webdav import get_provider

router = APIRouter(prefix="/api/sources", tags=["sources"])


class SourceCreate(BaseModel):
    name: str
    provider_type: str          # nextcloud | s3 | onedrive | googledrive
    config: dict
    scan_paths: List[str] = []


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None
    scan_paths: Optional[List[str]] = None
    is_active: Optional[bool] = None


class SourceOut(BaseModel):
    id: int
    name: str
    provider_type: str
    config: dict = {}
    scan_paths: List[str]
    is_active: bool
    last_scan_at: Optional[str]
    file_count: int = 0

    class Config:
        from_attributes = True


def _source_out(source: StorageSource, db: Session) -> SourceOut:
    file_count = db.query(MusicFile).filter_by(source_id=source.id).count()
    return SourceOut(
        id=source.id,
        name=source.name,
        provider_type=source.provider_type,
        config=source.config or {},
        scan_paths=source.scan_paths or [],
        is_active=source.is_active,
        last_scan_at=source.last_scan_at.isoformat() if source.last_scan_at else None,
        file_count=file_count,
    )


@router.get("/", response_model=List[SourceOut])
def list_sources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sources = db.query(StorageSource).filter_by(user_id=current_user.id).all()
    return [_source_out(s, db) for s in sources]


@router.post("/", response_model=SourceOut, status_code=201)
def create_source(
    req: SourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.provider_type not in ("nextcloud", "s3", "onedrive", "googledrive"):
        raise HTTPException(400, f"Unknown provider type: {req.provider_type}")

    source = StorageSource(
        user_id=current_user.id,
        name=req.name,
        provider_type=req.provider_type,
        config=req.config,
        scan_paths=req.scan_paths,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return _source_out(source, db)


@router.get("/{source_id}", response_model=SourceOut)
def get_source(
    source_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.query(StorageSource).filter_by(id=source_id, user_id=current_user.id).first()
    if not source:
        raise HTTPException(404, "Source not found")
    return _source_out(source, db)


@router.patch("/{source_id}", response_model=SourceOut)
def update_source(
    source_id: int,
    req: SourceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.query(StorageSource).filter_by(id=source_id, user_id=current_user.id).first()
    if not source:
        raise HTTPException(404, "Source not found")

    if req.name is not None:
        source.name = req.name
    if req.config is not None:
        source.config = req.config
    if req.scan_paths is not None:
        source.scan_paths = req.scan_paths
    if req.is_active is not None:
        source.is_active = req.is_active

    db.commit()
    db.refresh(source)
    return _source_out(source, db)


@router.delete("/{source_id}", status_code=204)
def delete_source(
    source_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.query(StorageSource).filter_by(id=source_id, user_id=current_user.id).first()
    if not source:
        raise HTTPException(404, "Source not found")
    db.delete(source)
    db.commit()


@router.post("/{source_id}/test")
async def test_source(
    source_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.query(StorageSource).filter_by(id=source_id, user_id=current_user.id).first()
    if not source:
        raise HTTPException(404, "Source not found")

    try:
        provider = get_provider(source.provider_type, source.config)
        ok = await provider.test_connection()
        return {"success": ok, "message": "Connection successful" if ok else "Connection failed"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.get("/{source_id}/browse")
async def browse_source(
    source_id: int,
    path: str = "/",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List a directory inside the storage source (for folder picker)."""
    source = db.query(StorageSource).filter_by(id=source_id, user_id=current_user.id).first()
    if not source:
        raise HTTPException(404, "Source not found")

    try:
        provider = get_provider(source.provider_type, source.config)
        entries = await provider.list_directory(path)
        return {
            "path": path,
            "entries": [
                {
                    "path": e.path,
                    "name": e.name,
                    "is_dir": e.is_dir,
                    "size": e.size,
                    "last_modified": e.last_modified.isoformat() if e.last_modified else None,
                }
                for e in entries
            ],
        }
    except Exception as e:
        raise HTTPException(500, f"Browse failed: {e}")


class ScanRequest(BaseModel):
    pass  # reserved for future options


@router.post("/{source_id}/scan", status_code=202)
async def trigger_scan(
    source_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger a background scan for this source."""
    from app.services.scanner import run_scan

    source = db.query(StorageSource).filter_by(id=source_id, user_id=current_user.id).first()
    if not source:
        raise HTTPException(404, "Source not found")

    # Cancel any existing running job
    running = (
        db.query(ScanJob)
        .filter_by(source_id=source_id, status="running")
        .first()
    )
    if running:
        running.status = "cancelled"
        db.commit()

    job = ScanJob(
        user_id=current_user.id,
        source_id=source_id,
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    from app.services.scanner import _running_tasks
    task = asyncio.create_task(run_scan(job.id))
    _running_tasks.add(task)
    task.add_done_callback(_running_tasks.discard)

    return {"job_id": job.id, "status": "pending"}


@router.get("/{source_id}/jobs")
def list_jobs(
    source_id: int,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    jobs = (
        db.query(ScanJob)
        .filter_by(source_id=source_id, user_id=current_user.id)
        .order_by(ScanJob.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": j.id,
            "status": j.status,
            "files_found": j.files_found,
            "files_tagged": j.files_tagged,
            "files_matched": j.files_matched,
            "files_applied": j.files_applied,
            "error_message": j.error_message,
            "started_at": j.started_at.isoformat() if j.started_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]
