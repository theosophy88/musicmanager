"""
SQLAlchemy models and DB session management.
Designed for future-proofing: storage_sources are provider-agnostic.
"""
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime,
    Boolean, Text, ForeignKey, JSON, BigInteger
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////data/musicmanager.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(256), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    scan_schedule_hours = Column(Integer, default=0)   # 0 = manual only
    created_at = Column(DateTime, default=datetime.utcnow)

    sources = relationship("StorageSource", back_populates="user", cascade="all, delete-orphan")
    files = relationship("MusicFile", back_populates="user", cascade="all, delete-orphan")
    scan_jobs = relationship("ScanJob", back_populates="user", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Storage Sources  (Nextcloud today, S3/OneDrive/GDrive tomorrow)
# ---------------------------------------------------------------------------
class StorageSource(Base):
    __tablename__ = "storage_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False)
    # provider_type: 'nextcloud' | 's3' | 'onedrive' | 'googledrive'
    provider_type = Column(String(32), nullable=False)
    # Provider-specific config stored as JSON.
    # Nextcloud: {url, username, password, verify_ssl}
    # S3:        {bucket, region, access_key, secret_key, prefix}
    # OneDrive:  {tenant_id, client_id, client_secret, drive_id}
    config = Column(JSON, nullable=False, default=dict)
    # Paths inside the storage root that should be scanned
    scan_paths = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, default=True)
    last_scan_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sources")
    files = relationship("MusicFile", back_populates="source", cascade="all, delete-orphan")
    scan_jobs = relationship("ScanJob", back_populates="source", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Scan Jobs
# ---------------------------------------------------------------------------
class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(Integer, ForeignKey("storage_sources.id", ondelete="CASCADE"), nullable=False)
    # status: pending | running | completed | failed | cancelled
    status = Column(String(16), default="pending")
    files_found = Column(Integer, default=0)
    files_tagged = Column(Integer, default=0)   # current tags read
    files_matched = Column(Integer, default=0)  # MB match found
    files_applied = Column(Integer, default=0)  # tags written back
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="scan_jobs")
    source = relationship("StorageSource", back_populates="scan_jobs")


# ---------------------------------------------------------------------------
# Music Files
# ---------------------------------------------------------------------------
class MusicFile(Base):
    __tablename__ = "music_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(Integer, ForeignKey("storage_sources.id", ondelete="CASCADE"), nullable=False)
    path = Column(String(2048), nullable=False)          # full path in storage
    filename = Column(String(512), nullable=False)
    size = Column(BigInteger, nullable=True)
    last_modified = Column(DateTime, nullable=True)
    etag = Column(String(256), nullable=True)            # WebDAV/S3 ETag for change detection
    mime_type = Column(String(128), nullable=True)
    # scan_status: pending | scanning | scanned | error
    scan_status = Column(String(16), default="pending")
    # mb_status: unmatched | searching | matched | applied | skipped | error
    mb_status = Column(String(16), default="unmatched")
    duration = Column(Float, nullable=True)              # seconds
    bitrate = Column(Integer, nullable=True)             # kbps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="files")
    source = relationship("StorageSource", back_populates="files")
    current_tags = relationship("CurrentTags", back_populates="file",
                                uselist=False, cascade="all, delete-orphan")
    proposed_tags = relationship("ProposedTags", back_populates="file",
                                 uselist=False, cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Current ID3 Tags (read from the actual file)
# ---------------------------------------------------------------------------
class CurrentTags(Base):
    __tablename__ = "current_tags"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("music_files.id", ondelete="CASCADE"), unique=True)
    title = Column(String(512), nullable=True)
    artist = Column(String(512), nullable=True)
    album = Column(String(512), nullable=True)
    album_artist = Column(String(512), nullable=True)
    year = Column(String(16), nullable=True)
    track_number = Column(String(16), nullable=True)
    disc_number = Column(String(16), nullable=True)
    genre = Column(String(128), nullable=True)
    comment = Column(Text, nullable=True)
    composer = Column(String(512), nullable=True)
    label = Column(String(256), nullable=True)

    file = relationship("MusicFile", back_populates="current_tags")


# ---------------------------------------------------------------------------
# Proposed ID3 Tags (from MusicBrainz / AcoustID / manual)
# ---------------------------------------------------------------------------
class ProposedTags(Base):
    __tablename__ = "proposed_tags"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("music_files.id", ondelete="CASCADE"), unique=True)
    mb_recording_id = Column(String(64), nullable=True)
    mb_release_id = Column(String(64), nullable=True)
    mb_artist_id = Column(String(64), nullable=True)
    title = Column(String(512), nullable=True)
    artist = Column(String(512), nullable=True)
    album = Column(String(512), nullable=True)
    album_artist = Column(String(512), nullable=True)
    year = Column(String(16), nullable=True)
    track_number = Column(String(16), nullable=True)
    disc_number = Column(String(16), nullable=True)
    genre = Column(String(128), nullable=True)
    comment = Column(Text, nullable=True)
    composer = Column(String(512), nullable=True)
    label = Column(String(256), nullable=True)
    confidence = Column(Float, nullable=True)           # 0.0 – 1.0
    # match_source: musicbrainz | acoustid | manual
    match_source = Column(String(32), nullable=True)

    file = relationship("MusicFile", back_populates="proposed_tags")


def create_tables():
    Base.metadata.create_all(bind=engine)
