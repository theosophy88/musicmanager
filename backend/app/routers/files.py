"""
Music file endpoints:
  - List/search files with pagination
  - Get file details + current/proposed tags
  - Manually update proposed tags
  - Apply tags (write back to storage)
  - Batch apply
  - Stream audio (proxy through backend)
  - Stats
"""
import asyncio
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import (
    get_db, MusicFile, CurrentTags, ProposedTags,
    StorageSource, User,
)
from app.services import scanner as scanner_svc
from app.services.webdav import get_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["files"])


# ── Output models ────────────────────────────────────────────────────────────

class TagOut(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    album_artist: Optional[str] = None
    year: Optional[str] = None
    track_number: Optional[str] = None
    disc_number: Optional[str] = None
    genre: Optional[str] = None
    comment: Optional[str] = None
    composer: Optional[str] = None
    label: Optional[str] = None


class ProposedTagOut(TagOut):
    mb_recording_id: Optional[str] = None
    mb_release_id: Optional[str] = None
    mb_artist_id: Optional[str] = None
    confidence: Optional[float] = None
    match_source: Optional[str] = None


class FileOut(BaseModel):
    id: int
    source_id: int
    path: str
    filename: str
    size: Optional[int]
    duration: Optional[float]
    bitrate: Optional[int]
    mime_type: Optional[str]
    scan_status: str
    mb_status: str
    current_tags: Optional[TagOut]
    proposed_tags: Optional[ProposedTagOut]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


class FileListItem(BaseModel):
    id: int
    source_id: int
    filename: str
    path: str
    size: Optional[int]
    duration: Optional[float]
    scan_status: str
    mb_status: str
    current_title: Optional[str]
    current_artist: Optional[str]
    current_album: Optional[str]
    proposed_title: Optional[str]
    proposed_artist: Optional[str]
    proposed_confidence: Optional[float]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _file_list_item(mf: MusicFile) -> FileListItem:
    ct = mf.current_tags
    pt = mf.proposed_tags
    return FileListItem(
        id=mf.id,
        source_id=mf.source_id,
        filename=mf.filename,
        path=mf.path,
        size=mf.size,
        duration=mf.duration,
        scan_status=mf.scan_status,
        mb_status=mf.mb_status,
        current_title=ct.title if ct else None,
        current_artist=ct.artist if ct else None,
        current_album=ct.album if ct else None,
        proposed_title=pt.title if pt else None,
        proposed_artist=pt.artist if pt else None,
        proposed_confidence=pt.confidence if pt else None,
    )


def _tag_out(ct: Optional[CurrentTags]) -> Optional[TagOut]:
    if ct is None:
        return None
    return TagOut(
        title=ct.title, artist=ct.artist, album=ct.album,
        album_artist=ct.album_artist, year=ct.year,
        track_number=ct.track_number, disc_number=ct.disc_number,
        genre=ct.genre, comment=ct.comment, composer=ct.composer,
        label=ct.label,
    )


def _prop_out(pt: Optional[ProposedTags]) -> Optional[ProposedTagOut]:
    if pt is None:
        return None
    return ProposedTagOut(
        title=pt.title, artist=pt.artist, album=pt.album,
        album_artist=pt.album_artist, year=pt.year,
        track_number=pt.track_number, disc_number=pt.disc_number,
        genre=pt.genre, comment=pt.comment, composer=pt.composer,
        label=pt.label,
        mb_recording_id=pt.mb_recording_id,
        mb_release_id=pt.mb_release_id,
        mb_artist_id=pt.mb_artist_id,
        confidence=pt.confidence,
        match_source=pt.match_source,
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=dict)
def list_files(
    source_id: Optional[int] = None,
    mb_status: Optional[str] = None,          # filter by mb_status
    scan_status: Optional[str] = None,
    search: Optional[str] = None,             # search in filename/title/artist
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: str = "filename",
    sort_dir: str = "asc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(MusicFile).filter_by(user_id=current_user.id)

    if source_id:
        q = q.filter(MusicFile.source_id == source_id)
    if mb_status:
        q = q.filter(MusicFile.mb_status == mb_status)
    if scan_status:
        q = q.filter(MusicFile.scan_status == scan_status)
    if search:
        pattern = f"%{search}%"
        q = q.outerjoin(CurrentTags).filter(
            or_(
                MusicFile.filename.ilike(pattern),
                CurrentTags.title.ilike(pattern),
                CurrentTags.artist.ilike(pattern),
                CurrentTags.album.ilike(pattern),
            )
        )

    total = q.count()

    # Sorting
    sort_col = {
        "filename": MusicFile.filename,
        "size": MusicFile.size,
        "duration": MusicFile.duration,
        "mb_status": MusicFile.mb_status,
        "updated_at": MusicFile.updated_at,
    }.get(sort_by, MusicFile.filename)

    if sort_dir == "desc":
        q = q.order_by(sort_col.desc())
    else:
        q = q.order_by(sort_col.asc())

    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [_file_list_item(mf) for mf in items],
    }


@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(MusicFile).filter_by(user_id=current_user.id)
    total = base.count()
    scanned = base.filter(MusicFile.scan_status == "scanned").count()
    matched = base.filter(MusicFile.mb_status == "matched").count()
    applied = base.filter(MusicFile.mb_status == "applied").count()
    unmatched = base.filter(MusicFile.mb_status == "unmatched").count()
    errors = base.filter(MusicFile.scan_status == "error").count()

    from app.database import ScanJob
    last_job = (
        db.query(ScanJob)
        .filter_by(user_id=current_user.id)
        .order_by(ScanJob.created_at.desc())
        .first()
    )

    return {
        "total_files": total,
        "scanned": scanned,
        "matched": matched,
        "applied": applied,
        "unmatched": unmatched,
        "errors": errors,
        "pending_review": matched,  # matched but not yet applied
        "last_job": {
            "id": last_job.id,
            "status": last_job.status,
            "created_at": last_job.created_at.isoformat(),
        } if last_job else None,
    }


@router.get("/{file_id}", response_model=FileOut)
def get_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mf = db.query(MusicFile).filter_by(id=file_id, user_id=current_user.id).first()
    if not mf:
        raise HTTPException(404, "File not found")
    return FileOut(
        id=mf.id,
        source_id=mf.source_id,
        path=mf.path,
        filename=mf.filename,
        size=mf.size,
        duration=mf.duration,
        bitrate=mf.bitrate,
        mime_type=mf.mime_type,
        scan_status=mf.scan_status,
        mb_status=mf.mb_status,
        current_tags=_tag_out(mf.current_tags),
        proposed_tags=_prop_out(mf.proposed_tags),
        updated_at=mf.updated_at.isoformat() if mf.updated_at else None,
    )


class TagUpdate(BaseModel):
    """Used for manually editing proposed tags before applying."""
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    album_artist: Optional[str] = None
    year: Optional[str] = None
    track_number: Optional[str] = None
    disc_number: Optional[str] = None
    genre: Optional[str] = None
    comment: Optional[str] = None
    composer: Optional[str] = None
    label: Optional[str] = None


@router.patch("/{file_id}/proposed", response_model=ProposedTagOut)
def update_proposed_tags(
    file_id: int,
    req: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit proposed tags manually (without re-running MB lookup)."""
    mf = db.query(MusicFile).filter_by(id=file_id, user_id=current_user.id).first()
    if not mf:
        raise HTTPException(404, "File not found")

    pt = mf.proposed_tags
    if pt is None:
        pt = ProposedTags(file_id=file_id, match_source="manual", confidence=1.0)
        db.add(pt)

    for field, value in req.model_dump(exclude_none=True).items():
        setattr(pt, field, value)

    if pt.match_source != "manual":
        pt.match_source = "manual"

    mf.mb_status = "matched"
    db.commit()
    db.refresh(pt)
    return _prop_out(pt)


@router.post("/{file_id}/skip", status_code=200)
def skip_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mf = db.query(MusicFile).filter_by(id=file_id, user_id=current_user.id).first()
    if not mf:
        raise HTTPException(404, "File not found")
    mf.mb_status = "skipped"
    db.commit()
    return {"status": "skipped"}


@router.post("/{file_id}/apply")
async def apply_tags(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Write the proposed tags back to the actual file in storage."""
    mf = db.query(MusicFile).filter_by(id=file_id, user_id=current_user.id).first()
    if not mf:
        raise HTTPException(404, "File not found")

    pt = mf.proposed_tags
    if not pt:
        raise HTTPException(400, "No proposed tags to apply")

    tags_dict = {
        "title": pt.title, "artist": pt.artist, "album": pt.album,
        "album_artist": pt.album_artist, "year": pt.year,
        "track_number": pt.track_number, "disc_number": pt.disc_number,
        "genre": pt.genre, "comment": pt.comment, "composer": pt.composer,
        "label": pt.label,
    }

    ok = await scanner_svc.apply_tags_to_file(db, file_id, current_user.id, tags_dict)
    if not ok:
        raise HTTPException(500, "Failed to write tags to file")
    return {"status": "applied"}


class BatchApplyRequest(BaseModel):
    file_ids: List[int]
    action: str = "apply"  # apply | skip | reset_mb


@router.post("/batch")
async def batch_action(
    req: BatchApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Perform an action on multiple files."""
    results = {"success": 0, "failed": 0, "errors": []}

    for file_id in req.file_ids:
        mf = db.query(MusicFile).filter_by(id=file_id, user_id=current_user.id).first()
        if not mf:
            results["failed"] += 1
            continue

        if req.action == "apply":
            pt = mf.proposed_tags
            if not pt:
                results["failed"] += 1
                continue
            tags_dict = {
                "title": pt.title, "artist": pt.artist, "album": pt.album,
                "album_artist": pt.album_artist, "year": pt.year,
                "track_number": pt.track_number, "disc_number": pt.disc_number,
                "genre": pt.genre, "comment": pt.comment, "composer": pt.composer,
                "label": pt.label,
            }
            ok = await scanner_svc.apply_tags_to_file(db, file_id, current_user.id, tags_dict)
            if ok:
                results["success"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(f"File {file_id}: write failed")

        elif req.action == "skip":
            mf.mb_status = "skipped"
            db.commit()
            results["success"] += 1

        elif req.action == "reset_mb":
            mf.mb_status = "unmatched"
            if mf.proposed_tags:
                db.delete(mf.proposed_tags)
            db.commit()
            results["success"] += 1

    return results


@router.post("/{file_id}/rematch")
async def rematch_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Force a fresh MusicBrainz lookup for one file."""
    from app.services import musicbrainz as mb_svc

    mf = db.query(MusicFile).filter_by(id=file_id, user_id=current_user.id).first()
    if not mf:
        raise HTTPException(404, "File not found")

    ct = mf.current_tags
    if not ct:
        raise HTTPException(400, "No current tags — run scan first")

    mf.mb_status = "searching"
    db.commit()

    mb_result = await mb_svc.lookup(
        title=ct.title, artist=ct.artist,
        album=ct.album, duration_secs=mf.duration,
    )

    if mb_result and mb_result.confidence >= 0.3:
        pt = mf.proposed_tags
        if pt is None:
            pt = ProposedTags(file_id=mf.id)
            db.add(pt)
        pt.mb_recording_id = mb_result.recording_id
        pt.mb_release_id = mb_result.release_id
        pt.title = mb_result.title
        pt.artist = mb_result.artist
        pt.album = mb_result.album
        pt.album_artist = mb_result.album_artist
        pt.year = mb_result.year
        pt.track_number = mb_result.track_number
        pt.disc_number = mb_result.disc_number
        pt.genre = mb_result.genre
        pt.confidence = mb_result.confidence
        pt.match_source = mb_result.source
        mf.mb_status = "matched"
    else:
        mf.mb_status = "unmatched"

    db.commit()
    return {"mb_status": mf.mb_status, "confidence": mb_result.confidence if mb_result else None}


@router.get("/{file_id}/stream")
async def stream_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Proxy audio stream from storage provider."""
    mf = db.query(MusicFile).filter_by(id=file_id, user_id=current_user.id).first()
    if not mf:
        raise HTTPException(404, "File not found")

    source = db.query(StorageSource).get(mf.source_id)
    if not source:
        raise HTTPException(404, "Source not found")

    provider = get_provider(source.provider_type, source.config)

    # Detect content type
    mime = mf.mime_type or "audio/mpeg"

    async def _stream():
        async for chunk in provider.stream_bytes(mf.path):
            yield chunk

    return StreamingResponse(
        _stream(),
        media_type=mime,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{mf.filename}"',
        },
    )
