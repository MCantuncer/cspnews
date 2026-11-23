"""Translates Hot News text between Turkish and English with open Opus-MT models, offline.

Reads a JSON list of {"text", "from", "to"} on stdin and writes the translations, in the same
order, as a JSON list of strings on stdout. Runs on the Hot News workflow's runner, so Hot News
is translated without any paid API. The models are Helsinki-NLP's Opus-MT (CC BY 4.0), loaded
once per direction; the workflow caches them between runs.

    pip install -r requirements.txt
    echo '[{"text": "Hello", "from": "en", "to": "tr"}]' | python translate.py
"""

import json
import sys

from transformers import MarianMTModel, MarianTokenizer

MODELS = {
    ("en", "tr"): "Helsinki-NLP/opus-mt-tc-big-en-tr",
    ("tr", "en"): "Helsinki-NLP/opus-mt-tc-big-tr-en",
}
BATCH = 8


def translate(texts, model_name):
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    model.eval()
    out = []
    for start in range(0, len(texts), BATCH):
        batch = texts[start : start + BATCH]
        tokens = tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=256)
        generated = model.generate(**tokens, num_beams=4, max_new_tokens=256)
        out.extend(tokenizer.batch_decode(generated, skip_special_tokens=True))
    return out


def main():
    requests = json.load(sys.stdin)
    results = [""] * len(requests)
    by_direction = {}
    for index, request in enumerate(requests):
        direction = (request["from"], request["to"])
        if direction not in MODELS:
            raise SystemExit(f"No model for {direction[0]} to {direction[1]}")
        by_direction.setdefault(direction, []).append(index)
    for direction, indexes in by_direction.items():
        texts = [requests[index]["text"] for index in indexes]
        for index, text in zip(indexes, translate(texts, MODELS[direction])):
            results[index] = text.strip()
    json.dump(results, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
