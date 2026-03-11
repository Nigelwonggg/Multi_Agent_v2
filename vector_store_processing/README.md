# Vector Store Processing

This folder contains the processing scripts and data for creating vector databases from various document sources.

## Required Data Downloads

Due to GitHub file size limitations, some large files are not included in this repository. Please download the following datasets manually:

### Medical Books (`med_books/`)

The medical books dataset contains various medical and neuroscience textbooks and research papers. You'll need to download these files locally:

**Download Source:** [Kaggle Medical Books Dataset](https://www.kaggle.com/datasets/naveenpradhaph/database)

1. Visit the Kaggle link above
2. Download the dataset
3. Extract the files to the `med_books/` folder in this directory

### Data Science Books (`data_science_books/`)

The data science books collection includes comprehensive cheat sheets and reference materials for data science, machine learning, and related topics.

**Download Source:** [Data Science Cheat Sheet Repository](https://www.kaggle.com/datasets/timoboz/data-science-cheat-sheets/data)

1. Visit the GitHub repository link above
2. Clone or download the repository
3. Copy the relevant PDF files and folders to the `data_science_books/` folder in this directory


## Usage

Once you have downloaded the required files:

1. Ensure you have the necessary Python dependencies installed
2. Run the vector processing scripts to create your vector databases
3. The processed vector databases will be stored in the respective `*_db*` folders

## Note

- Some files may be large (>100MB), which is why they cannot be stored directly in the Git repository
- Make sure you have sufficient disk space before downloading
- The vector processing may take some time depending on the size of your dataset

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
3. activate the virtual environment (use root .venv for Jupyter notebook kernel):
    ```sh
    source ../.venv/bin/activate
    ```

4. **For Jupyter Notebook users**: Select the correct kernel
   - Open your Jupyter notebook
   - In VS Code: Click on the kernel selector in the top-right corner of the notebook
   - Choose "Select Another Kernel..." → "Python Environments..."
   - Select the Python interpreter from the root `.venv` folder (should show path like `../.venv/bin/python`)
   - Alternatively, you can use the Command Palette (Cmd+Shift+P / Ctrl+Shift+P) and type "Python: Select Interpreter"
