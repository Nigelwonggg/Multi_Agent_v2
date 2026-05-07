from sentence_transformers import SentenceTransformer
import os

model_name = "sentence-transformers/all-mpnet-base-v2"
print(f"Downloading model: {model_name}")
SentenceTransformer(model_name)
print("Download complete.")
