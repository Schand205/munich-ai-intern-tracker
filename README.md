# Munich AI/ML Intern & Working Student Tracker

An automated tracker for Munich-based AI, Machine Learning, and Data Science student roles at companies such as Amazon, Celonis, Apple, Google, Microsoft, and NVIDIA.

## What it does

- Scrapes targeted company career sources on a schedule via GitHub Actions.
- Filters for Munich-based internships, working student roles, and thesis positions in AI/ML/Data fields.
- Stores deduplicated results in Supabase/PostgreSQL.
- Presents the live board in a Next.js dashboard.

## Stack

- Backend: Python 3.11+, `httpx`, `beautifulsoup4`, `supabase-py`, `pydantic`, `rich`
- Automation: GitHub Actions cron workflow
- Frontend: Next.js, TypeScript, Tailwind CSS, `@supabase/supabase-js`
- Storage: Supabase PostgreSQL

## Repository layout

```text
munich-ai-intern-tracker/
├── .github/workflows/scrape.yml   # Scheduled backend scrape job
├── backend/                       # Python scraper pipeline
├── docs/SETUP.md                  # Detailed setup and deployment guide
├── frontend/                      # Next.js dashboard
└── README.md
```

## How to use after cloning

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd munich-ai-intern-tracker
```

### 2. Configure Supabase

Create the `public.jobs` table and RLS policies described in [docs/SETUP.md](docs/SETUP.md).

You will need these credentials:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Set up the backend

```bash
cd backend
cp .env.example .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Fill `backend/.env` with:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Run the scraper manually:

```bash
python main.py
```

### 4. Set up the frontend

```bash
cd ../frontend
npm install
```

Fill `frontend/.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Start the dashboard:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scheduled runs

The repository includes [/.github/workflows/scrape.yml](.github/workflows/scrape.yml), which runs the scraper every 6 hours and also supports manual dispatch from GitHub Actions.

Add these repository secrets in GitHub:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## How the pipeline works

1. GitHub Actions starts the Python scraper on a schedule.
2. The backend scrapers fetch raw job listings from company APIs.
3. The filter engine keeps only Munich-relevant AI/ML/Data roles.
4. The database layer upserts the surviving jobs into Supabase.
5. The frontend reads the current job board through its server-side API route and renders the dashboard.

## Notes

- Job status values such as `APPLIED` are preserved when the same job is scraped again.
- The frontend uses a server-side API route, so the service role key stays on the server and is never exposed to the browser.
- `backend/venv`, `frontend/node_modules`, `.next`, and `.env*` files are ignored by Git already.

## More details

For deeper setup and deployment instructions, see [docs/SETUP.md](docs/SETUP.md).
