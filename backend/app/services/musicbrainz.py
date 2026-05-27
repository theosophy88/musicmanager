"""
MusicBrainz metadata lookup service.
Uses musicbrainzngs for tag-based matching.
Optionally can be extended with AcoustID fingerprinting.
"""
import asyncio
import logging
from typing import Optional

import musicbrainzngs

logger = logging.getLogger(__name__)

musicbrainzngs.set_useragent(
    "MusicManager",
    "1.0",
    "https://github.com/yourorg/musicmanager",
)
musicbrainzngs.set_rate_limit(limit_or_interval=1.0)   # be polite


class MBResult:
    def __init__(
        self,
        recording_id: Optional[str] = None,
        release_id: Optional[str] = None,
        artist_id: Optional[str] = None,
        title: Optional[str] = None,
        artist: Optional[str] = None,
        album: Optional[str] = None,
        album_artist: Optional[str] = None,
        year: Optional[str] = None,
        track_number: Optional[str] = None,
        disc_number: Optional[str] = None,
        genre: Optional[str] = None,
        label: Optional[str] = None,
        confidence: float = 0.0,
        source: str = "musicbrainz",
    ):
        self.recording_id = recording_id
        self.release_id = release_id
        self.artist_id = artist_id
        self.title = title
        self.artist = artist
        self.album = album
        self.album_artist = album_artist
        self.year = year
        self.track_number = track_number
        self.disc_number = disc_number
        self.genre = genre
        self.label = label
        self.confidence = confidence
        self.source = source


def _extract_year(release: dict) -> Optional[str]:
    date = release.get("date", "")
    if date and len(date) >= 4:
        return date[:4]
    return None


def _extract_label(release: dict) -> Optional[str]:
    labels = release.get("label-info-list", [])
    if labels:
        label_info = labels[0]
        label = label_info.get("label", {})
        return label.get("name")
    return None


def _build_result_from_recording(recording: dict, confidence: float) -> Optional[MBResult]:
    """Parse a MusicBrainz recording dict into an MBResult."""
    title = recording.get("title")
    recording_id = recording.get("id")

    # Artist credit
    artist = None
    artist_id = None
    artist_credits = recording.get("artist-credit", [])
    if artist_credits:
        parts = []
        for credit in artist_credits:
            if isinstance(credit, dict):
                a = credit.get("artist", {})
                if not artist_id:
                    artist_id = a.get("id")
                parts.append(credit.get("name") or a.get("name", ""))
            elif isinstance(credit, str):
                parts.append(credit)
        artist = "".join(parts)

    # Pick best release
    releases = recording.get("release-list", [])
    if not releases:
        return MBResult(
            recording_id=recording_id,
            artist_id=artist_id,
            title=title,
            artist=artist,
            confidence=confidence * 0.6,  # Lower confidence without release
        )

    release = releases[0]
    release_id = release.get("id")
    album = release.get("title")
    year = _extract_year(release)

    # Track info
    track_number = None
    disc_number = None
    medium_list = release.get("medium-list", [])
    if medium_list:
        medium = medium_list[0]
        disc_number = str(medium.get("position", ""))
        track_list = medium.get("track-list", [])
        if track_list:
            track = track_list[0]
            track_number = track.get("number") or str(track.get("position", ""))

    # Album artist from release artist-credit
    album_artist = None
    rel_credits = release.get("artist-credit", [])
    if rel_credits:
        parts = []
        for credit in rel_credits:
            if isinstance(credit, dict):
                a = credit.get("artist", {})
                parts.append(credit.get("name") or a.get("name", ""))
            elif isinstance(credit, str):
                parts.append(credit)
        album_artist = "".join(parts)

    return MBResult(
        recording_id=recording_id,
        release_id=release_id,
        artist_id=artist_id,
        title=title,
        artist=artist,
        album=album,
        album_artist=album_artist,
        year=year,
        track_number=track_number,
        disc_number=disc_number,
        confidence=confidence,
    )


def _search_mb_sync(
    title: Optional[str],
    artist: Optional[str],
    album: Optional[str],
    duration_secs: Optional[float],
) -> Optional[MBResult]:
    """Blocking MusicBrainz search (run in thread pool)."""
    if not title and not artist:
        return None

    query_parts = []
    if title:
        query_parts.append(f'recording:"{title}"')
    if artist:
        query_parts.append(f'artist:"{artist}"')
    if album:
        query_parts.append(f'release:"{album}"')

    query = " AND ".join(query_parts)

    try:
        result = musicbrainzngs.search_recordings(
            query=query,
            limit=5,
        )
    except musicbrainzngs.ResponseError as e:
        logger.warning("MusicBrainz search error: %s", e)
        return None
    except Exception as e:
        logger.warning("MusicBrainz unexpected error: %s", e)
        return None

    recordings = result.get("recording-list", [])
    if not recordings:
        return None

    top = recordings[0]
    score = float(top.get("ext:score", 0)) / 100.0

    # Duration check — penalise if we know duration and it differs
    if duration_secs and top.get("length"):
        mb_ms = int(top["length"])
        diff = abs(mb_ms / 1000.0 - duration_secs)
        if diff > 10:
            score *= 0.8

    return _build_result_from_recording(top, confidence=score)


async def lookup(
    title: Optional[str],
    artist: Optional[str],
    album: Optional[str],
    duration_secs: Optional[float] = None,
) -> Optional[MBResult]:
    """Async wrapper around the blocking MusicBrainz search."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        _search_mb_sync,
        title,
        artist,
        album,
        duration_secs,
    )


async def lookup_by_recording_id(recording_id: str) -> Optional[MBResult]:
    """Fetch full details for a known recording ID."""
    def _fetch():
        try:
            result = musicbrainzngs.get_recording_by_id(
                recording_id,
                includes=["artist-credits", "releases", "media", "release-groups"],
            )
            return _build_result_from_recording(result["recording"], confidence=1.0)
        except Exception as e:
            logger.warning("MB get_recording_by_id error: %s", e)
            return None

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch)
