import json, sys
sys.path.insert(0, 'packages/hotnews/translate')
from transformers import MarianMTModel, MarianTokenizer
M = {("en","tr"):"Helsinki-NLP/opus-mt-tc-big-en-tr",("tr","en"):"Helsinki-NLP/opus-mt-tc-big-tr-en"}
reqs = json.load(open('probe/probe.json'))
cache = {}
def run(texts, d, **kw):
    if d not in cache:
        cache[d] = (MarianTokenizer.from_pretrained(M[d]), MarianMTModel.from_pretrained(M[d]))
    tok, model = cache[d]
    t = tok(texts, return_tensors="pt", padding=True)
    return tok.batch_decode(model.generate(**t, max_new_tokens=256, **kw), skip_special_tokens=True)
for r in reqs:
    d = (r["from"], r["to"]); x = r["text"]
    a = run([x], d, num_beams=4)[0]
    b = run([x.rstrip('.!?') + '.'], d, num_beams=4)[0]
    c = run([x], d, num_beams=6, length_penalty=1.2)[0]
    print(f"\n# {x}\n  b4: {a}\n  dot: {b}\n  b6: {c}")
