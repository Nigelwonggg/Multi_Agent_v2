# Adaptive LLM Agents for Education

> Prototype status: this project is still evolving, so some workflows, prompts, and UI paths may change as features are refined.

This repository contains a full-stack educational AI platform built around a multi-agent chat workflow. It combines a React frontend, a FastAPI backend, LangGraph-based orchestration, and domain-specific vector stores so students and lecturers can interact with course content through chat, document retrieval, and quiz workflows.

## Overview

The application is designed to support teaching and learning across multiple domains, currently centered on data science and medical content.

Core capabilities include:

- multi-agent chat with routing between direct answers and retrieval-augmented generation
- text and image retrieval from prebuilt vector stores
- lecturer-managed document and image stores
- quiz creation, delivery, marking, and attempt review
- authentication with role-based access for lecturers and students
- identity registry and unit management features for course administration

## Architecture

The project is split into three main parts:

- [`frontend/`](./frontend): React + TypeScript + Vite web application
- [`backend/`](./backend): FastAPI API, LangGraph orchestration, auth, quiz logic, and vector-store access
- [`vector_store_processing/`](./vector_store_processing): document processing scripts and notebooks for building or refreshing vector databases

At a high level, the workflow is:

1. Source PDFs and course material are processed into vector databases.
2. The backend loads the relevant text and image stores by domain.
3. A LangGraph chat flow decides whether a question needs retrieval.
4. The frontend presents chats, retrieved content, and quiz workflows to users.

## Key Features

### Multi-Agent Educational Chat

- LangGraph coordinates a router, direct-answer node, retrieval path, image selection, and final answer generation.
- The backend can answer simple prompts directly or enrich answers with retrieved text and image context.
- An optional evaluator stage can be enabled through environment configuration.

### Domain-Aware Retrieval

- Separate text and image vector databases exist for different subject areas.
- The repository already includes built vector stores for:
  - `ds_text_db_llama`
  - `ds_image_db_llama`
  - `med_text_db`
  - `med_image_db`
- Additional custom domain directories are supported under `backend/vector_databases/`.

### Assessment Workflows

- Lecturers can create quizzes, review attempts, and manage unit-linked quiz availability.
- Students can take quizzes and review their own results where supported.
- The backend stores quiz attempts and builds review snapshots for later inspection.

### Content and Admin Tools

- Lecturer-facing pages support text store management, image store management, PDF upload, and identity registry administration.
- Unit management is built into the backend and frontend routing structure.

## Repository Structure

```text
.
├── backend/                  FastAPI app, LangGraph logic, database models, APIs
├── frontend/                 React app and UI components
├── vector_store_processing/  Data preparation and vector DB generation
└── README.md                 Project entry point
```

Useful backend areas:

- [`backend/app/api/routes`](./backend/app/api/routes): chat, auth, quiz, text/image store, domain, and identity endpoints
- [`backend/app/graph_logics`](./backend/app/graph_logics): LangGraph assembly and chat flow control
- [`backend/app/services`](./backend/app/services): retrieval, PDF ingestion, LLM, and quiz services
- [`backend/vector_databases`](./backend/vector_databases): runtime vector stores loaded by the application

Useful frontend areas:

- [`frontend/src/pages`](./frontend/src/pages): page-level UI including chat, quizzes, uploads, and admin screens
- [`frontend/src/components`](./frontend/src/components): reusable UI building blocks
- [`frontend/src/api`](./frontend/src/api): browser-side API clients

## Tech Stack

- Frontend: React 19, TypeScript, Vite, React Router
- Backend: FastAPI, SQLAlchemy, LangGraph, LangChain
- Retrieval: ChromaDB + Hugging Face embeddings
- Storage: SQLite by default, configurable through `DATABASE_URL`
- AI providers: configurable support is present for OpenAI, Groq, Gemini, and related tooling

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- `uv` for Python dependency management
- `npm`
- At least one usable LLM API key for the backend and vector processing workflows

### 1. Start the Backend

```sh
cd backend
uv venv .venv
uv sync
source .venv/bin/activate
uvicorn app.main:app --reload
```

The FastAPI server runs on `http://localhost:8000` by default.

### 2. Start the Frontend

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

The Vite development server runs on `http://localhost:5173`.

### 3. Sign In With the Seeded Local Accounts

On backend startup, the app creates two default local users if they do not already exist:

- Lecturer: `admin@test.com` / `password123`
- Student: `student@test.com` / `password123`

These are convenient for local development only. Replace them or remove them before any real deployment.

## Environment Configuration

### Backend

The backend expects a local `backend/.env` file, but a tracked `backend/.env-example` is not currently included in the repository. Create `backend/.env` manually with the settings you need.

Common variables used by the backend include:

- `DATABASE_URL`
- `SECRET_KEY`
- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- `GOOGLE_API_KEY`
- `GEMINI_API_KEY`
- `EMBEDDING_MODEL`
- `CHAT_ENABLE_EVALUATOR`
- `CHAT_MAX_EVALUATION_RETRIES`
- `LOG_LEVEL`

A minimal local example looks like:

```env
DATABASE_URL=chat_history.db
SECRET_KEY=change-me
OPENAI_API_KEY=
GROQ_API_KEY=
GOOGLE_API_KEY=
GEMINI_API_KEY=
LOG_LEVEL=DEBUG
```

### Frontend

The frontend reads its backend base URL from:

```env
VITE_API_BASE_URL=http://localhost:8000
```

If this variable is not set, the frontend falls back to `http://localhost:8000`.

### Vector Store Processing

[`vector_store_processing/.env-example`](./vector_store_processing/.env-example) can be used as a reference for the document-processing pipeline.

## Vector Store Workflow

The repository already contains built vector databases under [`backend/vector_databases`](./backend/vector_databases), so the main app can run without rebuilding them first.

If you want to refresh or extend the retrieval data:

1. Add or update source materials in `vector_store_processing/`.
2. Configure the vector-processing environment using `vector_store_processing/.env-example`.
3. Use the processing notebooks or `pdf_processor.py` to generate updated vector databases.
4. Copy the resulting database directories into `backend/vector_databases/`.
5. Restart the backend so it picks up the new stores.

Current bundled domain stores include:

- data science text
- data science image
- medical text
- medical image

## API Surface

The backend exposes routes for:

- chat history and messaging
- authentication
- domain lookup
- text store management
- image store management
- quizzes and attempts
- identity registry

See [`backend/app/api/routes`](./backend/app/api/routes) for the current route modules.

## Development Notes

- SQLite is the default local database.
- Logging is enabled in the backend and writes to `backend/logs/` by default.
- Some deployment-era configuration still exists in the codebase, including Firebase Hosting and Cloud Run references, but the project can be developed locally without them.
- The frontend contains both real API calls and fallback dummy data paths in a few places, which is useful during development but worth reviewing before production use.

## Component Documentation

For more focused setup details, refer to:

- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)
- [`vector_store_processing/README.md`](./vector_store_processing/README.md)

## Suggested First Steps for New Contributors

1. Start the backend and frontend locally.
2. Log in with a seeded lecturer account.
3. Test chat, quiz, and vector-store management flows.
4. Review the LangGraph flow in [`backend/app/graph_logics/chat_graph.py`](./backend/app/graph_logics/chat_graph.py).
5. Explore how retrieved content is surfaced in the chat UI.
