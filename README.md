# Tutor-Connect — Student Profile & Academic Info Management

Module 1 of the **Tutor-Connect** online tutoring platform (CSE471, Group 01).
A full-stack Next.js app that lets **Students**, **Parents**, and an **Admin** manage
profiles and academic information, secured with **Google authentication** (with a
one-click demo login for quick exploration).

> Implemented feature (Rezaul Mostofa, ID 23301511):
> *"Students/Parents get a personal dashboard to manage their accounts and academic
> details … Parents can manage multiple student profiles under a single account."*

---

## What's inside

| Role | Dashboard (`/dashboard/...`) | Capabilities |
|------|------------------------------|--------------|
| **Student** | `/student` | Edit personal info (name, phone, location, district); add/edit/delete **academic details** (current class, institution, subjects). |
| **Parent** | `/parent` | Edit own personal info; add/edit/delete **multiple student profiles** under one account. |
| **Admin** | `/admin` | View & search all users; toggle **Premium**, **suspend/activate**, change role, delete; per-user detail (academic info / student profiles). Stats tiles. |

Login is via **Google OAuth**. Until you configure Google Cloud credentials, the login
page also offers **one-click demo accounts** (`AUTH_DEMO_LOGIN=1`).

---

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS**
- **Prisma** ORM + **PostgreSQL**
- **Auth.js v5** (`next-auth`) — Google provider + demo Credentials provider
- Runs on **port 1511** → http://127.0.0.1:1511

---

## Prerequisites

1. **Node.js 18+** and npm (tested on Node 24).
2. **PostgreSQL** installed and running on port 5432.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   - set DATABASE_URL (user/password/database)
#   - set AUTH_SECRET  (run:  npx auth secret)
#   - (optional) set AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
#   - (optional) ADMIN_EMAIL="you@gmail.com"

# 3. Create the database (once). In psql / pgAdmin:
#      CREATE DATABASE tutor_connect_web;
#    Or via createdb:
#      createdb -U postgres tutor_connect_web

# 4. Create tables + seed demo data
npm run db:push
npm run seed

# 5. Run the app
npm run dev
```

Open **http://127.0.0.1:1511**.

---

## Authentication

### Option A — Demo login (no setup)

With `AUTH_DEMO_LOGIN="1"`, the login page shows three buttons:

- **Student** → `demo-student@tutorconnect.local`
- **Parent** → `demo-parent@tutorconnect.local` (seeded with 2 student profiles)
- **Admin** → `demo-admin@tutorconnect.local`

### Option B — Google OAuth

1. Go to **Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID** (type: *Web application*).
2. Under **Authorized redirect URIs**, add:
   ```
   http://127.0.0.1:1511/api/auth/callback/google
   ```
3. Copy the **Client ID** and **Client Secret** into `.env`:
   ```
   AUTH_GOOGLE_ID="your-client-id"
   AUTH_GOOGLE_SECRET="your-client-secret"
   ```
4. (Optional) Make yourself an admin without the demo button by listing your Google email:
   ```
   ADMIN_EMAIL="rezaul.mostofa@gmail.com"
   ```

On first Google login, a **student/parent** completes a short onboarding step (choose role
+ fill name/phone/district). Emails in `ADMIN_EMAIL` skip onboarding and land on the admin
dashboard directly.

---

## Environment variables (`.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Session encryption secret (`npx auth secret`) |
| `AUTH_GOOGLE_ID` | demo only | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | demo only | Google OAuth client secret |
| `AUTH_DEMO_LOGIN` | optional | `1` to show demo login buttons |
| `ADMIN_EMAIL` | optional | Comma-separated Google emails that become admins |

---

## Project structure

```
app/
  page.tsx                # Landing page
  login/                  # Sign-in (Google + demo)
  onboarding/             # First-login role + profile completion
  dashboard/{layout,student,parent,admin}/   # Role-based dashboards
  api/auth/[...nextauth]/route.ts             # Auth.js handler
auth.ts                   # Auth.js config (providers, callbacks)
middleware.ts             # Route protection + onboarding redirect
actions/{profile,academic,students,admin}.ts  # Server actions (mutations)
lib/{prisma,session,constants}.ts
components/               # ProfileForm, AcademicInfoList, StudentProfileList, UsersTable, …
prisma/{schema.prisma, seed.ts}
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server on port 1511 |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to the database |
| `npm run seed` | Seed demo + sample users |
| `npm run db:studio` | Open Prisma Studio (browse data at http://localhost:5555) |

---

## Notes / scope

This implementation covers **Module 1 (Student Profile & Academic Info Management)** end to
end, plus a basic **admin user-management** panel. Cross-module features shown as
placeholders (Find Tutors, Book a Session, AI TutorBot) belong to other modules and are
intentionally out of scope here.
