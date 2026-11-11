"""
Builds candidate word lists for the daily word game. Run it when adding a new batch of words.

It only proposes words: every answer is then checked by hand, and rejected ones go into
data/<language>/blocked.txt with a reason. New answers are shuffled with `seededShuffle` and
appended to answers.txt, never inserted, so played days keep their words.

Inputs, downloaded into one folder (see ../data/SOURCES.md for licences):
  wle/package/*.json       npm package wordlist-english (SCOWL)
  master-dictionary.dict   Zemberek, morphology/src/main/resources/tr/
  non-tdk.dict             Zemberek, same folder
  bad-en.txt, bad-tr.txt   LDNOOBW, files `en` and `tr`

Usage: python -I candidates.py <folder>   (needs `pip install wordfreq==3.1.1`)
Writes <folder>/{en,tr}-answers.txt (by frequency) and <folder>/{en,tr}-guesses.txt.
"""
import json, re, sys, unicodedata
from wordfreq import zipf_frequency, iter_wordlist
D = sys.argv[1]
TR_ALPHA = set('abcçdefgğhıijklmnoöprsştuüvyz')
EN_ALPHA = set('abcdefghijklmnopqrstuvwxyz')
FOLD = {'â': 'a', 'î': 'i', 'û': 'u'}
def tr_norm(w):
    w = unicodedata.normalize('NFC', w.strip())
    w = w.replace('I', 'ı').replace('İ', 'i').lower()
    return ''.join(FOLD.get(c, c) for c in w)
bad_en = {l.strip().lower() for l in open(f'{D}/bad-en.txt') if l.strip()}
bad_tr = {tr_norm(l) for l in open(f'{D}/bad-tr.txt', encoding='utf-8') if l.strip()}

# English
def load(name):
    try: return json.load(open(f'{D}/wle/package/{name}.json'))
    except FileNotFoundError: return []
common = set()
for n in (10, 20, 35, 40): common |= set(load(f'english-words-{n}'))
allw = set()
for v in ('english', 'american', 'british'):
    for n in (10, 20, 35, 40, 50, 55, 60, 70): allw |= set(load(f'{v}-words-{n}'))
five = lambda s: {w for w in s if len(w) == 5 and set(w) <= EN_ALPHA}
en_all, en_common = five(allw), five(common)
def inflected(w, dic):
    if w.endswith('s') and not w.endswith('ss') and (w[:-1] in dic or (w.endswith('es') and w[:-2] in dic)): return True
    if w.endswith('ed') and (w[:-1] in dic or w[:-2] in dic or w[:-3] in dic): return True
    if w.endswith('ing') and (w[:-3] in dic or w[:-3] + 'e' in dic): return True
    return False
dic_en = allw
en_ans = sorted((w for w in en_common if not inflected(w, dic_en) and w not in bad_en and zipf_frequency(w, 'en') >= 2.7),
                key=lambda w: -zipf_frequency(w, 'en'))
en_guess = en_all | {w for w in iter_wordlist('en') if len(w) == 5 and set(w) <= EN_ALPHA and zipf_frequency(w, 'en') >= 2.5}

# Turkish
roots = {}
for f in ('master-dictionary.dict', 'non-tdk.dict'):
    for line in open(f'{D}/{f}', encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('##'): continue
        m = re.match(r'^(\S+)(?:\s+\[(.*)\])?', line)
        w, attrs = tr_norm(m.group(1)), m.group(2) or ''
        p = re.search(r'P:(\w+)', attrs)
        roots.setdefault(w, set()).add((p.group(1) if p else 'Noun', f))
tr_five = {w for w in roots if len(w) == 5 and set(w) <= TR_ALPHA}
KEEP = {'Noun', 'Adj', 'Adv'}
def tr_ok(w):
    kinds = roots[w]
    if not any(k in KEEP and f == 'master-dictionary.dict' for k, f in kinds): return False
    if w.endswith(('mek', 'mak')) and w not in ('yemek', 'kaymak', 'ekmek', 'çakmak', 'kıymak'): return False
    return w not in bad_tr and zipf_frequency(w, 'tr') >= 3.0
tr_ans = sorted((w for w in tr_five if tr_ok(w)), key=lambda w: -zipf_frequency(w, 'tr'))
tr_guess = tr_five | {tr_norm(w) for w in iter_wordlist('tr') if len(tr_norm(w)) == 5 and set(tr_norm(w)) <= TR_ALPHA and zipf_frequency(w, 'tr') >= 2.5}
for name, data in (('en-answers', en_ans), ('tr-answers', tr_ans), ('en-guesses', sorted(en_guess | set(en_ans))), ('tr-guesses', sorted(tr_guess | set(tr_ans)))):
    open(f'{D}/{name}.txt', 'w', encoding='utf-8').write('\n'.join(data) + '\n')
    print(name, len(data))
