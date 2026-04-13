from transformers import pipeline
from PIL import Image
from rembg import remove
import numpy as np
import json

print("Removing background...")
img = Image.open("thilo-photo.png").convert("RGBA")
img_nobg = remove(img)

print("Loading Depth Anything V2 Large...")
pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Large-hf")

img_rgb = img.convert("RGB")
print("Estimating depth...")
result = pipe(img_rgb)
depth = result["depth"]

# Higher resolution — keep original aspect ratio
orig_w, orig_h = img.size
aspect = orig_w / orig_h
target_w = 480
target_h = int(target_w / aspect)
img_resized = img_nobg.resize((target_w, target_h))
depth_resized = depth.resize((target_w, target_h))

img_array = np.array(img_resized)  # RGBA
depth_array = np.array(depth_resized).astype(float)

# Normalize depth
depth_array = (depth_array - depth_array.min()) / (depth_array.max() - depth_array.min())

print("Generating point cloud...")
points = []
for y in range(target_h):
    for x in range(target_w):
        alpha = img_array[y, x, 3]
        if alpha < 128:
            continue

        # Closer = higher Z
        z = (1.0 - depth_array[y, x]) * 2.0

        r, g, b = img_array[y, x, :3]
        points.append([
            round((x - target_w/2) * 0.008, 4),
            round(-(y - target_h/2) * 0.008, 4),
            round(z, 4),
            round(r/255, 3), round(g/255, 3), round(b/255, 3)
        ])

print(f"Points: {len(points)}")

with open("frontend/public/pointcloud.json", "w") as f:
    json.dump(points, f)

print("Done!")
