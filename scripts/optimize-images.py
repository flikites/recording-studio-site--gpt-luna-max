from PIL import Image
import os

RAW = 'src/assets/raw'
OUT = 'public/img'
os.makedirs(OUT, exist_ok=True)

jobs = [
    # (src, out_widths, avif_quality, name)
    ('hero.jpg',        [640, 1024, 1672], 42, 'hero'),
    ('room-booth.jpg',  [640, 1280],       48, 'room-booth'),
    ('room-console.jpg',[640, 1280],       48, 'room-console'),
    ('room-hands.jpg',  [640, 1280],       48, 'room-hands'),
    ('room-lounge.jpg', [640, 1280],       48, 'room-lounge'),
    ('engineer-marcus.jpg', [480, 900],    50, 'engineer-marcus'),
    ('engineer-deja.jpg',   [480, 900],    50, 'engineer-deja'),
    ('engineer-trey.jpg',   [480, 900],    50, 'engineer-trey'),
]

for src, widths, q, name in jobs:
    im = Image.open(f'{RAW}/{src}').convert('RGB')
    for w in widths:
        if w > im.width: continue
        h = round(im.height * w / im.width)
        r = im.resize((w, h), Image.LANCZOS)
        r.save(f'{OUT}/{name}-{w}.avif', 'AVIF', quality=q)
        r.save(f'{OUT}/{name}-{w}.webp', 'WEBP', quality=q+8, method=6)
        r.save(f'{OUT}/{name}-{w}.jpg', 'JPEG', quality=q+18, optimize=True, progressive=True)

# OG image 1200x630
im = Image.open(f'{RAW}/og.jpg').convert('RGB')
target_ratio = 1200/630
r = im.width / im.height
if r > target_ratio:
    nw = int(im.height * target_ratio); x = (im.width - nw)//2; im2 = im.crop((x,0,x+nw,im.height))
else:
    nh = int(im.width / target_ratio); y = (im.height - nh)//2; im2 = im.crop((0,y,im.width,y+nh))
im2 = im2.resize((1200,630), Image.LANCZOS)
im2.save(f'{OUT}/og.jpg', 'JPEG', quality=82, optimize=True, progressive=True)

total = 0
for f in sorted(os.listdir(OUT)):
    s = os.path.getsize(f'{OUT}/{f}'); total += s
    print(f'{f:28s} {s/1024:8.1f} KB')
print(f'\nTOTAL {total/1024/1024:.2f} MB')
