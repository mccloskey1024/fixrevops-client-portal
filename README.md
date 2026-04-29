# FixRevOps Client Portal

Client onboarding portal with magic link authentication (no login required).

**Status:** ✅ Full scaffold complete — ready for database setup and deploy

## Quick Start

### 1. Set up database

**Option A: Vercel Postgres (Recommended for deploy)**
```bash
# In Vercel dashboard: create new Postgres database
# Copy DATABASE_URL to .env
```

**Option B: Local Postgres**
```bash
# Install Postgres locally, create database, then:
# Edit .env with your DATABASE_URL
```

### 2. Configure environment variables

Edit `.env` (already has magic link secret generated):

```bash
DATABASE_URL="postgresql://..."  # Add your DB connection string
GOOGLE_DRIVE_CREDENTIALS_PATH="/Users/shanemccloskey/.openclaw/credentials/google-drive-sa.json"
GOOGLE_DRIVE_PORTAL_FOLDER_ID=""  # Optional: specific folder ID for portal files
BREVO_API_KEY=""  # Optional: for email notifications
TWILIO_*=""  # Optional: for SMS notifications
NEXT_PUBLIC_APP_URL="https://fixrevops.io"
```

### 3. Push database schema

```bash
cd /Users/shanemccloskey/.openclaw/workspace/projects/client-portal
npx prisma generate
npx prisma db push
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) for admin dashboard.

## API Endpoints

### Public (Magic Link Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portal/[token]` | Fetch client portal data |
| POST | `/api/portal/[token]/files` | Upload file (client) |
| POST | `/api/portal/[token]/comments` | Add comment (client) |
| POST | `/api/portal/[token]/tasks/[id]/complete` | Mark task complete |

### Admin (No auth yet — add middleware!)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clients` | List all clients |
| POST | `/api/portal/clients` | Create client + magic link |
| POST | `/api/admin/engagements` | Create engagement |
| POST | `/api/admin/tasks` | Create task |
| PATCH | `/api/admin/tasks/[id]` | Update task |
| DELETE | `/api/admin/tasks/[id]` | Delete task |
| POST | `/api/admin/comments` | Add comment (internal) |
| POST | `/api/admin/files/upload` | Upload file (admin) |

## Pages

- `/admin` — Admin dashboard (create clients, view magic links)
- `/admin/clients/[id]` — Client management (TODO: build this)
- `/portal/[token]` — Client portal view (magic link protected)

## Database Schema

```
clients
├── id (uuid)
├── name
├── primaryContactName, primaryContactEmail, primaryContactPhone
├── magicLinkToken (unique)
└── magicLinkExpiresAt

engagements
├── id (uuid)
├── clientId → clients.id
├── name, status, startDate, targetEndDate
└── hubspotPortalId, linearProjectId

tasks
├── id (uuid)
├── engagementId → engagements.id
├── title, description, type, status, dueDate
└── assignedTo, completedAt

files
├── id (uuid)
├── engagementId → engagements.id
├── uploadedBy ("client" | "internal")
├── storageProvider ("drive" | "s3")
└── storagePath, fileName, fileSize

comments
├── id (uuid)
├── engagementId → engagements.id
├── author ("client" | "internal"), authorName
├── content, isInternal
└── createdAt

notifications
├── id (uuid)
├── engagementId, taskId
├── type ("email" | "sms"), template
└── scheduledFor, sentAt, status
```

## Deployment Checklist

- [ ] Set up Vercel Postgres database
- [ ] Copy `DATABASE_URL` to Vercel environment variables
- [ ] Add Google Drive credentials to Vercel (or use path-based auth)
- [ ] Set `NEXT_PUBLIC_APP_URL=https://fixrevops.io`
- [ ] Deploy to Vercel
- [ ] Test magic link generation and access
- [ ] Add admin authentication middleware (important!)

## Next Steps

1. **Admin Auth** — Add simple auth middleware to `/api/admin/*` routes
2. **Client Management Page** — Build `/admin/clients/[id]` for managing engagements/tasks
3. **Email Notifications** — Integrate Brevo for task reminders
4. **SMS Notifications** — Integrate Twilio for urgent alerts
5. **Folder Structure** — Auto-create Google Drive folders per client/engagement

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (Vercel Postgres)
- Google Drive API (file storage)
- Magic link auth (crypto-js signing)
