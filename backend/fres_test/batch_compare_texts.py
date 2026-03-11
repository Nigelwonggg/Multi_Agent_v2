#!/usr/bin/env python3
"""
Batch comparison script that reads multiple text samples from data files
and computes average scores across all samples for AGENT, GPT, and GEMINI models.

Supports multiple input formats:
- JSON: {"samples": [{"agent": "...", "gpt": "...", "gemini": "..."}, ...]}
- CSV: columns named 'agent', 'gpt', 'gemini' (one row per sample)
- Directory of text files: agent_N.txt, gpt_N.txt, gemini_N.txt

Usage:
    python batch_compare_texts.py --json-file data.json --out results.json
    python batch_compare_texts.py --csv-file data.csv --out results.json
    python batch_compare_texts.py --text-dir ./samples --out results.json

Dependencies:
    textstat, lexicalrichness, pandas (for CSV), numpy, scipy, sentence-transformers (optional)
"""

import argparse
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
import statistics

try:
    import pandas as pd
except ImportError:
    pd = None

# Import the core comparison function from compare_texts
try:
    from compare_texts import (
        compute_readability,
        compute_lexical,
        coherence_metrics,
        coherence_score_from_stats,
    )
except ImportError:
    # Try relative import if running as module
    try:
        from .compare_texts import (
            compute_readability,
            compute_lexical,
            coherence_metrics,
            coherence_score_from_stats,
        )
    except ImportError:
        print("Error: Could not import compare_texts module. Make sure it's in the same directory.")
        compute_readability = None
        compute_lexical = None
        coherence_metrics = None
        coherence_score_from_stats = None

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    from scipy.spatial.distance import cosine
except ImportError:
    SentenceTransformer = None
    np = None
    cosine = None


# --------- Data Loading Functions ---------

def load_from_json(filepath: str) -> List[Dict[str, str]]:
    """Load samples from JSON file with support for multi-line text.
    
    Expected format:
    {
        "samples": [
            {
                "agent": "Multi-line text here...\nSecond line...\nThird line...",
                "gpt": "Another multi-line\ntext sample",
                "gemini": "Yet another\nmulti-line sample"
            },
            ...
        ]
    }
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if isinstance(data, dict) and "samples" in data:
        return data["samples"]
    elif isinstance(data, list):
        return data
    else:
        raise ValueError("JSON must contain 'samples' array or be an array of objects")


def load_from_jsonl(filepath: str) -> List[Dict[str, str]]:
    """Load samples from JSONL (JSON Lines) file - best for multi-line text.
    
    Each line is a separate JSON object:
    {"agent": "Multi-line\\ntext here", "gpt": "GPT\\ntext", "gemini": "Gemini\\ntext"}
    {"agent": "Second sample\\nwith lines", "gpt": "GPT 2\\ntext", "gemini": "Gemini 2\\ntext"}
    """
    samples = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:  # Skip empty lines
                continue
            try:
                sample = json.loads(line)
                samples.append(sample)
            except json.JSONDecodeError as e:
                print(f"Warning: Skipping invalid JSON on line {line_num}: {e}")
    return samples


def load_from_csv(filepath: str) -> List[Dict[str, str]]:
    """Load samples from CSV file with columns: agent, gpt, gemini
    
    Note: CSV format may not preserve multi-line text well. Use JSON or JSONL for multi-line content.
    """
    if pd is None:
        raise ImportError("pandas is required for CSV support. Install with: pip install pandas")
    
    df = pd.read_csv(filepath)
    samples = []
    
    for _, row in df.iterrows():
        sample = {}
        if 'agent' in row:
            sample['agent'] = str(row['agent'])
        if 'gpt' in row:
            sample['gpt'] = str(row['gpt'])
        if 'gemini' in row:
            sample['gemini'] = str(row['gemini'])
        samples.append(sample)
    
    return samples


def load_from_text_dir(dirpath: str) -> List[Dict[str, str]]:
    """Load samples from directory of text files.
    
    Expected naming: agent_1.txt, gpt_1.txt, gemini_1.txt, agent_2.txt, etc.
    """
    dir_path = Path(dirpath)
    if not dir_path.is_dir():
        raise ValueError(f"Directory not found: {dirpath}")
    
    # Group files by sample number
    samples_dict = {}
    
    for file_path in dir_path.glob("*.txt"):
        # Parse filename: model_number.txt
        match = re.match(r"(agent|gpt|gemini)_(\d+)\.txt", file_path.name)
        if match:
            model, num = match.groups()
            num = int(num)
            
            if num not in samples_dict:
                samples_dict[num] = {}
            
            with open(file_path, 'r', encoding='utf-8') as f:
                samples_dict[num][model] = f.read()
    
    # Convert to list
    samples = [samples_dict[i] for i in sorted(samples_dict.keys())]
    return samples


# --------- Batch Comparison Functions ---------

def compute_single_sample_metrics(sample: Dict[str, str], enable_coherence: bool = True) -> Dict[str, Any]:
    """Compute metrics for a single sample containing agent/gpt/gemini texts."""
    result = {"agent": {}, "gpt": {}, "gemini": {}}
    
    models = ["agent", "gpt", "gemini"]
    
    for model in models:
        if model not in sample or not sample[model]:
            continue
        
        text = sample[model]
        result[model]["readability"] = compute_readability(text)
        result[model]["lexical"] = compute_lexical(text)
    
    # Coherence
    if enable_coherence and SentenceTransformer is not None and np is not None:
        try:
            model_obj = SentenceTransformer("all-MiniLM-L6-v2")
            
            for model_name in models:
                if model_name in sample and sample[model_name]:
                    stats = coherence_metrics(sample[model_name], model=model_obj)
                    result[model_name]["coherence"] = stats
                    if isinstance(stats, dict) and "mean" in stats:
                        score = coherence_score_from_stats(stats.get("mean", 0.0), stats.get("std", 0.0))
                        result[model_name]["coherence_score_0_100"] = score
        except Exception as e:
            result["coherence_error"] = str(e)
    
    return result


def aggregate_metrics(all_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate metrics across all samples to compute averages."""
    aggregated = {
        "agent": {"readability": {}, "lexical": {}, "coherence": {}},
        "gpt": {"readability": {}, "lexical": {}, "coherence": {}},
        "gemini": {"readability": {}, "lexical": {}, "coherence": {}},
        "meta": {
            "total_samples": len(all_results),
        }
    }
    
    models = ["agent", "gpt", "gemini"]
    
    # Collect all values for each metric
    for model in models:
        readability_values = {
            "flesch_reading_ease": [],
            "smog_index": [],
            "flesch_kincaid_grade": [],
            "automated_readability_index": [],
            "dale_chall_readability_score": [],
            "difficult_words": [],
        }
        
        lexical_values = {
            "mtld": [],
            "hdd": [],
        }
        
        coherence_values = {
            "mean": [],
            "std": [],
            "coherence_score_0_100": [],
        }
        
        # Extract values from all samples
        for result in all_results:
            if model in result and result[model]:
                # Readability
                if "readability" in result[model]:
                    for key in readability_values.keys():
                        val = result[model]["readability"].get(key)
                        if val is not None and not isinstance(val, str):
                            readability_values[key].append(val)
                
                # Lexical
                if "lexical" in result[model]:
                    for key in lexical_values.keys():
                        val = result[model]["lexical"].get(key)
                        if val is not None:
                            lexical_values[key].append(val)
                
                # Coherence
                if "coherence" in result[model]:
                    for key in ["mean", "std"]:
                        val = result[model]["coherence"].get(key)
                        if val is not None:
                            coherence_values[key].append(val)
                
                if "coherence_score_0_100" in result[model]:
                    coherence_values["coherence_score_0_100"].append(result[model]["coherence_score_0_100"])
        
        # Compute averages
        for key, values in readability_values.items():
            if values:
                aggregated[model]["readability"][f"{key}_avg"] = statistics.mean(values)
                aggregated[model]["readability"][f"{key}_std"] = statistics.stdev(values) if len(values) > 1 else 0.0
                aggregated[model]["readability"][f"{key}_min"] = min(values)
                aggregated[model]["readability"][f"{key}_max"] = max(values)
        
        for key, values in lexical_values.items():
            if values:
                aggregated[model]["lexical"][f"{key}_avg"] = statistics.mean(values)
                aggregated[model]["lexical"][f"{key}_std"] = statistics.stdev(values) if len(values) > 1 else 0.0
        
        for key, values in coherence_values.items():
            if values:
                aggregated[model]["coherence"][f"{key}_avg"] = statistics.mean(values)
                aggregated[model]["coherence"][f"{key}_std"] = statistics.stdev(values) if len(values) > 1 else 0.0
    
    return aggregated


def batch_compare(samples: List[Dict[str, str]], enable_coherence: bool = True) -> Dict[str, Any]:
    """Run comparison on all samples and return aggregated results."""
    all_results = []
    
    print(f"Processing {len(samples)} samples...")
    for i, sample in enumerate(samples, 1):
        if i % 10 == 0:
            print(f"  Processed {i}/{len(samples)} samples...")
        result = compute_single_sample_metrics(sample, enable_coherence=enable_coherence)
        all_results.append(result)
    
    print("Computing aggregate statistics...")
    aggregated = aggregate_metrics(all_results)
    
    # Include individual results for reference
    aggregated["individual_results"] = all_results
    
    return aggregated


# --------- CLI ---------

def main():
    parser = argparse.ArgumentParser(
        description="Batch compare multiple text samples from AGENT, GPT, and GEMINI models"
    )
    
    # Input options (mutually exclusive)
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--json-file", type=str, help="Path to JSON file with samples")
    input_group.add_argument("--jsonl-file", type=str, help="Path to JSONL file (one JSON object per line, best for multi-line text)")
    input_group.add_argument("--csv-file", type=str, help="Path to CSV file with samples")
    input_group.add_argument("--text-dir", type=str, help="Path to directory with text files")
    
    parser.add_argument("--out", type=str, help="Path to save JSON output")
    parser.add_argument("--no-coherence", action="store_true", help="Disable coherence scoring")
    
    args = parser.parse_args()
    
    # Load samples
    if args.json_file:
        samples = load_from_json(args.json_file)
    elif args.jsonl_file:
        samples = load_from_jsonl(args.jsonl_file)
    elif args.csv_file:
        samples = load_from_csv(args.csv_file)
    elif args.text_dir:
        samples = load_from_text_dir(args.text_dir)
    else:
        print("Error: No input source specified")
        return
    
    if not samples:
        print("No samples found!")
        return
    
    print(f"Loaded {len(samples)} samples")
    
    # Run batch comparison
    results = batch_compare(samples, enable_coherence=not args.no_coherence)
    
    # Output results
    print("\n" + "="*60)
    print("AGGREGATED RESULTS")
    print("="*60)
    print(json.dumps(results, indent=2, ensure_ascii=False))
    
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to: {args.out}")


if __name__ == "__main__":
    main()
