# Course

A learning app with a React frontend and a Node.js/SQLite backend.

## Deploy with Docker

This runs the app in containers. The host does not need Node.js, npm, or a system package update. The host must already have Docker Engine and the Docker Compose plugin. A container uses the host kernel, so very old Debian kernels or CPUs that Docker does not support can still prevent this from running.

1. Copy this repository to the host.
2. Copy `.env.example` to `.env`.
3. Set `JWT_SECRET` in `.env` to a unique random secret. You can generate one with:

   ```sh
   docker run --rm node:24-bookworm-slim node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

4. Optional: set `ADMIN_PASSWORD` in `.env`. If you leave it empty, the app creates a random initial password. Read it once from `docker compose logs backend`, then change it after login.
5. Start the app:

   ```sh
   docker compose up -d --build
   ```

Open `http://<server-address>:8080`. To use another port, set `WEB_PORT` in `.env` before starting the app. Docker downloads the base images and builds the app images. These operations do not update Debian packages on the host.

Useful commands:

```sh
docker compose logs -f
docker compose ps
docker compose down
```

The database and uploaded avatars are stored in Docker volumes. `docker compose down` keeps this data. Do not use `docker compose down -v` unless you want to delete all app data. Back up the `course-data` and `course-uploads` volumes before moving or reinstalling the host.

## Local development

Run the backend from `backend` with `npm start` and the frontend from `frontend` with `npm run dev`. The frontend development server proxies API and avatar requests to `http://localhost:5000`.

## Android app

Install the Android SDK (including Android SDK Platform 36) and Java 21. Then build a debug APK from `frontend`:

```sh
npm ci
npm run build:android
```

The APK is written to `frontend/byte-debug.apk`. The app sends API requests to `http://course.neur0devil.run.place:8080`, where the frontend Nginx service forwards `/api` requests to the backend. The server must expose the frontend on port 8080, and the device must be able to reach that host and port. If you set a different `WEB_PORT`, update the Android build scripts in `frontend/package.json` to match.

To build the release variant, run `npm run build:android:release` from `frontend`. It writes an unsigned APK to `frontend/byte-release-unsigned.apk`. Configure a release signing key before you install or distribute this APK.
