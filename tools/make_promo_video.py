from __future__ import annotations

import math
from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "outputs" / "promo"
OUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 720, 1280
FPS = 30
DURATION = 15

FONT_REGULAR = "C:/Windows/Fonts/tahoma.ttf"
FONT_BOLD = "C:/Windows/Fonts/tahomabd.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def lerp(a: float, b: float, x: float) -> float:
    return a + (b - a) * x


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def ease(x: float) -> float:
    x = clamp01(x)
    return 4 * x * x * x if x < 0.5 else 1 - ((-2 * x + 2) ** 3) / 2


def scene_progress(t: float, start: float, end: float) -> float:
    return clamp01((t - start) / (end - start))


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def rounded(draw: ImageDraw.ImageDraw, box, radius: int, fill, outline=None, width=1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_lines(draw: ImageDraw.ImageDraw, text: str, fnt, max_width: int) -> list[str]:
    words = str(text).split(" ")
    lines: list[str] = []
    line = ""
    for word in words:
        test = f"{line} {word}".strip()
        if draw.textbbox((0, 0), test, font=fnt)[2] > max_width and line:
            lines.append(line)
            line = word
        else:
            line = test
    if line:
        lines.append(line)
    return lines


def draw_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    size: int,
    fill="#ffffff",
    bold=True,
    max_width=620,
    line_height=1.25,
    align="left",
) -> int:
    fnt = font(size, bold)
    lines = text_lines(draw, text, fnt, max_width)
    x, y = xy
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=fnt)
        line_w = bbox[2] - bbox[0]
        tx = x
        if align == "center":
            tx = x - line_w // 2
        elif align == "right":
            tx = x - line_w
        draw.text((tx, int(y + i * size * line_height)), line, font=fnt, fill=fill)
    return int(len(lines) * size * line_height)


def gradient_bg(t: float) -> Image.Image:
    top = np.array(hex_to_rgb("#241a2f"), dtype=np.float32)
    mid = np.array(hex_to_rgb("#36253f"), dtype=np.float32)
    bottom = np.array(hex_to_rgb("#f3dfd4"), dtype=np.float32)
    arr = np.zeros((H, W, 3), dtype=np.float32)
    for y in range(H):
        p = y / (H - 1)
        if p < 0.48:
            c = top * (1 - p / 0.48) + mid * (p / 0.48)
        else:
            q = (p - 0.48) / 0.52
            c = mid * (1 - q) + bottom * q
        arr[y, :, :] = c
    img = Image.fromarray(np.uint8(np.clip(arr, 0, 255)), "RGB").convert("RGBA")

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(7):
        x = int((math.sin(t * 0.55 + i * 1.7) * 0.5 + 0.5) * W)
        y = int((i * 220 + t * 18) % (H + 260) - 130)
        size = 420
        color = (216 - i * 8, 183 + i * 4, 160 + i * 7, 34)
        gd.ellipse((x - size // 2, y - size // 2, x + size // 2, y + size // 2), fill=color)
    glow = glow.filter(ImageFilter.GaussianBlur(55))
    img.alpha_composite(glow)
    return img


def draw_pill(draw, label: str, x: int, y: int, w: int) -> None:
    rounded(draw, (x, y, x + w, y + 48), 24, "#fffaf7")
    draw_text(draw, label, (x + w // 2, y + 10), 18, "#382b42", True, w - 24, align="center")


def card_layer(x: int, y: int, w: int, h: int, radius: int, fill) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=(0, 0, 0, 45))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    layer.alpha_composite(shadow)
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=fill, outline=(255, 255, 255, 90), width=2)
    return layer


def draw_phone(img: Image.Image, x: int, y: int, scale: float, t: float) -> None:
    phone = Image.new("RGBA", (360, 690), (0, 0, 0, 0))
    d = ImageDraw.Draw(phone)
    rounded(d, (12, 12, 342, 652), 42, (255, 255, 255, 238), (255, 255, 255, 130), 3)
    rounded(d, (40, 74, 314, 200), 24, "#9b7897")
    draw_text(d, "Game Services", (60, 98), 25, "#ffffff", True, 230)
    draw_text(d, "เลือกเกม • ดูแพ็ก", (60, 136), 18, "#fff4ed", False, 230)

    cards = [
        ("TD", "Samkok Heroes", "AMH008"),
        ("RPG", "Heavenfall Arena", "AMH007"),
        ("IDLE", "Idle RPG Pack", "พร้อมดูแล"),
    ]
    for index, (tag, name, code) in enumerate(cards):
        cy = 234 + index * 118 + int(math.sin(t * 2 + index) * 3)
        rounded(d, (40, cy, 314, cy + 92), 20, "#fffaf7")
        rounded(d, (58, cy + 19, 112, cy + 73), 14, "#f1dfd5")
        draw_text(d, tag, (85, cy + 34), 15, "#5a4c62", True, 48, align="center")
        draw_text(d, name, (128, cy + 18), 18, "#342d3b", True, 170)
        draw_text(d, code, (128, cy + 50), 16, "#8d6e63", True, 170)

    phone = phone.resize((int(phone.width * scale), int(phone.height * scale)), Image.Resampling.LANCZOS)
    img.alpha_composite(phone, (x, y))


def draw_frame(t: float) -> Image.Image:
    img = gradient_bg(t)
    d = ImageDraw.Draw(img)

    rounded(d, (54, 52, 108, 106), 14, "#d8b7a0")
    draw_text(d, "GS", (81, 66), 18, "#241d29", True, 42, align="center")
    draw_text(d, "Game Services", (122, 65), 23, "#ffffff", True, 420)

    phone_x = 438 + int(math.sin(t * 0.8) * 6)
    draw_phone(img, phone_x, 270, 0.68, t)

    p1 = scene_progress(t, 0, 3.5)
    p2 = scene_progress(t, 3, 7.5)
    p3 = scene_progress(t, 7, 11.5)
    p4 = scene_progress(t, 11, 15)

    if p1 < 1:
        yy = int(210 + (1 - ease(p1)) * 36)
        draw_text(d, "บริการเกมมือถือ", (54, yy), 54, "#ffffff", True, 360, 1.18)
        draw_text(d, "ครบ จบ ดูแลง่าย", (54, yy + 190), 52, "#f1cdbb", True, 350, 1.18)
        draw_text(d, "เลือกเกมที่ต้องการ", (58, yy + 390), 28, "#f8ece6", False, 320, 1.35)
        draw_text(d, "ให้แอดมินเช็กรายละเอียด", (58, yy + 430), 28, "#f8ece6", False, 320, 1.35)
        draw_text(d, "ก่อนเริ่ม", (58, yy + 470), 28, "#f8ece6", False, 320, 1.35)

    if 0 < p2 < 1:
        x = int(54 - (1 - ease(p2)) * 60)
        draw_text(d, "รองรับหลายแนว", (x, 210), 50, "#ffffff", True, 420)
        draw_pill(d, "Tower Defense", x, 315, 220)
        draw_pill(d, "RPG / Idle RPG", x, 376, 244)
        draw_pill(d, "Android", x, 437, 154)
        draw_text(d, "ดูแพ็ก ราคา และเงื่อนไขชัดเจนก่อนตัดสินใจ", (x, 535), 30, "#f8ece6", True, 390)

    if 0 < p3 < 1:
        draw_text(d, "เริ่มง่ายใน 3 ขั้นตอน", (54, 208), 48, "#ffffff", True, 560)
        steps = [("1", "ส่งชื่อเกม"), ("2", "เลือกแพ็ก"), ("3", "แอดมินดูแล")]
        for index, (num, label) in enumerate(steps):
            alpha = int(255 * clamp01(p3 * 1.5 - index * 0.28))
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(layer)
            y = 320 + index * 120
            rounded(ld, (54, y, 474, y + 88), 24, (255, 255, 255, int(alpha * 0.9)))
            rounded(ld, (78, y + 18, 130, y + 70), 16, (143, 111, 148, alpha))
            draw_text(ld, num, (104, y + 31), 20, (255, 255, 255, alpha), True, 42, align="center")
            draw_text(ld, label, (152, y + 24), 28, (52, 45, 59, alpha), True, 260)
            img.alpha_composite(layer)

    if p4 > 0:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        draw_text(ld, "สนใจเกมไหน", (80, 420), 58, "#ffffff", True, 560, 1.15)
        draw_text(ld, "ทักแชทมาเช็กได้เลย", (80, 552), 52, "#f1cdbb", True, 560, 1.15)
        rounded(ld, (80, 720, 640, 800), 26, "#d8b7a0")
        draw_text(ld, "Game Services พร้อมดูแล", (360, 742), 30, "#251b2c", True, 520, align="center")
        img.alpha_composite(layer)

    draw_text(d, "เช็กเกม • ดูรายละเอียด • รับประกันตามเงื่อนไขร้าน", (W // 2, 1192), 22, "#ffffff", True, 640, align="center")
    return img.convert("RGB")


def main() -> None:
    video_path = OUT_DIR / "game-services-promo-vertical.mp4"
    preview_path = OUT_DIR / "game-services-promo-cover.png"

    imageio_ffmpeg_params = [
        "-vcodec",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
    ]
    writer = imageio.get_writer(
        video_path,
        fps=FPS,
        codec="libx264",
        quality=8,
        macro_block_size=16,
        ffmpeg_params=imageio_ffmpeg_params,
    )
    try:
        total = FPS * DURATION
        for frame_index in range(total):
            t = frame_index / FPS
            frame = draw_frame(t)
            if frame_index == FPS * 2:
                frame.save(preview_path)
            writer.append_data(np.asarray(frame))
    finally:
        writer.close()

    print(video_path)
    print(preview_path)


if __name__ == "__main__":
    main()
