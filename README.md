# Tutor-Connect — Full-Stack Online Tutoring Platform

**Tutor-Connect** is a comprehensive, production-ready online tutoring and academic management platform built with **Next.js 15**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, **Auth.js (v5)**, and **Tailwind CSS**. It connects students and parents with qualified tutors, featuring map-based discovery, real-time booking and rescheduling, direct messaging, an AI-powered study assistant, integrated payment processing via **UddoktaPay**, and a flexible reward points incentive system.

---

## 🚀 Key Features

### 🎓 1. Student & Parent Accounts
- **Student Dashboard:** Manage personal details, district/location, geocoded coordinates, and academic records (current class, institution, enrolled subjects).
- **Parent Accounts:** Single parent dashboard to create and manage **multiple student profiles** under one account.
- **Onboarding Flow:** Smooth initial setup for new users with role selection and profile setup.

### 👨‍🏫 2. Tutor Profiles & Availability Management
- **Tutor Registration & Verification:** Tutor application queue with Admin verification status (`pending`, `approved`, `rejected`).
- **Rich Profiles:** Bio, tagline, subjects, class levels, instruction medium (*Bangla*, *English*, or *Both*), and hourly rates.
- **Weekly Schedule Management:** Tutors can set bookable weekly time slots (`Saturday` through `Friday`) with custom start and end times.
- **Public Visibility:** Tutors can toggle profile visibility in public search results.

### 🔍 3. Tutor Search, Filters & Interactive Map Discovery
- **Multi-Filter Search:** Filter tutors by subject, class level, medium, district, and maximum hourly fee.
- **Location & Map Discovery:** Map-based tutor search leveraging geocoded latitude/longitude coordinates.
- **Ratings & Reviews:** Verified reviews and star ratings left by students/parents after completed sessions.

### 📅 4. Session Booking & Rescheduling Workflow
- **Flexible Bookings:** Support for both one-time and recurring monthly tutoring sessions.
- **Slot Reservation:** Interactive selection of bookable availability slots.
- **Reschedule Proposal System:** Tutors can propose new dates/times with optional explanations; students can accept or decline directly from their dashboard.
- **Automated Session Reminders:** Built-in tracking for 24-hour and 1-hour session reminders.

### 💬 5. Direct Messaging & Notifications
- **Chat Rooms:** In-app direct messaging between students/parents and tutors.
- **Notification Center:** Real-time in-app alerts for booking status updates, reschedule proposals, and system notices.

### 🤖 6. AI Study Assistant (TutorBot)
- **AI-Powered Learning:** Integrated AI Study Assistant powered by **Google Gemini API** (`@google/genai`).
- **Smart Recommendations:** Provides subject-matter assistance and intelligently suggests scheduling sessions with live human tutors when extra help is needed.
- **Usage Limits:** Daily usage tracking with tier-based limits (Free vs. Premium).

### 💳 7. Subscription & UddoktaPay Payment Gateway
- **Premium Plans:** Monthly and Annual Premium Subscriptions for enhanced features and higher AI limits.
- **UddoktaPay Integration:** Local Bangladeshi payment gateway integration supporting **bKash**, **Nagad**, **Rocket**, and bank cards.
- **Automated Webhooks:** Instant payment verification, transaction reference tracking, and automated account upgrades.

### 🎁 8. Reward Points & Loyalty System
- **Earn Points:** Earn reward points for completed tutoring sessions, booking activities, platform reviews, and subscription renewals.
- **Point Redemption:** Redeem accumulated points for direct discount Taka amounts on premium subscription plans.
- **Audit Logs:** Full history tracking for point earnings and redemptions.

### 🛡️ 9. Admin Dashboard & System Settings
- **User Management:** Search, view, suspend, activate, flag accounts with reason, or grant Premium status.
- **Tutor Verification Queue:** Review and approve pending tutor applications.
- **Dynamic System Settings:** Admin control over reward point redemption rates, points per booking, subscription pricing, and platform commission rates.
- **Platform Analytics:** User growth, active bookings, verified tutors, and subscription revenue statistics.

### 📈 10. Tutor Analytics Dashboard
- Performance metrics, total earnings, active bookings, completed sessions, and review summaries for tutors.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS + PostCSS
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Authentication:** Auth.js v5 (`next-auth`) — Google OAuth & Credentials
- **Payment Gateway:** UddoktaPay API
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Port:** Configured to run on `port 1511` by default

---

## 📋 Prerequisites

Before running the project locally, ensure you have:
1. **Node.js 18+** installed.
2. **PostgreSQL** installed and running on default port `5432`.

---

## ⚙️ Environment Setup (`.env`)

Create a `.env` file in the root directory based on the following template:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/tutor_connect_web?schema=public"

# Auth.js / NextAuth
AUTH_SECRET="your-super-secret-key" # Generate via `npx auth secret`

# Google OAuth
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Demo Mode & Admin Setup
AUTH_DEMO_LOGIN="1" # Set to "1" to enable one-click demo accounts on login
ADMIN_EMAIL="admin@tutorconnect.com" # Comma-separated emails to automatically grant Admin role

# AI Assistant (Google Gemini)
GEMINI_API_KEY="your-gemini-api-key"

# UddoktaPay Gateway
UDDOKTAPAY_API_KEY="your-uddoktapay-api-key"
UDDOKTAPAY_API_URL="https://sandbox.uddoktapay.com/api/v2/recharge" # Sandbox or Live endpoint
NEXT_PUBLIC_APP_URL="http://127.0.0.1:1511"
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
Create the PostgreSQL database (e.g., `tutor_connect_web`), then push the schema and seed sample data:
```bash
# Push database schema
npm run db:push

# Seed demo users, tutors, bookings, and system settings
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://127.0.0.1:1511](http://127.0.0.1:1511)** in your browser.

---

## 🔐 Demo Login Accounts

When `AUTH_DEMO_LOGIN="1"` is enabled, the sign-in page displays one-click instant login buttons:

| Role | Email | Capabilities |
|---|---|---|
| **Student** | `demo-student@tutorconnect.local` | Search tutors, book slots, chat, manage academic profile, review sessions |
| **Parent** | `demo-parent@tutorconnect.local` | Manage multiple student profiles, book tutors for children, chat |
| **Tutor** | `demo-tutor@tutorconnect.local` | Manage schedule slots, view bookings, propose reschedules, view tutor analytics |
| **Admin** | `demo-admin@tutorconnect.local` | User management, tutor verification queue, system settings, platform analytics |

---

## 📂 Project Structure

```
├── actions/                  # Server Actions (tutors, bookings, admin, subscriptions, rewards)
├── app/                      # Next.js App Router
│   ├── api/                  # API routes (Auth, UddoktaPay Webhook)
│   ├── dashboard/            # Role-based dashboards (Student, Parent, Tutor, Admin)
│   ├── login/                # Authentication page
│   ├── onboarding/           # Role assignment & profile onboarding
│   ├── layout.tsx            # Root layout & providers
│   └── page.tsx              # Public landing page
├── components/               # UI components, dashboards, modals, search forms, map views
├── lib/                      # Database client, session helpers, constants, UddoktaPay client
├── prisma/
│   ├── schema.prisma         # Database models & relationships
│   └── seed.ts               # Database seed script
├── public/                   # Static assets & images
├── scripts/                  # Helper scripts (e.g., free-port.mjs)
├── middleware.ts             # Route protection & role onboarding middleware
├── package.json
└── README.md
```

---

## 📜 Available NPM Scripts

| Script | Command | Action |
|---|---|---|
| Dev Server | `npm run dev` | Starts dev server on port `1511` |
| Production Build | `npm run build` | Builds the production bundle |
| DB Push | `npm run db:push` | Syncs Prisma schema with PostgreSQL |
| DB Seed | `npm run seed` | Seeds initial data & demo accounts |
| Prisma Studio | `npm run db:studio` | Opens visual database explorer at `http://localhost:5555` |
| Prisma Client | `npm run prisma:generate` | Generates Prisma client |

---

## 🌐 Deployment on Vercel

1. Push your repository to GitHub.
2. Import your repository into **Vercel**.
3. Configure the environment variables (`DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY`, `UDDOKTAPAY_API_KEY`, etc.) in Vercel Project Settings.
4. Deployment builds automatically using `npm run build` (with `postinstall: prisma generate` pre-configured in `package.json`).

---

## 📄 License

This project is open-source and available under the **MIT License**.
