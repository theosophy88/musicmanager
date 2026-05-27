"""
Tagger service: reads current ID3 tags from audio bytes and
writes proposed tags back using mutagen.

Works on an in-memory bytes buffer so we avoid temp files
(though we fall back to temp files for formats that require seekable streams).
"""
import io
import logging
import os
import tempfile
from dataclasses import dataclass, field
from typing import Optional

from mutagen import File as MutagenFile
from mutagen.id3 import (
    ID3, ID3NoHeaderError,
    TIT2, TPE1, TALB, TPE2, TDRC, TRCK, TPOS, TCON, COMM, TCOM, TPUB,
)
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.oggvorbis import OggVorbis
from mutagen.mp4 import MP4
from mutagen.asf import ASF
from mutagen.apev2 import APEv2

logger = logging.getLogger(__name__)


@dataclass
class TagData:
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
    duration: Optional[float] = None
    bitrate: Optional[int] = None


def _safe_str(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, list):
        value = value[0] if value else None
    if value is None:
        return None
    return str(value).strip() or None


def _read_id3_tags(audio) -> TagData:
    """Read from mutagen ID3-based file (MP3, AIFF, etc.)."""
    tags = audio.tags or {}

    def g(key):
        frame = tags.get(key)
        if frame is None:
            return None
        if hasattr(frame, "text"):
            return _safe_str(frame.text[0]) if frame.text else None
        return _safe_str(str(frame))

    comment = None
    for key in list(tags.keys()):
        if key.startswith("COMM"):
            frame = tags[key]
            comment = _safe_str(frame.text[0]) if frame.text else None
            break

    return TagData(
        title=g("TIT2"),
        artist=g("TPE1"),
        album=g("TALB"),
        album_artist=g("TPE2"),
        year=g("TDRC"),
        track_number=g("TRCK"),
        disc_number=g("TPOS"),
        genre=g("TCON"),
        comment=comment,
        composer=g("TCOM"),
        label=g("TPUB"),
        duration=round(audio.info.length, 2) if audio.info else None,
        bitrate=getattr(audio.info, "bitrate", None),
    )


def _read_vorbis_tags(audio) -> TagData:
    """Read from Ogg/FLAC vorbis comments."""
    def g(*keys):
        for k in keys:
            v = audio.get(k.lower(), audio.get(k.upper(), []))
            if v:
                return _safe_str(v[0])
        return None

    return TagData(
        title=g("title"),
        artist=g("artist"),
        album=g("album"),
        album_artist=g("albumartist", "album_artist"),
        year=g("date", "year"),
        track_number=g("tracknumber", "track"),
        disc_number=g("discnumber", "disc"),
        genre=g("genre"),
        comment=g("comment"),
        composer=g("composer"),
        label=g("organization", "label", "publisher"),
        duration=round(audio.info.length, 2) if audio.info else None,
        bitrate=getattr(audio.info, "bitrate", None),
    )


def _read_mp4_tags(audio) -> TagData:
    """Read from MP4/M4A iTunes tags."""
    tags = audio.tags or {}

    def g(key):
        v = tags.get(key)
        if v is None:
            return None
        return _safe_str(v[0]) if isinstance(v, list) else _safe_str(str(v))

    track = tags.get("trkn", [(None,)])[0] if tags.get("trkn") else None
    disc = tags.get("disk", [(None,)])[0] if tags.get("disk") else None

    return TagData(
        title=g("\xa9nam"),
        artist=g("\xa9ART"),
        album=g("\xa9alb"),
        album_artist=g("aART"),
        year=g("\xa9day"),
        track_number=str(track[0]) if track and track[0] else None,
        disc_number=str(disc[0]) if disc and disc[0] else None,
        genre=g("\xa9gen"),
        comment=g("\xa9cmt"),
        composer=g("\xa9wrt"),
        label=g("----:com.apple.iTunes:LABEL"),
        duration=round(audio.info.length, 2) if audio.info else None,
        bitrate=getattr(audio.info, "bitrate", None),
    )


def read_tags_from_bytes(data: bytes, filename: str) -> Optional[TagData]:
    """Read ID3/metadata tags from raw file bytes."""
    ext = os.path.splitext(filename)[1].lower()
    buf = io.BytesIO(data)

    try:
        # mutagen needs a seekable file-like
        audio = MutagenFile(buf, filename=filename)
        if audio is None:
            return None
        if isinstance(audio, (MP3,)):
            return _read_id3_tags(audio)
        elif isinstance(audio, (OggVorbis, FLAC)):
            return _read_vorbis_tags(audio)
        elif isinstance(audio, MP4):
            return _read_mp4_tags(audio)
        else:
            # Generic fallback — try vorbis-style, then ID3
            if hasattr(audio, "get"):
                return _read_vorbis_tags(audio)
            if hasattr(audio, "tags") and isinstance(audio.tags, ID3):
                return _read_id3_tags(audio)
            return TagData(
                duration=round(audio.info.length, 2) if audio.info else None,
                bitrate=getattr(audio.info, "bitrate", None),
            )
    except Exception as e:
        logger.warning("read_tags_from_bytes(%s): %s", filename, e)
        return None


def write_tags_to_bytes(data: bytes, filename: str, tags: TagData) -> Optional[bytes]:
    """
    Write tags into a copy of the audio file bytes.
    Returns the modified bytes, or None on failure.
    """
    ext = os.path.splitext(filename)[1].lower()

    # Write to a temp file (mutagen save() requires a real file for some formats)
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        audio = MutagenFile(tmp_path)
        if audio is None:
            return None

        if isinstance(audio, MP3):
            _write_id3(audio, tags, tmp_path)
        elif isinstance(audio, FLAC):
            _write_vorbis(audio, tags)
            audio.save()
        elif isinstance(audio, OggVorbis):
            _write_vorbis(audio, tags)
            audio.save()
        elif isinstance(audio, MP4):
            _write_mp4(audio, tags)
            audio.save()
        else:
            return None

        with open(tmp_path, "rb") as f:
            return f.read()

    except Exception as e:
        logger.error("write_tags_to_bytes(%s): %s", filename, e)
        return None
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _write_id3(audio: MP3, tags: TagData, path: str):
    try:
        id3 = ID3(path)
    except ID3NoHeaderError:
        id3 = ID3()

    def s(tag_cls, value):
        if value:
            id3.add(tag_cls(encoding=3, text=[value]))

    s(TIT2, tags.title)
    s(TPE1, tags.artist)
    s(TALB, tags.album)
    s(TPE2, tags.album_artist)
    s(TDRC, tags.year)
    s(TRCK, tags.track_number)
    s(TPOS, tags.disc_number)
    s(TCON, tags.genre)
    s(TCOM, tags.composer)
    s(TPUB, tags.label)
    if tags.comment:
        id3.add(COMM(encoding=3, lang="eng", desc="", text=[tags.comment]))

    id3.save(path, v2_version=3)


def _write_vorbis(audio, tags: TagData):
    def s(key, value):
        if value:
            audio[key] = [value]

    s("title", tags.title)
    s("artist", tags.artist)
    s("album", tags.album)
    s("albumartist", tags.album_artist)
    s("date", tags.year)
    s("tracknumber", tags.track_number)
    s("discnumber", tags.disc_number)
    s("genre", tags.genre)
    s("comment", tags.comment)
    s("composer", tags.composer)
    s("organization", tags.label)


def _write_mp4(audio: MP4, tags: TagData):
    t = audio.tags
    if t is None:
        audio.add_tags()
        t = audio.tags

    def s(key, value):
        if value:
            t[key] = [value]

    s("\xa9nam", tags.title)
    s("\xa9ART", tags.artist)
    s("\xa9alb", tags.album)
    s("aART", tags.album_artist)
    s("\xa9day", tags.year)
    s("\xa9gen", tags.genre)
    s("\xa9cmt", tags.comment)
    s("\xa9wrt", tags.composer)

    if tags.track_number:
        try:
            tn = int(tags.track_number.split("/")[0])
            t["trkn"] = [(tn, 0)]
        except ValueError:
            pass
