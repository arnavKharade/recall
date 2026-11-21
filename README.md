# Recall

**Recall is an AI document assistant that helps people ask questions about PDFs and check the answer against cited source pages.** This repository contains the full-stack project. The public Vercel version is a frontend-only portfolio demo; the full application runs locally with the backend services described below.

## Demo and hosting constraints

There is currently no budget for a permanently hosted backend. Vercel therefore serves only the user interface in demo mode. The demo uses fictional sample documents and prepared sample answers so visitors can explore the screens and citation interaction. It does not connect to the AI pipeline, accept uploads, create accounts, or save conversations.

The complete application is in this GitHub repository. To try real uploads, retrieval, and answers, either set it up locally using the instructions below or view it on the developer's laptop while its database, backend, and Ollama services are running. The GitHub repository contains the code and setup instructions; GitHub itself is not hosting the live backend.

To run the frontend demo locally without the backend, see [commands.txt](commands.txt). For a Vercel deployment, set the project root to `frontend` and define `VITE_DEMO_MODE=true`.

## Aim

The goal is to make long documents easier to use. A user should be able to upload PDFs, organize them into collections, ask a question in everyday language, and receive an answer grounded in retrieved document passages. Citations include the document name, quoted passage, and PDF page so users can verify the evidence. When retrieval does not find adequate evidence, Recall should say so rather than invent an answer.

## What the project demonstrates

- A full-stack workflow for account access, PDF uploads, document collections, and conversations.
- PDF text extraction, chunking, and 384-dimensional embeddings.
- Hybrid document retrieval using PostgreSQL full-text search and pgvector, combined with Reciprocal Rank Fusion.
- Local-model answer generation through Ollama, with source and page citations.
- A React interface for managing documents and reviewing answers alongside their evidence.

Recall is a portfolio-stage prototype. Retrieval quality and citation behavior are still being evaluated across different documents and question types. Scanned PDFs that contain images rather than extractable text are not supported because OCR has not been added.

## Technology

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| Backend | Python, FastAPI, SQLAlchemy 2, Alembic |
| Database and search | PostgreSQL, pgvector, PostgreSQL full-text search, Reciprocal Rank Fusion |
| Document processing | PyMuPDF, sentence-transformers `all-MiniLM-L6-v2` (384-dimensional embeddings) |
| Answer generation | Ollama with `qwen2.5:3b` |
| Development and deployment | Docker Compose, Pytest, Vitest/React Testing Library planned |

## How answers are produced

```text
PDF upload → text extraction → chunking and embeddings → PostgreSQL + pgvector
Question   → vector and keyword retrieval → RRF ranking → Ollama answer
                                                              ↓
                                              answer with passage and page citations
```

## Run the full application locally

### Prerequisites

- Git and Docker Desktop with Docker Compose v2
- Node.js 22+ and npm
- Python 3.11 or 3.12
- Ollama installed and running on the development machine
- Internet access for the first download of the Ollama and sentence-transformers models

### 1. Configure local environment files

From the repository root, copy the examples:

```sh
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

The root `.env` example uses the local PostgreSQL address `localhost:5432`. Change the example `SECRET_KEY` to a private random value of at least 32 characters. Do not commit `.env` or `.env.local` files.

### 2. Start PostgreSQL and Ollama

Start the database container:

```sh
docker compose up -d db
```

Start Ollama on your machine and download the model once:

```sh
ollama pull qwen2.5:3b
```

The local backend expects PostgreSQL at `localhost:5432` and Ollama at `http://localhost:11434`.

### 3. Start the backend

In a new terminal:

```sh
cd backend
python -m venv .venv
```

Activate the environment. In Git Bash on Windows, use `source .venv/Scripts/activate`; in PowerShell, use `.venv\Scripts\Activate.ps1`; on macOS/Linux, use `source .venv/bin/activate`.

Then install dependencies, apply migrations, and start the API:

```sh
python -m pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API health endpoints are `http://127.0.0.1:8000/health` and `http://127.0.0.1:8000/health/database`.

### 4. Start the frontend

In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The frontend example points to `http://localhost:8000/api/v1`. If you run the backend on a different port, set `VITE_API_URL` in `frontend/.env.local` to match it, then restart Vite.

### Docker Compose alternative

Compose can run PostgreSQL, Ollama, migrations, FastAPI, and the Nginx frontend together. From the repository root:

```sh
docker compose up -d db ollama
docker compose --profile setup run --rm ollama-model-setup
docker compose up -d --build
```

The app is served at `http://localhost:8080`. PDFs, the database, Ollama models, and the embedding cache use persistent Docker volumes. Do not use `docker compose down -v` for routine shutdowns; it deletes those volumes and their data.

## Constraints and next steps

- **Hosting:** only the sample frontend demo is intended for Vercel. FastAPI, PostgreSQL/pgvector, Ollama, and persistent PDF storage are not currently hosted publicly because of the cost.
- **Demo behavior:** sample questions use prepared responses; they do not call the real retrieval or generation pipeline.
- **Model speed:** the local Qwen model runs on CPU in the basic setup, so answers can take time.
- **PDF support:** text-based PDFs are supported; scanned/image-only PDFs need OCR.
- **Quality:** hybrid retrieval and page citations need continued evaluation on varied documents, collections, and questions with insufficient evidence.
- **Production work:** deployment hardening, backups, rate limiting, security review, and S3-compatible PDF storage remain future work.

## Development checks

```sh
cd frontend
npm run build
npm run lint
```

```sh
cd backend
python -m pytest
python -m compileall -q app
```

See [commands.txt](commands.txt) for copy-and-run startup commands, including the frontend-only demo.
