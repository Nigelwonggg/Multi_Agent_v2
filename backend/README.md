
# Chatbot Backend

This is the backend for a chatbot application built with Python, FastAPI, and LangGraph.


## Get all the API keys
1. Refer to `.env-example` file for all the API keys you need to get.
2. Change the file name from `.env-example` to `.env` and fill in your own API keys.
> DO NOT commit your `.env` file to any  repository.
> Everyone should have their own API keys.

## Setup (with uv)

1. Create and activate a virtual environment using uv:
	```sh
	uv venv .venv 
	```
2. Sync dependencies from `pyproject.toml`:
	```sh
	uv sync
	```
3. activate the virtual environment:
    ```sh
    source .venv/bin/activate
    ```

## Running the application

```sh
uvicorn app.main:app --reload
```

