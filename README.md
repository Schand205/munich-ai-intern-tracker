# 🥨 Munich AI/ML Intern & Working Student Tracker

An automated job intelligence platform that scrapes, filters, and monitors Machine Learning, AI Engineering, and Data Science student positions across US Big Tech and top-tier employers in Munich.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11+-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)
![Supabase](https://img.shields.io/badge/Database-Supabase-emerald.svg)

---

## 🎯 Key Features

- **Automated Ingestion:** Daily scheduled runs via GitHub Actions querying career APIs directly (Greenhouse, Workday, custom REST endpoints).
- **Targeted Roles:** Focused exclusively on Internships (*Praktika*), Working Student (*Werkstudent*), and Thesis positions in Munich & surrounding hubs.
- **Smart Filtering:** Pre-filters out generic software roles to focus on ML, GenAI, NLP, Computer Vision, and Data Science.
- **Interactive Dashboard:** Modern Next.js interface with real-time status management (New, Saved, Applied, Interview, Rejected).

---

## 🏢 Targeted Companies

| Company | Hub Location | API / Ingestion Method |
| :--- | :--- | :--- |
| **Amazon / AWS** | Parkstadt Schwabing | Direct Search JSON API |
| **Apple** | Karlstraße (Silicon Design & AI) | Apple Jobs Internal API |
| **Google** | Arnulfpark | Google Careers API / Headless |
| **Microsoft** | Parkstadt Schwabing | Microsoft Careers Search API |
| **Celonis** | Theresienstraße | Greenhouse Board API |
| **NVIDIA** | Unterföhring / Munich | Workday REST Integration |

---

## 🏗️ Architecture

```text
munich-ai-intern-tracker/
├── .github/workflows/
│   └── scrape.yml             # Scheduled scraper cronjob
├── backend/
│   ├── scrapers/              # Company-specific parser modules
│   ├── config.py              # Filtering rules and keywords
│   ├── database.py            # Supabase Postgres client
│   ├── main.py                # Pipeline entrypoint
│   └── requirements.txt
├── frontend/                  # Next.js + Tailwind + shadcn/ui Dashboard
├── .gitignore
├── LICENSE
└── README.md