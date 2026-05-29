# Adaptive LLM Agents Framework for Education Across Domains

> ⚠️ **Prototype Status Warning**
>
> This is a prototype application. Users may encounter bugs, incomplete features, or unexpected behavior.

This repository contains a full-stack application designed to facilitate educational chat interactions using multiple AI agents. The system is built to process both text and image data, leveraging advanced vector stores for efficient information retrieval across various educational domains.

## 🚀 Key Features & Benefits

*   **Multi-Agent Architecture:** Utilizes an adaptive framework with multiple AI agents to provide dynamic and context-aware educational support.
*   **Omnimodal Data Processing:** Handles both text and image inputs, expanding the scope of educational content and interactions.
*   **Vector Store Integration:** Employs vector databases for intelligent information retrieval, ensuring accurate and relevant responses from educational materials.
*   **Full-Stack Application:** A complete solution with a robust backend and an interactive frontend (frontend details are not provided in the prompt but implied by "full-stack").
*   **User Authentication & Identity:** Secure user registration, login, and identity verification mechanisms (e.g., `auth.py`, `identity_registry.py`).
*   **Rich Chat Functionality:** Supports sending messages, managing chat history, and updating chat titles for organized learning sessions (e.g., `chat.py`).
*   **Domain-Specific Interactions:** Designed to adapt to different educational domains (e.g., `domains.py`), with capabilities for quizzes (`quiz.py`) and content storage (`image_store.py`, `text_store.py`).
*   **Scalable Backend:** Built with Python, FastAPI, and LangGraph, providing a performant and extensible foundation for AI agent orchestration.

## 🛠️ Prerequisites & Dependencies

Before you begin, ensure you have the following installed:

*   **Git:** For cloning the repository.
*   **Python 3.11+:** For the backend services.
*   **Node.js:** For JavaScript/TypeScript development (likely for the frontend, not explicitly detailed here but listed as a technology).
*   **Docker & Docker Compose (Optional but Recommended):** For containerized deployment.
*   **`uv` (or `pip`):** A fast Python package installer and dependency resolver.

### Backend Specific Dependencies

The backend relies on the following key technologies:

*   **FastAPI:** A modern, fast (high-performance) web framework for building APIs with Python.
*   **LangGraph:** A library for building robust and stateful multi-agent applications with LLMs.
*   **SQLAlchemy:** An ORM for interacting with databases (e.g., `app.db`).

## ⚙️ Installation & Setup Instructions

To get this project up and running, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/Nigelwonggg/Multi_Agent_v2.git
cd Multi_Agent_v2
```

### 2. Backend Setup (Recommended: using `uv`)

The backend is written in Python.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Get API Keys:**
    Refer to the `.env-example` file in the `backend/` directory. Create a new file named `.env` in the same directory and fill in all the required API keys.
    ```bash
    cp .env-example .env
    # Open .env and populate with your keys
    ```
    > **Security Note:** Do NOT commit your `.env` file to version control. It contains sensitive credentials.

3.  **Create and Activate a Virtual Environment:**
    Using `uv` (ensure `uv` is installed, e.g., `pip install uv`):
    ```bash
    uv venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    ```
    If you prefer `pip`:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    pip install -r requirements.txt # (assuming requirements.txt exists or generate one with `uv pip freeze > requirements.txt`)
    ```

4.  **Install Dependencies:**
    ```bash
    uv sync
    ```

5.  **Run the Backend Application:**
    Once dependencies are installed, you can start the FastAPI application:
    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    (Note: `app.main:app` is a common FastAPI entry point. If `main.py` doesn't exist, you might need to adjust based on the actual entry file, potentially within `app/__init__.py`).
    The backend should now be running, typically accessible at `http://localhost:8000`.

### 3. Docker Setup (Alternative)

You can also run the backend using Docker for a containerized environment.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create `.env` file:**
    As described in step 2.2 above, create a `.env` file in the `backend/` directory with your API keys.

3.  **Build the Docker Image:**
    ```bash
    docker build -t multi-agent-backend .
    ```

4.  **Run the Docker Container:**
    ```bash
    docker run -p 8000:8000 multi-agent-backend
    ```
    The application will be accessible at `http://localhost:8000`.

## 📖 Usage Examples & API Documentation

Once the backend is running, you can interact with its API endpoints. FastAPI automatically generates interactive API documentation.

*   **Swagger UI:** Access the interactive API documentation at `http://localhost:8000/docs`.
*   **ReDoc:** Access an alternative API documentation at `http://localhost:8000/redoc`.

Here's a glimpse of the available API categories, inferred from the project structure:

*   `POST /auth/register`: Register a new user.
*   `POST /auth/login`: Log in a user and obtain an access token.
*   `POST /auth/verify-identity`: Verify user identity.
*   `GET /chats`: Retrieve a list of user chats.
*   `POST /chat/message`: Send a new message to a chat agent.
*   `GET /chat/{chat_id}/history`: Get the message history for a specific chat.
*   `PUT /chat/{chat_id}/title`: Update the title of a chat.
*   `POST /images/upload`: Upload an image to the store.
*   `GET /quiz/start`: Start a new quiz session.
*   `POST /text/store`: Store text data.

You can use tools like `curl`, Postman, or your preferred HTTP client to test these endpoints.

## 🔧 Configuration Options

The primary configuration for this project is managed through environment variables.

### Environment Variables

All critical configurations, including API keys for various services (e.g., LLMs, vector databases, image processing), should be stored in a `.env` file in the `backend/` directory.

Refer to `backend/.env-example` for a comprehensive list of required environment variables. Common examples include:

*   `OPENAI_API_KEY`
*   `ANTHROPIC_API_KEY`
*   `DATABASE_URL` (for database connection string, if not using default SQLite `app.db`)
*   `SECRET_KEY` (for JWT token generation in authentication)

## 🤝 Contributing Guidelines

We welcome contributions to the **Adaptive LLM Agents Framework for Education Across Domains**! If you're interested in helping improve this project, please consider the following:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `bugfix/issue-description`.
3.  **Make your changes.**
4.  **Write clear, concise commit messages.**
5.  **Test your changes thoroughly.**
6.  **Submit a pull request** to the `main` branch of this repository, describing your changes and their benefits.

## 📄 License Information

The license for this project has **not been specified**. Please contact the repository owner, Nigelwonggg, for details regarding licensing and usage permissions.

## 🙏 Acknowledgments

*   This project leverages numerous open-source libraries and frameworks, including FastAPI, LangGraph, SQLAlchemy, and others, without which this project would not be possible.
*   Special thanks to the open-source community for their continuous innovation and support.
