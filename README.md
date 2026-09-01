# Done Safe

Done Safe is an offline-first Proof of Delivery (POD) web application for delivery drivers and operations administrators. It is designed for mobile use and keeps delivery work available when a driver temporarily loses network access.

## Features

### Driver workspace

- Today's delivery list with weekday and date information.
- Leaflet-based route map using OpenStreetMap tiles.
- Navigation links for Google Maps, Waze and Apple Maps.
- Delivery detail view with recipient, notes and location information.
- Photo capture from camera or gallery.
- Touch-friendly signature capture.
- Completion validation: at least one photo or signature is required; otherwise an exception reason must be supplied.
- IndexedDB-backed local storage for tasks, proof files and the sync outbox.
- Online/offline status in the header, with automatic connection alerts.
- Pending-sync badge and queue view.
- Delivery history in the user's profile.
- User menu with password change and logout actions.

### Administration

- First-run setup page for administrator, Cloudflare R2, MongoDB and email configuration.
- Admin console for drivers, vehicles and account security status.
- Driver password lockout after five failed attempts for fifteen minutes.
- Passkey registration and login support for administrators and drivers.
- Project email configuration for SMTP notifications and optional IMAP access.

### Localization

The interface includes a language selector for English, Simplified Chinese and Traditional Chinese. The selected language is saved in a local cookie and restored on the next visit.

## Tech stack

- React 19, Vite and Leaflet
- IndexedDB, Service Worker and Web App Manifest for offline-first behavior
- Cloudflare R2 for delivery evidence objects
- MongoDB for orders, users, vehicles, proof metadata and audit records
- Node.js backend for authentication, synchronization and external service access

## Requirements and installation

- Node.js 18 or newer
- npm
- A Node.js backend for production authentication and data APIs

```bash
npm install
npm run dev
```

The development server normally runs at `http://localhost:5173`.

## Demo and production modes

Production mode is the default. Demo mode is enabled only when the environment contains the exact value `mode=demo`.

For local demo development, create `.env.local`:

```env
mode=demo
```

For production, omit the variable or use:

```env
mode=production
```

Restart Vite after changing environment files. Demo mode enables sample accounts, sample delivery data, local admin records and simulated synchronization. Production mode does not seed demo data and calls the backend API instead.

Do not put MongoDB, R2, SMTP or IMAP secrets in client-exposed Vite environment variables. These values belong in the Node.js backend secret store.

## Commands

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run preview   # Preview the production build locally
npm run lint      # Run Oxlint
```

## Backend integration

The frontend expects session, password, Passkey, setup, administration, delivery and synchronization APIs. Detailed API and data requirements are documented in [BACKEND_REQUIREMENTS.md](./BACKEND_REQUIREMENTS.md).

Important production endpoints include:

```text
GET  /api/auth/session
POST /api/auth/password/login
POST /api/auth/password/change
POST /api/auth/logout
POST /api/auth/passkey/register/options
POST /api/auth/passkey/register/verify
POST /api/auth/passkey/login/options
POST /api/auth/passkey/login/verify
GET  /api/driver/deliveries?date=YYYY-MM-DD
GET  /api/driver/deliveries/history
POST /api/driver/sync/batch
POST /api/setup
```

The backend must enforce authorization and business rules server-side. A delivery cannot be completed without a photo/signature or an exception reason, and offline synchronization must be idempotent.

## Evidence object naming

```text
{orderId}/{YYYYMMDDHHMMSS}-photo-{uuid}.jpg
{orderId}/{YYYYMMDDHHMMSS}-signature-{uuid}.png
```

R2 objects should remain private. The backend should return short-lived signed URLs when evidence needs to be viewed.

## Project structure

```text
src/admin/       Administrator console
src/auth/        Login, password and Passkey helpers
src/config/      Application mode configuration
src/driver/      Driver workspace, map, POD capture and local storage
src/i18n.jsx     Language selector and locale handling
public/          PWA manifest and Service Worker
BACKEND_REQUIREMENTS.md
```

This repository contains the frontend application shell and offline interaction model. Production credential persistence, authentication, R2 uploads and MongoDB operations must be implemented by the Node.js backend.
