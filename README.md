# Adaptive LLM Agents Framework for Education Across Domains

> ⚠️ **Prototype Status Warning**
>
> This is a prototype application. Users may encounter bugs, incomplete features, or unexpected behavior.

This repository contains a full-stack application for educational chat interactions using multiple AI agents. The system processes both text and image data, utilizing vector stores for efficient information retrieval.

## Setup Instructions

To set up and run this project, please refer to the README files in each component's directory:

1. Backend setup: See `/backend/README.md` for Python environment setup and API configuration
2. Frontend setup: See `/frontend/README.md` for Node.js dependencies and development server setup
3. Vector Store Processing setup: See `/vector_store_processing/README.md` for data processing setup and required datasets

Each component's README contains detailed instructions specific to that part of the system. Make sure to follow them in order to get the full application running.

## Project Structure

### `/backend`
- Main FastAPI backend application
- Contains the core chat logic, API endpoints, and database interactions
- Key components:
  - `/app/api`: API route definitions
  - `/app/nodes`: Chat flow nodes for different agent behaviors
  - `/app/services`: Core services including vector store interactions
  - `/app/databases`: Database models and connections
  - `/app/schemas`: Pydantic models for data validation
  - `/app/utils`: Utility functions and helpers
  - `/app/graph_logics`: Graph-based conversation flow logic
- Also includes assignment marking functionality and text comparison tools

### `/frontend`
- React-based web interface built with TypeScript and Vite
- Contains:
  - `/src/components`: Reusable UI components
  - `/src/pages`: Main application pages
  - `/src/api`: API integration layer
  - `/src/hooks`: Custom React hooks

### `/vector_store_processing`
Processing pipeline for creating and managing vector databases.
- Handles PDF processing and vector store creation
- Contains example notebooks and configuration
- Organized by domains:
  - Data Science related content
  - Medical domain content

> **⚠️ Important Note about Vector Databases**
> The vector databases created in `/vector_store_processing/[domain]_db_llama` need to be manually copied to `/backend/vector_databases/` to be used by the main application. This is required whenever new domain databases are created or updated.
>
> Current vector database domains:
> - `ds_text_db_llama`: Data Science text embeddings
> - `ds_image_db_llama`: Data Science image embeddings
> - `med_text_db`: Medical text embeddings
> - `med_image_db`: Medical image embeddings


## Contributing

When working with vector stores:
1. Use the `/vector_store_processing` directory for creating and updating vector databases
2. After creating new domain databases, copy them to `/backend/vector_databases/`
3. Update the relevant service configurations in the backend to use the new databases

