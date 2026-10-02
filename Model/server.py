import base64
import io
import os
from pathlib import Path
from typing import Optional

import cv2
import httpx
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from ultralytics import YOLO

app = FastAPI(
    title="FixMeraMarg Pothole Detection API",
    description="YOLOv11-powered Pothole Detection and Verification Service",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = Path(__file__).resolve().parent
WEIGHTS_PATH = ROOT_DIR / "Potholes-Detection-YOLOv11" / "runs" / "detect" / "train" / "weights" / "best.pt"

# Fallback paths if directory structure varies
if not WEIGHTS_PATH.exists():
    fallback = ROOT_DIR / "runs" / "detect" / "train" / "weights" / "best.pt"
    if fallback.exists():
        WEIGHTS_PATH = fallback

model: Optional[YOLO] = None


def get_model() -> YOLO:
    global model
    if model is None:
        if not WEIGHTS_PATH.exists():
            raise FileNotFoundError(f"Model weights not found at: {WEIGHTS_PATH}")
        model = YOLO(str(WEIGHTS_PATH))
    return model


@app.on_event("startup")
def startup_event():
    try:
        get_model()
        print(f"[OK] YOLOv11 Model loaded successfully from {WEIGHTS_PATH}")
    except Exception as e:
        print(f"[WARN] Error preloading model: {e}")


class DetectionRequest(BaseModel):
    image: str  # Base64 string
    confidence_threshold: Optional[float] = 0.25


def calculate_severity(detections: list, img_area: int) -> str:
    if not detections:
        return "None"
    
    count = len(detections)
    # Calculate max box area ratio relative to image
    max_area_ratio = 0.0
    for d in detections:
        box = d.get("box", [0, 0, 0, 0])
        w = max(0, box[2] - box[0])
        h = max(0, box[3] - box[1])
        area = w * h
        if img_area > 0:
            ratio = area / img_area
            if ratio > max_area_ratio:
                max_area_ratio = ratio

    if count >= 3 or max_area_ratio > 0.20:
        return "Critical"
    elif count >= 2 or max_area_ratio > 0.10:
        return "High"
    elif max_area_ratio > 0.04:
        return "Medium"
    else:
        return "Low"


def run_yolo_inference(image: Image.Image, conf_thresh: float = 0.25):
    yolo_model = get_model()
    
    # Ensure RGB
    image_rgb = image.convert("RGB")
    img_width, img_height = image_rgb.size
    img_area = img_width * img_height

    device = 0 if getattr(yolo_model, "device", None) and yolo_model.device.type == "cuda" else "cpu"
    
    results = yolo_model.predict(
        source=image_rgb,
        conf=conf_thresh,
        device=device,
        verbose=False,
    )[0]

    detections = []
    max_confidence = 0.0

    if results.boxes is not None and len(results.boxes) > 0:
        names = results.names
        for box_coords, class_id, conf in zip(
            results.boxes.xyxy.tolist(),
            results.boxes.cls.tolist(),
            results.boxes.conf.tolist()
        ):
            confidence_val = float(conf)
            if confidence_val > max_confidence:
                max_confidence = confidence_val

            class_name = names.get(int(class_id), "pothole")
            detections.append({
                "class": class_name,
                "confidence": round(confidence_val * 100, 1),
                "box": [round(c, 1) for c in box_coords]
            })

    # Render annotated image
    annotated_np = results.plot()  # BGR numpy array
    annotated_rgb = cv2.cvtColor(annotated_np, cv2.COLOR_BGR2RGB)
    annotated_pil = Image.fromarray(annotated_rgb)

    buffered = io.BytesIO()
    annotated_pil.save(buffered, format="JPEG", quality=85)
    annotated_base64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

    is_pothole_detected = len(detections) > 0
    is_real = is_pothole_detected and (max_confidence >= 0.25)
    severity = calculate_severity(detections, img_area)

    return {
        "is_pothole_detected": is_pothole_detected,
        "is_real_report": is_real,
        "pothole_count": len(detections),
        "confidence": round(max_confidence * 100, 1) if is_pothole_detected else 0.0,
        "severity": severity if is_pothole_detected else "None",
        "detections": detections,
        "annotated_image": annotated_base64,
        "message": (
            f"Verified {len(detections)} pothole(s) with {round(max_confidence * 100, 1)}% confidence. Valid report."
            if is_real
            else "No pothole detected in the image. Unverified or invalid evidence."
        )
    }


@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Pothole Detection YOLOv11 Service",
        "model_loaded": model is not None or WEIGHTS_PATH.exists(),
        "weights_path": str(WEIGHTS_PATH),
    }


@app.post("/api/detect")
async def detect_pothole(
    file: Optional[UploadFile] = File(None),
    confidence_threshold: float = Form(0.25),
):
    try:
        if file is not None:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="No image file provided.")

        result = run_yolo_inference(image, conf_thresh=confidence_threshold)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/detect-base64")
async def detect_pothole_base64(request: DetectionRequest):
    try:
        raw_data = request.image
        if "," in raw_data:
            raw_data = raw_data.split(",", 1)[1]
        
        image_bytes = base64.b64decode(raw_data)
        image = Image.open(io.BytesIO(image_bytes))

        result = run_yolo_inference(
            image,
            conf_thresh=request.confidence_threshold or 0.25
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def load_env_file():
    env_path = ROOT_DIR.parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

load_env_file()

SUPABASE_TARGET_URL = os.getenv("SUPABASE_URL", "https://proxymqvyzjbzeumzizj.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


@app.api_route("/api/supabase/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def supabase_proxy(request: Request, path: str):
    if request.method == "OPTIONS":
        return Response(status_code=200)
    
    url = f"{SUPABASE_TARGET_URL}/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
    
    # Read incoming headers and strip browser headers
    headers = dict(request.headers)
    for h in [
        "host", "origin", "referer", "user-agent",
        "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform",
        "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest", "connection"
    ]:
        headers.pop(h, None)
    
    headers["apikey"] = SUPABASE_SERVICE_KEY
    auth_header = headers.get("authorization", "")
    if not auth_header or "sb_secret_" in auth_header:
        headers["authorization"] = f"Bearer {SUPABASE_SERVICE_KEY}"
    
    headers["Host"] = "proxymqvyzjbzeumzizj.supabase.co"

    body = await request.body()
    
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body if body else None,
            )
            response_headers = {}
            for k, v in resp.headers.items():
                if k.lower() not in ["content-encoding", "content-length", "transfer-encoding"]:
                    response_headers[k] = v
            
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=response_headers,
                media_type=resp.headers.get("content-type"),
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
