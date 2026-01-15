from PIL import Image
from pathlib import Path

src = Path("dist/images/favicon.png")
dst_dir = Path("public/images")
dst_dir.mkdir(parents=True, exist_ok=True)

if not src.exists():
    print(f"Source image not found: {src}")
    raise SystemExit(1)

# Replace main favicon.png
main_dst = dst_dir / "favicon.png"
with Image.open(src) as im:
    im = im.convert('RGBA')
    im.save(main_dst)
    print(f"Saved main favicon: {main_dst}")

# Generate resized variants
for size in (32, 16):
    out = dst_dir / f"favicon-{size}x{size}.png"
    with Image.open(src) as im:
        im = im.convert('RGBA')
        im = im.resize((size, size), Image.LANCZOS)
        im.save(out)
        print(f"Saved {out}")

print("Done.")
