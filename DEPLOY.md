# Deployment Guide - FixRevOps Client Portal

## Quick Deploy to Vercel

### 1. Push to Git (optional but recommended)

```bash
cd /Users/shanemccloskey/.openclaw/workspace/projects/client-portal
git init
git add .
git commit -m "Initial client portal scaffold"
# Add remote and push if you have a repo
```

### 2. Create Vercel Project

```bash
# Option A: Vercel CLI
npm install -g vercel
vercel --project-name fixrevops-portal

# Option B: Vercel Dashboard
# Go to https://vercel.com/new and import the project
```

### 3. Set Up Database

**Vercel Postgres (Recommended):**
1. In Vercel dashboard → Storage → Create Database → Postgres
2. Name it `fixrevops-portal-db`
3. Copy the `DATABASE_URL` connection string

### 4. Configure Environment Variables

In Vercel project settings → Environment Variables:

```
DATABASE_URL=postgresql://...  # From Vercel Postgres
MAGIC_LINK_SECRET=25489a6921a66481b86e9df15bd05d7545a64a1d9b05318df9dd2f98b6e14f32
NEXT_PUBLIC_APP_URL=https://fixrevops-portal.vercel.app
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account",...}  # Full JSON content
GOOGLE_DRIVE_PORTAL_FOLDER_ID=  # Optional
```

**Note:** For `GOOGLE_DRIVE_CREDENTIALS`, paste the full JSON content from `/Users/shanemccloskey/.openclaw/credentials/google-drive-sa.json` as a single-line string.

### 5. Deploy

```bash
vercel --prod
```

### 6. Test

1. Open `https://fixrevops-portal.vercel.app/admin`
2. Create a test client
3. Copy the magic link
4. Open magic link in incognito window
5. Verify portal loads correctly

## Post-Deploy Tasks

### 1. Add Admin Authentication

**Current state:** Admin routes have NO authentication (just a warning log)

**Quick fix:** Add simple password protection:
```typescript
// src/middleware.ts
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (isAdminPath || isAdminApi) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}
```

### 2. Set Up Google Drive Folder Structure

Create a dedicated folder in your Google Drive:
```
FixRevOps/
  Client Portals/
    [Client Name]/
      [Engagement Name]/
        Client Uploads/
        Deliverables/
```

Get the folder ID from the URL and add to `GOOGLE_DRIVE_PORTAL_FOLDER_ID`.

### 3. Configure Custom Domain

In Vercel → Project Settings → Domains:
- Add `portal.fixrevops.io` (or similar)
- Update `NEXT_PUBLIC_APP_URL` to match

### 4. Set Up Email Notifications (Optional)

1. Get Brevo API key from https://app.brevo.com
2. Add `BREVO_API_KEY` to Vercel env vars
3. Implement notification sending in task completion webhook

### 5. Set Up SMS Notifications (Optional)

1. Create Twilio account
2. Get Account SID, Auth Token, and phone number
3. Add to Vercel env vars
4. Implement SMS sending

## Database Migrations

For production deployments, use migrations instead of `db push`:

```bash
# Create initial migration
npx prisma migrate dev --name init

# Deploy migrations to production
npx prisma migrate deploy
```

## Monitoring

- Vercel Functions logs: https://vercel.com/dashboard/functions
- Database: Vercel Postgres dashboard
- Errors: Add Sentry or similar for production error tracking

## Security Checklist

- [ ] Add admin authentication middleware
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Set secure cookie flags
- [ ] Rate limit API endpoints
- [ ] Sanitize file uploads (file type validation)
- [ ] Add CORS headers if needed
- [ ] Review magic link token generation (currently crypto-js, consider crypto for production)

## Cost Estimate

- **Vercel Hobby:** Free (sufficient for starting)
- **Vercel Postgres:** Free tier (5GB storage, plenty for metadata)
- **Google Drive:** Uses existing service account (free up to 15GB)
- **Brevo:** Free tier (300 emails/day)
- **Twilio:** Pay-per-use (~$0.0075/SMS)

**Total:** ~$0-10/month depending on usage
