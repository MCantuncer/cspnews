"""Builds CSP Display: Funnel Display with the small square feet on a, b, d and u removed.

Accented letters reuse these outlines, so they change too. Run once per file:
  python3 scripts/fix-display-feet.py <funnel-display-*.woff2> src/fonts/csp-display-<subset>-<weight>.woff2
Needs fonttools and brotli (pip install fonttools brotli).
"""
import sys
from fontTools.ttLib import TTFont

def fix(src, dst):
    f = TTFont(src)
    glyf = f['glyf']
    changed = []
    for name in f.getGlyphOrder():
        g = glyf[name]
        if g.isComposite() or g.numberOfContours <= 0:
            continue
        coords = g.coordinates
        flags = g.flags
        on = [i for i in range(len(coords)) if flags[i] & 1]
        heights = sorted({coords[i][1] for i in on if 140 <= coords[i][1] <= 200})
        pairs = [[i for i in on if coords[i][1] == h] for h in heights]
        pairs = [p for p in pairs if len(p) == 2]
        if len(pairs) != 1:
            continue
        a, b = pairs[0]
        foot = coords[a][1]
        xa, xb = coords[a][0], coords[b][0]
        # The outer corner of the foot is the 180-point whose x also appears at y=0.
        zeros = {coords[i][0]: i for i in on if coords[i][1] == 0}
        if xa in zeros and xb not in zeros:
            outer, inner = a, xb
        elif xb in zeros and xa not in zeros:
            outer, inner = b, xa
        else:
            continue
        xo = coords[outer][0]
        if abs(xo - inner) > 120:
            continue
        coords[outer] = (inner, foot)
        coords[zeros[xo]] = (inner, 0)
        # Take the foot's width back out of the spacing, so the letter keeps its usual gaps.
        width, lsb = f['hmtx'][name]
        cut = abs(xo - inner)
        if xo < inner:
            coords.translate((-cut, 0))
        g.recalcBounds(glyf)
        f['hmtx'][name] = (width - cut, g.xMin)
        changed.append(name)
    f.flavor = 'woff2'
    f.save(dst)
    print(dst, changed)

fix(sys.argv[1], sys.argv[2])
