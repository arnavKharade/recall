# Recall — AI-Powered Document Intelligence

Recall is an AI-powered document intelligence platform that helps users understand, search, and interact with their documents through natural-language questions.

Instead of manually searching through lengthy PDFs, users can upload documents, discover relevant information, and receive AI-generated answers grounded in the contents of their files.

## Problem Statement

Finding specific information in lengthy documents can be time-consuming. Traditional document viewers primarily rely on keyword searches, which may not identify relevant passages when the wording differs from the user's query.

Recall aims to make document exploration more intuitive by combining semantic search, document processing, and retrieval-augmented generation (RAG).

## Core Features

### Minimum Viable Product (MVP)

- **Document Upload:** Upload PDF documents through the web interface.
- **Document Library:** View and manage uploaded documents.
- **Text Extraction:** Extract readable text from PDF files.
- **Document Processing:** Split extracted text into smaller, searchable chunks.
- **Semantic Search:** Retrieve relevant passages based on meaning rather than exact keyword matches.
- **AI Question Answering:** Ask natural-language questions about uploaded documents.
- **Source Citations:** Connect generated answers to the document passages that support them.
- **Document Management:** Track processing status and manage stored documents.
- **Authentication and Authorization:** Protect user accounts and ensure users can access only their own documents.

### Planned Enhancements

- Automatic document summaries.
- Flashcard generation for learning and revision.
- Comparisons between multiple documents.
- Collections and document organization.

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React, TypeScript, Vite | User interface |
| Styling | Tailwind CSS | Responsive interface and design system |
| Routing | React Router | Client-side navigation |
| Server-state management | TanStack Query | API data fetching and caching |
| Backend | Python, FastAPI | REST API and application logic |
| Database | PostgreSQL | Persistent application data |
| Vector Search | pgvector | Similarity search over document embeddings |
| Database Access | SQLAlchemy | Python database operations |
| Database Migrations | Alembic | Versioned database schema changes |
| PDF Processing | PyMuPDF | Extract text from PDF documents |
| AI Integration | To be finalized | Embeddings, retrieval, and answer generation |
| Testing | Pytest, Vitest, React Testing Library | Backend and frontend testing |
| Version Control | Git, GitHub | Collaboration and source control |

## How It Works

The intended document-question-answering workflow is:

1. A user uploads a PDF through the frontend.
2. The backend validates the upload and stores the document.
3. The PDF processing service extracts its text.
4. The extracted text is divided into smaller chunks.
5. An embedding model converts the chunks into vector representations.
6. PostgreSQL stores document metadata and chunks, while pgvector supports similarity search over embeddings.
7. When the user asks a question, Recall retrieves relevant document passages.
8. The AI model generates an answer using the retrieved passages as context.
9. The frontend displays the answer alongside source references.

This workflow is the planned architecture; individual stages will be implemented and tested incrementally.

## Project Structure

```text
Recall/
├── frontend/          # React application
├── backend/           # FastAPI application
├── docs/              # Project and technical documentation
├── .gitignore
└── README.md
```

The structure will expand as application modules are introduced.

## Development Principles

- Keep the frontend and backend responsibilities separate.
- Use environment variables for configuration and secrets.
- Validate uploaded files and enforce document ownership.
- Keep database schema changes version-controlled.
- Return clear API errors and handle processing failures.
- Test core functionality as it is implemented.
- Keep generated answers grounded in retrieved document evidence.
- Avoid exposing private document contents or credentials in logs.

## Development Roadmap

### Phase 1 — Project Foundation
- Establish the repository and development workflow.
- Document the system architecture.
- Create the initial FastAPI application.
- Define the database schema.

### Phase 2 — Database and API
- Integrate PostgreSQL and pgvector.
- Implement document metadata and database access.
- Establish API request and response contracts.

### Phase 3 — Document Processing
- Implement PDF uploads and validation.
- Extract text and generate document chunks.
- Store processing status and extracted content.

### Phase 4 — Search and Question Answering
- Generate embeddings.
- Implement semantic retrieval.
- Generate evidence-grounded answers.
- Display source citations.

### Phase 5 — Reliability and Security
- Implement authentication and authorization.
- Add tests and error handling.
- Validate access controls and document deletion behavior.

### Phase 6 — Portfolio Polish
- Improve loading, empty, and error states.
- Add summaries and other enhancements.
- Document setup instructions and architecture decisions.

## Collaboration

Recall is being developed collaboratively using Git and GitHub.

- `main` is reserved for stable, integrated work.
- Features are developed on separate branches.
- Changes are reviewed and merged through pull requests.

## Project Status

**Status:** Initial development

The frontend interface is under development. The backend, database integration, document processing pipeline, and AI functionality will be implemented incrementally.
