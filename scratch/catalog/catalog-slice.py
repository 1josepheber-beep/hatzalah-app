"""Split tall desktop captures into page-sized pieces, cutting on quiet rows so no text is sliced."""
import json, os, sys
from PIL import Image

SHOTS = "/home/claude/scratch/catalog/shots"
OUT = "/home/claude/scratch/catalog/pieces"
os.makedirs(OUT, exist_ok=True)
MAX_H = 2500          # px of a 2049-wide capture that fit on one Letter page (7.0in wide image)
SEARCH = 420          # how far to look for a quiet row around the ideal cut

def quiet_rows(im):
    """Score each row: 0 = a real gap between cards (page background across the whole pane,
    card borders included), 1 = uniform inside a card (blank area of a box), 2+ = has content."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    BG = (238, 241, 245)   # --bg
    def is_bg(v): return all(abs(v[i] - BG[i]) <= 6 for i in range(3))
    scores = []
    for y in range(h):
        full = [px[x, y] for x in range(580, 1830, 4)]     # the pane incl. where card edges sit
        if all(is_bg(v) for v in full):
            scores.append(0); continue
        inner = [px[x, y] for x in range(640, 1760, 4)]    # inside the card, borders excluded
        spread = max(max(v) for v in inner) - min(min(v) for v in inner)
        scores.append(1 if spread <= 6 else 2 + spread)
    return scores

def split(name):
    im = Image.open(f"{SHOTS}/{name}.png")
    w, h = im.size
    if h <= MAX_H:
        return [f"{name}.png"]
    n = -(-h // 2250)
    target = h / n
    scores = quiet_rows(im)
    cuts = [0]
    for k in range(1, n):
        ideal = int(k * target)
        lo, hi = max(cuts[-1] + 600, ideal - SEARCH), min(h - 600, ideal + SEARCH, cuts[-1] + MAX_H)
        best = min(range(lo, hi), key=lambda y: (scores[y], abs(y - ideal)))
        cuts.append(best)
    cuts.append(h)
    pieces = []
    # the sidebar from the top of the screen, repeated on every continuation piece
    HDR = 0
    col = im.crop((0, 0, 560, 1))
    # find the header bar height: first row where x=20 is not the dark header
    px = im.convert("RGB").load()
    for y in range(0, 300):
        r, g, b = px[20, y]
        if r > 200 and g > 200 and b > 200: HDR = y; break
    sidebar = im.crop((0, HDR, 560, min(h, HDR + 1250)))
    for i in range(len(cuts) - 1):
        piece = im.crop((0, cuts[i], w, cuts[i + 1]))
        if i > 0:
            sb = sidebar.crop((0, 0, 560, min(sidebar.height, piece.height)))
            piece.paste(sb, (0, 0))
        fn = f"{name}.{i + 1}.png"
        piece.save(f"{OUT}/{fn}")
        pieces.append(fn)
    return pieces

result = {}
for f in sorted(os.listdir(SHOTS)):
    if not f.endswith(".png"):
        continue
    name = f[:-4]
    im = Image.open(f"{SHOTS}/{f}")
    if name.startswith("d-") and im.height > MAX_H:
        result[name] = split(name)
        print(name, im.size, "->", len(result[name]), "pieces")
json.dump(result, open(f"{OUT}/pieces.json", "w"), indent=1)
