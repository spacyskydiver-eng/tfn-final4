from PIL import Image, ImageDraw, ImageFont
import os, subprocess

ICONS_DIR = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(ICONS_DIR, exist_ok=True)

def make_icon(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = size // 10
    draw.ellipse([margin, margin, size - margin, size - margin], fill=(15, 23, 42, 255))
    font_size = int(size * 0.55)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        font = ImageFont.load_default()
    text = "R"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1]
    draw.text((tx, ty), text, fill=(212, 175, 55, 255), font=font)
    img.save(path, "PNG")
    print(f"  wrote {os.path.basename(path)} ({size}x{size})")

# Required by tauri.conf.json
make_icon(32,  os.path.join(ICONS_DIR, "32x32.png"))
make_icon(128, os.path.join(ICONS_DIR, "128x128.png"))
make_icon(256, os.path.join(ICONS_DIR, "128x128@2x.png"))
make_icon(512, os.path.join(ICONS_DIR, "icon.png"))

# .icns
iconset = os.path.join(ICONS_DIR, "icon.iconset")
os.makedirs(iconset, exist_ok=True)
for sz in [16, 32, 64, 128, 256, 512]:
    make_icon(sz,     os.path.join(iconset, f"icon_{sz}x{sz}.png"))
    make_icon(sz * 2, os.path.join(iconset, f"icon_{sz}x{sz}@2x.png"))
subprocess.run(["iconutil", "-c", "icns", iconset, "-o", os.path.join(ICONS_DIR, "icon.icns")], check=True)
print("  wrote icon.icns")

# .ico
sizes = [(16,16),(32,32),(48,48),(256,256)]
images = []
for s in sizes:
    i = Image.new("RGBA", s, (0, 0, 0, 0))
    d = ImageDraw.Draw(i)
    m = s[0] // 10
    d.ellipse([m, m, s[0]-m, s[1]-m], fill=(15, 23, 42, 255))
    fsize = int(s[0] * 0.55)
    try:
        f = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", fsize)
    except Exception:
        f = ImageFont.load_default()
    bb = d.textbbox((0, 0), "R", font=f)
    tx = (s[0] - (bb[2]-bb[0])) // 2 - bb[0]
    ty = (s[1] - (bb[3]-bb[1])) // 2 - bb[1]
    d.text((tx, ty), "R", fill=(212, 175, 55, 255), font=f)
    images.append(i)
images[0].save(os.path.join(ICONS_DIR, "icon.ico"), format="ICO",
               sizes=sizes, append_images=images[1:])
print("  wrote icon.ico")
print("Done!")
