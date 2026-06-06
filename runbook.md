# linse — operator runbook

Operational procedures for running and maintaining a linse deployment. For first-time
setup see the [README](./README.md).

All commands run from the directory containing `compose.yml`.

---

## Cut a release (publish the image)

The image is published only when a version tag is pushed — never on normal commits.

```bash
# after validating locally (see below)
git tag v0.1.0
git push --tags
```

This triggers `.github/workflows/release.yml`, which builds a multi-arch
(`amd64` + `arm64`) image and pushes it to `ghcr.io/jmsz1996/linse-app` tagged with
the version and `latest`.

**First publish only:** GHCR packages start private. After the first successful
run, open GitHub → your profile → Packages → `linse-app` → Package settings →
change visibility to **Public** so anonymous `docker pull` works.

---

## Validate locally before tagging

Build and run the real production image (not dev mode) and walk the smoke test:

```bash
cp .env.example .env        # fill in secrets if you haven't
docker compose -f compose.yml -f compose.build.yml up -d --build
docker compose ps           # both services should become healthy
curl -s localhost:3000/api/health   # -> ok
```

Smoke test (host + a separate incognito window for the guest):
host login → create event (description, footer, 3 themes) → add tags →
download QR → register as guest → upload a photo → like → comment (appears live) →
switch theme → as host hide/delete a photo → block the guest (guest sees the
removed-from-event wall) → delete the guest → delete the event.

Tear down when done: `docker compose down` (keeps data) — see the warning below.

---

## Backups

Persistent state lives in three named volumes: `linse_pgdata` (database),
`linse_uploads` (photos), and `linse_exports` (originals written by the host
"Export originals" action). The first two are the source of truth — `linse_exports`
is derived (re-exportable from the app), so back it up only if you rely on it.

```bash
# Database (SQL dump)
docker compose exec -T db pg_dump -U linse linse > linse-db-$(date +%F).sql

# Uploads (tarball of the volume)
docker run --rm -v linse_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/linse-uploads-$(date +%F).tgz -C /data .

# Exports (optional — derived data)
docker run --rm -v linse_exports:/data -v "$PWD":/backup alpine \
  tar czf /backup/linse-exports-$(date +%F).tgz -C /data .
```

## Restore

```bash
# Database (into a running, empty db)
cat linse-db-YYYY-MM-DD.sql | docker compose exec -T db psql -U linse linse

# Uploads
docker run --rm -v linse_uploads:/data -v "$PWD":/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/linse-uploads-YYYY-MM-DD.tgz -C /data"
```

---

## Upgrade to a new version

```bash
# pin the version you validated (or leave LINSE_VERSION=latest)
sed -i 's/^LINSE_VERSION=.*/LINSE_VERSION=v0.2.0/' .env
docker compose pull
docker compose up -d
```

Database migrations run automatically on boot (`prisma migrate deploy`). Take a
backup first.

## Rotate the host admin password

```bash
# edit HOST_ADMIN_PASSWORD in .env, then:
docker compose restart app
```

The seed step re-runs on boot and upserts the host account with the new password.

---

## Troubleshooting

**⚠ `docker compose down -v` deletes all data.** With named volumes, `-v` removes
`linse_pgdata`, `linse_uploads`, and `linse_exports` — database, photos, and any
exported originals gone. Use plain `docker compose down` to stop. Only use `-v`
when you intend to wipe everything.

**App won't become healthy.** Check logs: `docker compose logs app`. The app waits
for the database (`depends_on: service_healthy`) and runs migrations on boot, so
first start can take ~30–40s. `/api/health` returns `503` while the database is
unreachable.

**Dev: stale `.next` causing 500s (`ENOENT .next/dev/...`).** This is the
dev overlay workflow only. Do **not** use `down -v` (it wipes data volumes).
Instead clear just the app's anonymous `.next` volume:

```bash
docker compose -f compose.yml -f compose.dev.yml rm -sf app
docker compose -f compose.yml -f compose.dev.yml up -d
```

**Logs:** `docker compose logs -f app` (or `db`).

---

## HTTPS / reverse proxy

To terminate TLS at an external Caddy and drop the published port, use the overlay:

```bash
docker compose -f compose.yml -f compose.caddy.yml up -d
```

It attaches the app to an existing external `caddy` network and removes the host
port mapping. Point your Caddy site at `linse-app:3000`.

---

## Relocating data to a host path (optional)

If you prefer photos/DB at a specific host directory instead of Docker-managed
volumes, create a `compose.override.yml`:

```yaml
services:
  db:
    volumes:
      - /srv/linse/postgres:/var/lib/postgresql/data
  app:
    volumes:
      - /srv/linse/uploads:/data/uploads
      - /srv/linse/exports:/data/exports
  fix-permissions-exports:
    volumes:
      - /srv/linse/exports:/data/exports
```

`docker compose up -d` picks up the override automatically. (Bind mounts survive
`down -v`, unlike named volumes.)

**Browsing exports on the host.** The host "Export originals" action writes into
`EXPORT_DIR` (default `/data/exports`). Bind-mounting it (as above) is the point of
the feature — the originals land at `/srv/linse/exports/<event name>/001.jpg …`. Note
the app writes as uid/gid `100:101`, so exported files are owned by `100:101`:
readable, but you'll need `sudo` (or a `chown`) to delete them from the host.
