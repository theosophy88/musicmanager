"""
Background scheduler: runs periodic scans for users who set a schedule.
Uses APScheduler with an in-process executor.
"""
import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal, User, StorageSource, ScanJob
from app.services.scanner import run_scan

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler = AsyncIOScheduler()


def start():
    if not _scheduler.running:
        _scheduler.add_job(
            _periodic_scan_check,
            "interval",
            minutes=30,
            id="periodic_scan_check",
            replace_existing=True,
        )
        _scheduler.start()
        logger.info("Scheduler started")


def stop():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)


async def _periodic_scan_check():
    """Check all users who want periodic scans and dispatch jobs for due ones."""
    db: Session = SessionLocal()
    try:
        users = db.query(User).filter(
            User.is_active == True,
            User.scan_schedule_hours > 0,
        ).all()

        for user in users:
            sources = db.query(StorageSource).filter_by(
                user_id=user.id, is_active=True
            ).all()
            for source in sources:
                if _scan_is_due(source, user.scan_schedule_hours):
                    job = ScanJob(
                        user_id=user.id,
                        source_id=source.id,
                        status="pending",
                    )
                    db.add(job)
                    db.commit()
                    asyncio.create_task(run_scan(job.id))
                    logger.info(
                        "Triggered scheduled scan: user=%d source=%d job=%d",
                        user.id, source.id, job.id,
                    )
    finally:
        db.close()


def _scan_is_due(source: StorageSource, interval_hours: int) -> bool:
    if source.last_scan_at is None:
        return True
    elapsed = (datetime.utcnow() - source.last_scan_at).total_seconds() / 3600
    return elapsed >= interval_hours
