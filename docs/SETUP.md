# 🛠️ Developer Setup & Deployment Guide

This guide walks you step-by-step through setting up the local development environment, configuring Supabase, and deploying the automated scrapers and frontend.

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Supabase Database Configuration](#-supabase-database-configuration)
3. [Backend Setup & Local Scraping](#-backend-setup--local-scraping)
4. [Frontend Setup & Dashboard](#-frontend-setup--dashboard)
5. [Automated Scraping via GitHub Actions](#-automated-scraping-via-github-actions)
6. [Hosting Frontend on Vercel](#-hosting-frontend-on-vercel)
7. [Troubleshooting & Best Practices](#-troubleshooting--best-practices)

---

## 📦 Prerequisites

Before starting, ensure you have the following installed:
- **Git** (`git --version`)
- **Python 3.11+** (`python3 --version`)
- **Node.js 18+ & npm** (`node -v` and `npm -v`)
- A free account on [Supabase](https://supabase.com)
- A free account on [Vercel](https://vercel.com) (for dashboard deployment)

---

## 🗄️ Supabase Database Configuration

1. Log in to [Supabase](https://supabase.com) and create a new project (choose the **Frankfurt (eu-central-1)** region).
2. Go to the **SQL Editor** in the Supabase Dashboard and run:

```sql
create table public.jobs (
  id text primary key,
  company text not null,
  title text not null,
  location text default 'Munich',
  job_type text not null,
  category text default 'ML/AI',
  url text not null,
  description_summary text,
  tags text[] default '{}',
  first_seen timestamptz default timezone('utc'::text, now()),
  status text default 'NEW',
  is_active boolean default true
);

create index idx_jobs_company_type_status on public.jobs (company, job_type, status);
create index idx_jobs_first_seen on public.jobs (first_seen desc);

alter table public.jobs enable row level security;

create policy "Allow read access to all users" 
on public.jobs for select 
using (true);

create policy "Allow update access to job status" 
on public.jobs for update 
using (true)
with check (true);

```

3. Go to **Project Settings > API** and copy:
* **Project URL** (`https://xyz.supabase.co`)
* **anon / public key** (Used in Next.js Frontend)
* **service_role key** (Used in Python Scrapers & GitHub Actions)



---

## 🐍 Backend Setup & Local Scraping

### 1. Environment Configuration

Navigate to the `backend/` directory and create an `.env` file:

```bash
cd backend
cp .env.example .env

```

Fill in your Supabase credentials in `backend/.env`:

```env
SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

```

### 2. Install Python Dependencies

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

```

### 3. Run a Manual Test Scrape

```bash
python main.py

```

---

## 💻 Frontend Setup & Dashboard

### 1. Environment Configuration

Navigate to the `frontend/` directory and create `.env.local`:

```bash
cd ../frontend
cp .env.example .env.local

```

Fill in the frontend credentials in `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-public-key

```

### 2. Install Dependencies & Start Dev Server

```bash
npm install
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 Automated Scraping via GitHub Actions

To run the scrapers automatically every 6 hours:

1. Push your repository to **GitHub**.
2. In your GitHub repo, go to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret** and add:
* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`


4. Test the pipeline manually in GitHub under **Actions > Run Job Scrapers > Run workflow**.

---

## ☁️ Hosting Frontend on Vercel

1. Go to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Import your GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Add the **Environment Variables**:
* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`


5. Click **Deploy**.

---

## 🔧 Troubleshooting & Best Practices

* **Bot Protection:** If requests fail with HTTP 403, include realistic browser headers (`User-Agent`, `Accept-Language: en-US,en;q=0.9`).
* **Deduplication:** Always generate job IDs deterministically (e.g. `f"{company.lower()}_{external_id}"`).

```
