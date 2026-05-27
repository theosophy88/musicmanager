# MusicManager

A self-hosted, multi-user music library manager with cloud storage support, automatic MusicBrainz metadata enrichment, ID3 tag editing, and an embedded audio player.

---

## Features

| Area | What it does |
|---|---|
| **Cloud sources** | Connect Nextcloud (WebDAV) today; S3, OneDrive, Google Drive via the provider abstraction in future |
| **Library scanning** | Walks all configured folders & sub-folders to discover MP3, FLAC, OGG, MP4/AAC, and other mutagen-supported formats |
| **Metadata enrichment** | Queries MusicBrainz by title + artist + album; stores a confidence-scored _proposed_ tag set alongside the current tags |
| **Review & apply** | Side-by-side diff view; accept, edit, or skip per file; batch-apply across multi-selected files |
| **Manual editing** | Full tag editor for every ID3 field: title, artist, album, album artist, year, track, disc, genre, comment, composer, label |
| **Embedded player** | Stream directly from your cloud source; ID3 info + artwork displayed in the player bar |
| **Background scanning** | Per-user configurable schedule (e.g. every 24 h); APScheduler runs in the same process |
| **Multi-user** | JWT auth; first registered user is admin; each user has their own sources, files, and tags |
| **SQLite persistence** | All state (file tree, current tags, proposed tags, scan jobs) lives in a single `/data/musicmanager.db` file |

---

## Quick start (Docker)

```bash
# 1. Clone
git clone https://github.com/you/musicmanager.git
cd musicmanager

# 2. (Optional) create a .env file
cat > .env << 'ENV'
SECRET_KEY=replace-with-a-long-random-string
MUSICBRAINZ_CONTACT=you@example.com
ENV

# 3. Build & run — single command
docker compose up --build -d

# 4. Open the UI
open http://localhost:8000
```

The first account you register automatically becomes the admin.

---

## Local development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="sqlite:///./dev.db"
export SECRET_KEY="dev-secret"
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # starts Vite at http://localhost:5173 (proxies /api to :8000)
```

### Production build (local, no Docker)

```bash
cd frontend && npm run build   # writes to ../backend/static
cd ../backend
uvicorn app.main:app --port 8000
```

---

## Architecture

```
musicmanager/
├── Dockerfile                  ← Multi-stage: Node build → Python runtime
├── docker-compose.yml
│
├── backend/
│   ├── app/
│   │   ├── main.py             ← FastAPI app, router registration, SPA fallback
│   │   ├── database.py         ← SQLAlchemy models + table creation
│   │   ├── auth.py             ← JWT helpers (create / verify tokens, bcrypt)
│   │   ├── routers/
│   │   │   ├── auth.py         ← /api/auth/*  (register, login, me, schedule)
│   │   │   ├── sources.py      ← /api/sources/*  (CRUD, test, browse, scan, jobs)
│   │   │   ├── files.py        ← /api/files/*  (list, stats, tag ops, stream)
│   │   │   └── admin.py        ← /api/admin/users  (admin only)
│   │   └── services/
│   │       ├── webdav.py       ← StorageProvider ABC + NextcloudProvider
│   │       ├── musicbrainz.py  ← MusicBrainz search + recording lookup
│   │       ├── tagger.py       ← mutagen read/write for all audio formats
│   │       ├── scanner.py      ← Background scan pipeline
│   │       └── scheduler.py    ← APScheduler wrapper
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── main.jsx            ← React root + providers
        ├── App.jsx             ← Layout, sidebar, routes
        ├── api.js              ← Typed API client (all endpoints)
        ├── hooks/
        │   ├── useAuth.jsx     ← Auth context (JWT, login, register, logout)
        │   └── usePlayer.jsx   ← Audio player context (play, pause, seek, queue)
        ├── pages/
        │   ├── Dashboard.jsx   ← Stats overview, coverage bar, recent jobs
        │   ├── FileManager.jsx ← Search, filter, sort, paginate, batch actions
        │   ├── Sources.jsx     ← Source management + folder browser
        │   └── Settings.jsx    ← Schedule, profile, admin user management
        └── components/
            ├── TagEditor.jsx   ← Modal: current vs proposed diff + editable form
            └── PlayerBar.jsx   ← Fixed bottom bar: playback controls + track info
```

### Provider abstraction

All cloud storage operations go through the `StorageProvider` abstract base class in `backend/app/services/webdav.py`:

```python
class StorageProvider(ABC):
    async def list_directory(self, path: str) -> list[FileInfo]: ...
    async def walk(self, root: str) -> AsyncIterator[FileInfo]: ...
    async def download_file(self, path: str) -> bytes: ...
    async def upload_file(self, path: str, data: bytes) -> None: ...
    async def stream_bytes(self, path: str, start: int, end: int) -> bytes: ...
```

To add a new provider (S3, OneDrive, etc.) implement this interface and register the provider type string in the router.

### Scan pipeline

1. `StorageProvider.walk()` discovers all audio files under configured paths
2. Files unchanged since last scan (by ETag / size) are skipped
3. Each changed file is downloaded → tags read by `mutagen` → saved as `current_tags`
4. MusicBrainz is queried (title + artist + album); matches with confidence ≥ 0.5 are saved as `proposed_tags`
5. User reviews diffs in the File Manager → Accept / Edit / Skip → `apply` writes back to storage

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:////data/musicmanager.db` | SQLAlchemy database URL |
| `SECRET_KEY` | *(required in prod)* | JWT signing key — set to a long random string |
| `MUSICBRAINZ_APP_NAME` | `MusicManager` | MusicBrainz user-agent app name |
| `MUSICBRAINZ_APP_VERSION` | `1.0` | MusicBrainz user-agent version |
| `MUSICBRAINZ_CONTACT` | `admin@example.com` | MusicBrainz user-agent contact |

---

## API overview

All routes are prefixed with `/api/`.

```
Auth
  POST   /auth/register         Register a new user
  POST   /auth/token            Login → JWT token
  GET    /auth/me               Current user profile
  PATCH  /auth/me/schedule      Update scan schedule

Sources
  GET    /sources/              List user's sources
  POST   /sources/              Add a source
  GET    /sources/{id}          Get source details
  PATCH  /sources/{id}          Update source
  DELETE /sources/{id}          Remove source
  POST   /sources/{id}/test     Test connection
  GET    /sources/{id}/browse   Browse remote folder tree
  POST   /sources/{id}/scan     Trigger immediate scan
  GET    /sources/{id}/jobs     Scan job history

Files
  GET    /files/                List files (search, filter, sort, paginate)
  GET    /files/stats           Library statistics
  GET    /files/{id}            File detail + tags
  PATCH  /files/{id}/proposed   Update proposed tags manually
  POST   /files/{id}/apply      Write proposed tags back to storage
  POST   /files/{id}/skip       Mark file as skipped
  POST   /files/{id}/rematch    Re-query MusicBrainz
  POST   /files/batch           Batch apply / skip
  GET    /files/{id}/stream     Proxy-stream audio

Admin
  GET    /admin/users           List all users
  POST   /admin/users           Create user
  PATCH  /admin/users/{id}      Update user
  DELETE /admin/users/{id}      Delete user
```

---

## License

MIT
"# musicmanager" 
