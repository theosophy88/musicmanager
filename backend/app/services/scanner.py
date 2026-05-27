"""
Background scanner: discovers music files, reads tags, queries MusicBrainz.
Runs in a thread pool to avoid blocking the FastAPI event loop.
"""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.database import (
    SessionLocal, MusicFile, ScanJob, StorageSource,
    CurrentTags, ProposedTags,
)
from app.services import webdav as webdav_svc
from app.services import musicbrainz as mb_svc
from app.services import tagger as tag_svc

logger = logging.getLogger(__name__)

# File extensions we consider music
MUSIC_EXTS = webdav_svc.MUSIC_EXTENSIONS


async def run_scan(job_id: int):
    """
    Main scan coroutine.  Steps:
      1. Walk configured paths in the storage source
      2. Upsert MusicFile rows
      3. Download each new/changed file, read tags
      4. Query MusicBrainz for proposed tags
    """
    db: Session = SessionLocal()
    job: Optional[ScanJob] = db.query(ScanJob).get(job_id)
    if not job:
        db.close()
        return

    try:
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()

        source: StorageSource = db.query(StorageSource).get(job.source_id)
        if not source or not source.is_active:
            _fail(db, job, "Source not found or inactive")
            return

        provider = webdav_svc.get_provider(source.provider_type, source.config)

        scan_paths = source.scan_paths or ["/"]

        # ── Phase 1: discovery ──────────────────────────────────────────────
        logger.info("[job %d] Discovery phase on %s paths", job_id, len(scan_paths))
        discovered = []
        for root in scan_paths:
            async for entry in provider.walk(root):
                discovered.append(entry)

        job.files_found = len(discovered)
        db.commit()

        # ── Phase 2: tag reading ────────────────────────────────────────────
        logger.info("[job %d] Tagging phase: %d files", job_id, len(discovered))
        for entry in discovered:
            if job.status == "cancelled":
                break
            try:
                await _process_file(db, job, source, provider, entry)
                job.files_tagged += 1
                db.commit()
            except Exception as e:
                logger.warning("[job %d] Error processing %s: %s", job_id, entry.path, e)

        source.last_scan_at = datetime.utcnow()
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        db.commit()
        logger.info("[job %d] Scan complete", job_id)

    except Exception as e:
        _fail(db, job, str(e))
        logger.exception("[job %d] Scan failed", job_id)
    finally:
        db.close()


async def _process_file(
    db: Session,
    job: ScanJob,
    source: StorageSource,
    provider: webdav_svc.StorageProvider,
    entry: webdav_svc.FileEntry,
):
    """Upsert a file record, read its tags, and query MusicBrainz."""
    # Upsert MusicFile
    mf: Optional[MusicFile] = (
        db.query(MusicFile)
        .filter_by(user_id=job.user_id, source_id=source.id, path=entry.path)
        .first()
    )
    is_new = mf is None
    changed = (
        is_new
        or mf.etag != entry.etag
        or mf.size != entry.size
    )

    if is_new:
        mf = MusicFile(
            user_id=job.user_id,
            source_id=source.id,
            path=entry.path,
            filename=entry.name,
        )
        db.add(mf)

    mf.filename = entry.name
    mf.size = entry.size
    mf.last_modified = entry.last_modified
    mf.etag = entry.etag
    mf.mime_type = entry.mime_type

    if not changed and not is_new and mf.scan_status == "scanned":
        # Nothing changed — skip heavy processing
        return

    mf.scan_status = "scanning"
    db.commit()

    # Download file and read tags
    try:
        data = await provider.download_file(entry.path)
        tag_data = tag_svc.read_tags_from_bytes(data, entry.name)
    except Exception as e:
        mf.scan_status = "error"
        db.commit()
        logger.warning("Download/tag error for %s: %s", entry.path, e)
        return

    if tag_data:
        mf.duration = tag_data.duration
        mf.bitrate = tag_data.bitrate

        # Upsert CurrentTags
        ct = mf.current_tags
        if ct is None:
            ct = CurrentTags(file_id=mf.id)
            db.add(ct)
        ct.title = tag_data.title
        ct.artist = tag_data.artist
        ct.album = tag_data.album
        ct.album_artist = tag_data.album_artist
        ct.year = tag_data.year
        ct.track_number = tag_data.track_number
        ct.disc_number = tag_data.disc_number
        ct.genre = tag_data.genre
        ct.comment = tag_data.comment
        ct.composer = tag_data.composer
        ct.label = tag_data.label

    mf.scan_status = "scanned"
    db.commit()

    # MusicBrainz lookup (only if not already matched and applied)
    if mf.mb_status not in ("applied", "skipped") and tag_data:
        mf.mb_status = "searching"
        db.commit()

        mb_result = await mb_svc.lookup(
            title=tag_data.title,
            artist=tag_data.artist,
            album=tag_data.album,
            duration_secs=tag_data.duration,
        )

        if mb_result and mb_result.confidence >= 0.5:
            pt = mf.proposed_tags
            if pt is None:
                pt = ProposedTags(file_id=mf.id)
                db.add(pt)
            pt.mb_recording_id = mb_result.recording_id
            pt.mb_release_id = mb_result.release_id
            pt.mb_artist_id = mb_result.artist_id
            pt.title = mb_result.title
            pt.artist = mb_result.artist
            pt.album = mb_result.album
            pt.album_artist = mb_result.album_artist
            pt.year = mb_result.year
            pt.track_number = mb_result.track_number
            pt.disc_number = mb_result.disc_number
            pt.genre = mb_result.genre
            pt.label = mb_result.label
            pt.confidence = mb_result.confidence
            pt.match_source = mb_result.source
            mf.mb_status = "matched"
            job.files_matched += 1
        else:
            mf.mb_status = "unmatched"

        db.commit()


async def apply_tags_to_file(
    db: Session,
    file_id: int,
    user_id: int,
    tags: dict,
) -> bool:
    """
    Write a tag dict back to the actual file in storage.
    Returns True on success.
    """
    mf: Optional[MusicFile] = (
        db.query(MusicFile)
        .filter_by(id=file_id, user_id=user_id)
        .first()
    )
    if not mf:
        return False

    source: StorageSource = db.query(StorageSource).get(mf.source_id)
    if not source:
        return False

    provider = webdav_svc.get_provider(source.provider_type, source.config)

    try:
        data = await provider.download_file(mf.path)
    except Exception as e:
        logger.error("apply_tags: download failed for %s: %s", mf.path, e)
        return False

    tag_data = tag_svc.TagData(**{k: v for k, v in tags.items()
                                   if k in tag_svc.TagData.__dataclass_fields__})
    new_data = tag_svc.write_tags_to_bytes(data, mf.filename, tag_data)
    if new_data is None:
        return False

    try:
        ok = await provider.upload_file(mf.path, new_data)
    except Exception as e:
        logger.error("apply_tags: upload failed for %s: %s", mf.path, e)
        return False

    if ok:
        # Update CurrentTags in DB
        ct = mf.current_tags
        if ct is None:
            ct = CurrentTags(file_id=mf.id)
            db.add(ct)
        for k, v in tags.items():
            if hasattr(ct, k):
                setattr(ct, k, v)
        mf.mb_status = "applied"
        db.commit()

    return ok


def _fail(db: Session, job: ScanJob, msg: str):
    job.status = "failed"
    job.error_message = msg
    job.completed_at = datetime.utcnow()
    db.commit()
