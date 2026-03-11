#!/usr/bin/env python3
"""
Simple script to compare readability, lexical diversity, and coherence
between texts (e.g., an agent output, a GPT baseline, and Gemini).

Usage:
    python compare_texts.py --agent-file agent.txt --gpt-file gpt.txt --gemini-file gemini.txt
or
    python compare_texts.py --agent-text "..." --gpt-text "..." --gemini-text "..."

Outputs JSON summary to stdout (and optionally to a file with --out).

Dependencies:
    textstat, lexicalrichness, numpy, scipy, sentence-transformers
    (sentence-transformers is optional; script will skip coherence if not installed)
"""

import argparse
import json
import re
import math
from typing import Dict, Any

try:
    import textstat
except Exception:
    textstat = None

try:
    from lexicalrichness import LexicalRichness
except Exception:
    LexicalRichness = None

try:
    import numpy as np
    from scipy.spatial.distance import cosine
except Exception:
    np = None
    cosine = None

# Try to import SentenceTransformer for coherence metrics; optional
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None


# --------- helpers ---------

def split_sentences(text: str):
    text = re.sub(r"\s+", " ", text.strip())
    # naive sentence splitter; acceptable for quick experiments
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def pairwise_adjacent_cosine_sims(embs):
    if embs is None or len(embs) < 2:
        return np.array([])
    sims = []
    for i in range(len(embs) - 1):
        sims.append(1 - cosine(embs[i], embs[i + 1]))
    return np.array(sims)


def coherence_metrics(text: str, model=None) -> Dict[str, Any]:
    if model is None:
        if SentenceTransformer is None:
            return {"error": "sentence-transformers not installed; coherence not available"}
        model = SentenceTransformer("all-MiniLM-L6-v2")

    sents = split_sentences(text)
    if len(sents) < 2:
        return {"mean": 0.0, "median": 0.0, "std": 0.0, "min": 0.0, "max": 0.0, "n_pairs": 0}

    embs = model.encode(sents, normalize_embeddings=True)
    sims = pairwise_adjacent_cosine_sims(np.array(embs))

    return {
        "mean": float(np.mean(sims)),
        "median": float(np.median(sims)),
        "std": float(np.std(sims)),
        "min": float(np.min(sims)),
        "max": float(np.max(sims)),
        "n_pairs": int(len(sims)),
    }


def coherence_score_from_stats(mean_sim: float, std_sim: float) -> float:
    # peak at mean=0.70 with sigma=0.12 (Gaussian), 0..1
    mean_quality = math.exp(-((mean_sim - 0.70) ** 2) / (2 * (0.12 ** 2)))
    # modest variation is healthy; penalize extremes
    std_quality = math.exp(-((std_sim - 0.10) ** 2) / (2 * (0.08 ** 2)))
    return float(100 * (0.75 * mean_quality + 0.25 * std_quality))


# --------- readability & lexical metrics ---------

def compute_readability(text: str) -> Dict[str, Any]:
    out = {}
    if textstat is None:
        out["error"] = "textstat not installed"
        return out

    out["flesch_reading_ease"] = textstat.flesch_reading_ease(text)
    out["smog_index"] = textstat.smog_index(text)
    out["flesch_kincaid_grade"] = textstat.flesch_kincaid_grade(text)
    out["automated_readability_index"] = textstat.automated_readability_index(text)
    out["dale_chall_readability_score"] = textstat.dale_chall_readability_score(text)
    out["difficult_words"] = int(textstat.difficult_words(text))
    return out


def compute_lexical(text: str) -> Dict[str, Any]:
    out = {}
    if LexicalRichness is None:
        out["error"] = "lexicalrichness not installed"
        return out

    lex = LexicalRichness(text)
    try:
        out["mtld"] = lex.mtld()
    except Exception:
        out["mtld"] = None
    try:
        out["hdd"] = lex.hdd()
    except Exception:
        out["hdd"] = None
    return out


# --------- orchestrator ---------

def compare_texts(agent_text: str, gpt_text: str, gemini_text: str = None, enable_coherence: bool = True) -> Dict[str, Any]:
    """Compare agent, gpt, and optional gemini texts.

    Returns a dict with keys 'agent', 'gpt', optional 'gemini', and 'meta'.
    """
    result = {"agent": {}, "gpt": {}, "meta": {}}

    # Base metrics
    result["agent"]["readability"] = compute_readability(agent_text)
    result["agent"]["lexical"] = compute_lexical(agent_text)

    result["gpt"]["readability"] = compute_readability(gpt_text)
    result["gpt"]["lexical"] = compute_lexical(gpt_text)

    if gemini_text is not None:
        result["gemini"] = {}
        result["gemini"]["readability"] = compute_readability(gemini_text)
        result["gemini"]["lexical"] = compute_lexical(gemini_text)

    # coherence
    if enable_coherence:
        if SentenceTransformer is None or np is None or cosine is None:
            result["meta"]["coherence_available"] = False
            result["meta"]["coherence_note"] = "sentence-transformers or numpy/scipy not installed"
        else:
            model = SentenceTransformer("all-MiniLM-L6-v2")
            a_stats = coherence_metrics(agent_text, model=model)
            g_stats = coherence_metrics(gpt_text, model=model)
            result["agent"]["coherence"] = a_stats
            result["gpt"]["coherence"] = g_stats

            scores = {}
            if isinstance(a_stats, dict) and "mean" in a_stats:
                scores["agent"] = coherence_score_from_stats(a_stats.get("mean", 0.0), a_stats.get("std", 0.0))
                result["agent"]["coherence_score_0_100"] = scores["agent"]
            if isinstance(g_stats, dict) and "mean" in g_stats:
                scores["gpt"] = coherence_score_from_stats(g_stats.get("mean", 0.0), g_stats.get("std", 0.0))
                result["gpt"]["coherence_score_0_100"] = scores["gpt"]

            if gemini_text is not None:
                gem_stats = coherence_metrics(gemini_text, model=model)
                result["gemini"]["coherence"] = gem_stats
                if isinstance(gem_stats, dict) and "mean" in gem_stats:
                    scores["gemini"] = coherence_score_from_stats(gem_stats.get("mean", 0.0), gem_stats.get("std", 0.0))
                    result["gemini"]["coherence_score_0_100"] = scores["gemini"]

            if scores:
                # winner is the key with the highest score
                winner = max(scores.items(), key=lambda kv: kv[1])[0]
                result["meta"]["coherence_winner"] = winner
                result["meta"]["coherence_scores"] = scores
            else:
                result["meta"]["coherence_note"] = "coherence stats not available"

    return result


# --------- CLI ---------

def load_text_from_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def main():
    parser = argparse.ArgumentParser(description="Compare two texts (agent vs GPT) on readability, lexical diversity, and coherence")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--agent-file", type=str, help="path to agent text file")
    group.add_argument("--agent-text", type=str, help="agent text string")

    group2 = parser.add_mutually_exclusive_group(required=True)
    group2.add_argument("--gpt-file", type=str, help="path to GPT baseline text file")
    group2.add_argument("--gpt-text", type=str, help="gpt text string")

    # Optional third model (Gemini)
    group3 = parser.add_mutually_exclusive_group(required=False)
    group3.add_argument("--gemini-file", type=str, help="path to Gemini baseline text file")
    group3.add_argument("--gemini-text", type=str, help="gemini text string")

    parser.add_argument("--out", type=str, help="path to save JSON output")
    parser.add_argument("--no-coherence", action="store_true", help="disable coherence scoring (skip heavy model)")

    args = parser.parse_args()

    if args.agent_file:
        agent_text = load_text_from_file(args.agent_file)
    else:
        agent_text = args.agent_text or ""

    if args.gpt_file:
        gpt_text = load_text_from_file(args.gpt_file)
    else:
        gpt_text = args.gpt_text or ""

    gemini_text = None
    if args.gemini_file:
        gemini_text = load_text_from_file(args.gemini_file)
    else:
        gemini_text = args.gemini_text or None

    res = compare_texts(agent_text, gpt_text, gemini_text=gemini_text, enable_coherence=not args.no_coherence)

    print(json.dumps(res, indent=2, ensure_ascii=False))

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
