"""
WebDAV client for Nextcloud.
Provider interface defined here so S3/OneDrive/GDrive can be added
by implementing the same abstract base.
"""
import asyncio
import io
import os
import re
import tempfile
from abc import ABC, abstractmethod
from datetime import datetime
from typing import AsyncIterator, List, Optional
from urllib.parse import quote, urljoin

import httpx
from lxml import etree


MUSIC_EXTENSIONS = {
    ".mp3", ".flac", ".ogg", ".opus", ".m4a", ".m4b", ".aac",
    ".wav", ".wma", ".aiff", ".aif", ".ape", ".wv", ".mpc", ".mp2",
}


class FileEntry:
    """A file or directory entry from a storage provider."""
    def __init__(
        self,
        path: str,
        name: str,
        is_dir: bool,
        size: Optional[int],
        last_modified: Optional[datetime],
        etag: Optional[str],
        mime_type: Optional[str],
    ):
        self.path = path
        self.name = name
        self.is_dir = is_dir
        self.size = size
        self.last_modified = last_modified
        self.etag = etag
        self.mime_type = mime_type

    def is_music(self) -> bool:
        ext = os.path.splitext(self.name)[1].lower()
        return ext in MUSIC_EXTENSIONS


class StorageProvider(ABC):
    """Abstract base — implement this for every cloud backend."""

    @abstractmethod
    async def test_connection(self) -> bool: ...

    @abstractmethod
    async def list_directory(self, path: str) -> List[FileEntry]: ...

    @abstractmethod
    async def walk(self, root: str) -> AsyncIterator[FileEntry]: ...

    @abstractmethod
    async def download_file(self, path: str) -> bytes: ...

    @abstractmethod
    async def upload_file(self, path: str, data: bytes) -> bool: ...

    @abstractmethod
    async def stream_url(self, path: str) -> str: ...


# ---------------------------------------------------------------------------
# Nextcloud / WebDAV implementation
# ---------------------------------------------------------------------------

DAV_NS = "DAV:"
NC_NS = "http://nextcloud.org/ns"

PROPFIND_BODY = b"""<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:getetag/>
    <D:getcontenttype/>
  </D:prop>
</D:propfind>"""


def _parse_propfind(xml_bytes: bytes, base_path: str) -> List[FileEntry]:
    """Parse a WebDAV PROPFIND response into FileEntry list."""
    try:
        root = etree.fromstring(xml_bytes)
    except Exception:
        return []

    entries: List[FileEntry] = []
    for response in root.iter(f"{{{DAV_NS}}}response"):
        href_el = response.find(f"{{{DAV_NS}}}href")
        if href_el is None:
            continue
        href = href_el.text or ""
        # Decode URL-encoded characters
        from urllib.parse import unquote
        href = unquote(href)

        propstat = response.find(f"{{{DAV_NS}}}propstat")
        if propstat is None:
            continue
        prop = propstat.find(f"{{{DAV_NS}}}prop")
        if prop is None:
            continue

        is_dir = prop.find(f"{{{DAV_NS}}}resourcetype/{{{DAV_NS}}}collection") is not None

        name_el = prop.find(f"{{{DAV_NS}}}displayname")
        name = (name_el.text or "").strip() if name_el is not None else href.rstrip("/").split("/")[-1]

        size = None
        size_el = prop.find(f"{{{DAV_NS}}}getcontentlength")
        if size_el is not None and size_el.text:
            try:
                size = int(size_el.text)
            except ValueError:
                pass

        last_modified = None
        lm_el = prop.find(f"{{{DAV_NS}}}getlastmodified")
        if lm_el is not None and lm_el.text:
            try:
                from email.utils import parsedate_to_datetime
                last_modified = parsedate_to_datetime(lm_el.text).replace(tzinfo=None)
            except Exception:
                pass

        etag = None
        etag_el = prop.find(f"{{{DAV_NS}}}getetag")
        if etag_el is not None:
            etag = (etag_el.text or "").strip('"')

        mime = None
        mime_el = prop.find(f"{{{DAV_NS}}}getcontenttype")
        if mime_el is not None:
            mime = mime_el.text

        # Compute a clean path relative to the WebDAV root
        # href is like /remote.php/dav/files/user/Music/foo.mp3
        path = href

        entries.append(FileEntry(
            path=path,
            name=name,
            is_dir=is_dir,
            size=size,
            last_modified=last_modified,
            etag=etag,
            mime_type=mime,
        ))

    return entries


class NextcloudProvider(StorageProvider):
    """
    WebDAV provider for Nextcloud.

    config dict keys:
        url          – base URL, e.g. https://nextcloud.example.com
        username     – Nextcloud username
        password     – Nextcloud app password (recommended) or account password
        verify_ssl   – bool, default True
    """

    def __init__(self, config: dict):
        self.base_url = config["url"].rstrip("/")
        self.username = config["username"]
        self.password = config["password"]
        self.verify_ssl = config.get("verify_ssl", True)
        self._dav_base = f"{self.base_url}/remote.php/dav/files/{quote(self.username, safe='')}"
        self._auth = (self.username, self.password)

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            auth=self._auth,
            verify=self.verify_ssl,
            timeout=60.0,
            follow_redirects=True,
        )

    def _url(self, path: str) -> str:
        """Convert a clean path like /Music/foo.mp3 to full WebDAV URL."""
        clean = path.lstrip("/")
        return f"{self._dav_base}/{quote(clean, safe='/:@!$&\'()*+,;=')}"

    async def test_connection(self) -> bool:
        try:
            async with self._client() as client:
                resp = await client.request(
                    "PROPFIND", self._dav_base + "/",
                    headers={"Depth": "0"},
                    content=PROPFIND_BODY,
                )
                return resp.status_code in (200, 207)
        except Exception:
            return False

    async def list_directory(self, path: str) -> List[FileEntry]:
        url = self._url(path)
        async with self._client() as client:
            resp = await client.request(
                "PROPFIND", url,
                headers={"Depth": "1", "Content-Type": "application/xml"},
                content=PROPFIND_BODY,
            )
            resp.raise_for_status()
            entries = _parse_propfind(resp.content, path)
            # Filter out the directory itself (first entry)
            return [e for e in entries if e.path.rstrip("/") != url.rstrip("/") and e.name]

    async def walk(self, root: str) -> AsyncIterator[FileEntry]:
        """Depth-first walk yielding music files only."""
        stack = [root]
        while stack:
            current = stack.pop()
            try:
                entries = await self.list_directory(current)
            except Exception:
                continue
            for entry in entries:
                if entry.is_dir:
                    stack.append(entry.path)
                elif entry.is_music():
                    yield entry

    async def download_file(self, path: str) -> bytes:
        url = self._url(path)
        async with self._client() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.content

    async def upload_file(self, path: str, data: bytes) -> bool:
        url = self._url(path)
        async with self._client() as client:
            resp = await client.put(url, content=data)
            return resp.status_code in (200, 201, 204)

    async def stream_url(self, path: str) -> str:
        """Return the direct WebDAV URL (the backend proxy will stream it)."""
        return self._url(path)

    async def stream_bytes(self, path: str) -> AsyncIterator[bytes]:
        """Stream file bytes for proxy."""
        url = self._url(path)
        async with self._client() as client:
            async with client.stream("GET", url) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_provider(provider_type: str, config: dict) -> StorageProvider:
    """Return the right provider based on type string."""
    if provider_type == "nextcloud":
        return NextcloudProvider(config)
    # Future:
    # elif provider_type == "s3":
    #     return S3Provider(config)
    # elif provider_type == "onedrive":
    #     return OneDriveProvider(config)
    # elif provider_type == "googledrive":
    #     return GoogleDriveProvider(config)
    raise ValueError(f"Unknown provider type: {provider_type}")
