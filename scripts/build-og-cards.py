#!/usr/bin/env python3
"""사이트맵의 모프·형질 상세 페이지마다 공유 미리보기 카드 PNG를 만든다.

- 입력: https://donawa-gecko-price.vercel.app/sitemap.xml (slug 목록)
- 각 페이지 <title>에서 한글 이름을 뽑아 카드로 그린다. 가격은 넣지 않는다(매일 바뀜).
- 출력: projects/donawa-gecko-price/public/og/{morph|trait}/{slug}.png + lib/og-cards.ts
"""
import re
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BASE = "https://donawa-gecko-price.vercel.app"
ROOT = Path("/workspace/projects/donawa-gecko-price")
FONT_DIR = Path("/workspace/scratch/fonts")

CREAM = "#FFFCF8"
INK = "#181916"
INK_SOFT = "#63635d"
ORANGE = "#F26B24"
HAIR = (24, 25, 22, 31)

W, H = 1200, 630


def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"Pretendard-{weight}.otf"), size)


def fit_font(draw, text, weight, max_size, max_width):
    size = max_size
    while size > 40:
        f = font(weight, size)
        if draw.textlength(text, font=f) <= max_width:
            return f
        size -= 4
    return font(weight, 40)


def fetch_slugs():
    with urllib.request.urlopen(f"{BASE}/sitemap.xml", timeout=30) as res:
        xml = res.read().decode("utf-8")
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    out = []
    for loc in locs:
        path = loc.replace(BASE, "")
        m = re.match(r"^/(morph|trait)/([a-z0-9-]+)$", path)
        if m:
            out.append((m.group(1), m.group(2)))
    return out


def fetch_title(kind, slug):
    url = f"{BASE}/{kind}/{slug}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; donawa-og)"})
    with urllib.request.urlopen(req, timeout=30) as res:
        html = res.read().decode("utf-8", "ignore")
    title = re.search(r"<title>([^<]*)</title>", html)
    name = title.group(1) if title else slug
    name = name.split("|")[0].strip()
    name = re.sub(r"\s*현재 최저 호가$", "", name)
    name = re.sub(r"\s*최저 호가$", "", name)
    return name.strip() or slug


def render(name, out_path):
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img, "RGBA")

    f_word = font("Bold", 40)
    d.text((72, 92), "도나와", font=f_word, fill=INK, anchor="ls")
    d.text((72 + d.textlength("도나와", font=f_word) + 14, 90), "DONAWA", font=font("SemiBold", 17), fill=INK_SOFT, anchor="ls")
    d.line([(72, 124), (W - 72, 124)], fill=HAIR, width=1)

    f_name = fit_font(d, name, "SemiBold", 96, W - 144)
    d.text((72, 330), name, font=f_name, fill=INK, anchor="ls")

    d.rectangle([(72, 380), (136, 383)], fill=ORANGE)
    d.text((72, 452), "모프별 최저 호가를 한 표에. 판매처가 공개한 값 그대로.", font=font("Regular", 30), fill=INK_SOFT, anchor="ls")

    d.text((W - 72, 452), "donawa-gecko-price.vercel.app", font=font("Regular", 24), fill=INK_SOFT, anchor="rs")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG", optimize=True)


def build_one(item):
    kind, slug = item
    out_path = ROOT / "public" / "og" / kind / f"{slug}.png"
    if out_path.exists():
        return kind, slug
    try:
        name = fetch_title(kind, slug)
    except Exception as exc:  # noqa: BLE001
        print("skip", kind, slug, exc, flush=True)
        return None
    render(name, out_path)
    print(kind, slug, "->", name, flush=True)
    return kind, slug


def main():
    from concurrent.futures import ThreadPoolExecutor

    slugs = fetch_slugs()
    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(build_one, slugs))
    entries = [r for r in results if r]

    morphs = sorted(s for k, s in entries if k == "morph")
    traits = sorted(s for k, s in entries if k == "trait")
    ts = [
        "/**",
        " * 공유 미리보기 카드가 준비된 상세 페이지 슬러그.",
        " *",
        " * `scripts/build-og-cards.py`가 sitemap의 모프·키워드 페이지마다",
        " * `public/og/{kind}/{slug}.png`를 만들고 이 목록을 갱신한다.",
        " * 목록에 없는 슬러그는 사이트 기본 카드(`/og/donawa-og.png`)를 쓴다.",
        " */",
        "export const MORPH_OG_SLUGS: readonly string[] = [",
        *[f'  "{s}",' for s in morphs],
        "];",
        "",
        "export const TRAIT_OG_SLUGS: readonly string[] = [",
        *[f'  "{s}",' for s in traits],
        "];",
        "",
        "export function hasMorphOgCard(slug: string): boolean {",
        "  return MORPH_OG_SLUGS.includes(slug);",
        "}",
        "",
        "export function hasTraitOgCard(slug: string): boolean {",
        "  return TRAIT_OG_SLUGS.includes(slug);",
        "}",
        "",
    ]
    (ROOT / "lib" / "og-cards.ts").write_text("\n".join(ts), encoding="utf-8")
    print(f"done: {len(morphs)} morphs, {len(traits)} traits")


if __name__ == "__main__":
    main()
