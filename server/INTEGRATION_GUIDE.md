# 📘 Hướng Dẫn Tích Hợp License Plate Recognition (YOLOv5) Cho Dự Án Khác

## 📋 Mục Lục

1. [Tổng Quan](#-tổng-quan)
2. [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
3. [Cấu Trúc Mã Nguồn](#-cấu-trúc-mã-nguồn)
4. [Bước 1: Sao Chép Mã Nguồn](#-bước-1-sao-chép-mã-nguồn)
5. [Bước 2: Cài Đặt Dependencies](#-bước-2-cài-đặt-dependencies)
6. [Bước 3: Tạo Service Layer](#-bước-3-tạo-service-layer)
7. [Bước 4: Tạo REST API](#-bước-4-tạo-rest-api)
8. [Bước 5: Tích Hợp với Backend](#-bước-5-tích-hợp-với-backend)
9. [Bước 6: Tích Hợp với Database](#-bước-6-tích-hợp-với-database)
10. [Bước 7: Test và Debug](#-bước-7-test-và-debug)
11. [⭐ Cropped Image Workflow](#-cropped-image-workflow)
12. [Các Trường Hợp Tích Hợp Phổ Biến](#-các-trường-hợp-tích-hợp-phổ-biến)
13. [Best Practices](#-best-practices)
14. [Troubleshooting](#-troubleshooting)

---

## 🎯 Tổng Quan

### Mô Tả Hệ Thống

Hệ thống nhận diện biển số xe Việt Nam sử dụng 2 model YOLOv5:

| Model | Chức Năng | File |
|-------|-----------|------|
| **LP Detector** | Phát hiện vị trí biển số trong ảnh | `LP_detector.pt` |
| **LP OCR** | Đọc ký tự trên biển số | `LP_ocr.pt` |

### Luồng Xử Lý

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌────────────┐
│  Input      │───▶│  LP Detector     │───▶│  Crop & Rotate  │───▶│  LP OCR    │
│  Image      │    │  (YOLOv5)        │    │  (OpenCV)       │    │  (YOLOv5)  │
└─────────────┘    └──────────────────┘    └─────────────────┘    └──────┬─────┘
                                                                          │
                                                                          ▼
                   ┌──────────────────┐    ┌─────────────────┐    ┌────────────┐
                   │  Your Database   │◀───│  Your Backend   │◀───│  License   │
                   │  (Any DB)        │    │  (Any Stack)    │    │  Plate Text│
                   └──────────────────┘    └─────────────────┘    └────────────┘
```

---

## 💻 Yêu Cầu Hệ Thống

### Python Environment

```
Python >= 3.8
pip >= 21.0
```

### Hardware

| Loại | Tối Thiểu | Khuyến Nghị |
|------|-----------|-------------|
| RAM | 4GB | 8GB+ |
| CPU | 4 cores | 8 cores |
| GPU | Không bắt buộc | CUDA-compatible (tăng tốc) |
| Disk | 2GB free | 5GB+ |

### Dependencies Chính

```
torch >= 2.0.0
torchvision >= 0.15.0
opencv-python >= 4.8.0
numpy >= 1.24.0
pandas >= 2.0.0
flask >= 3.0.0 (nếu dùng REST API)
pillow >= 10.0.0
pyyaml >= 6.0.0
```

---

## 📁 Cấu Trúc Mã Nguồn

### Thư Mục License-Plate-Recognition

```
License-Plate-Recognition/
├── model/                          # 📦 YOLOv5 Pretrained Models
│   ├── LP_detector.pt              # Model phát hiện biển số (lớn, chính xác)
│   ├── LP_detector_nano_61.pt      # Model nano (nhỏ, nhanh)
│   ├── LP_ocr.pt                   # Model OCR đọc ký tự (lớn)
│   └── LP_ocr_nano_62.pt           # Model OCR nano (nhỏ)
│
├── function/                       # 🔧 Core Functions
│   ├── helper.py                   # Hàm đọc biển số chính
│   └── utils_rotate.py             # Hàm xoay/căn chỉnh ảnh
│
├── lp_image.py                     # 📷 Script xử lý ảnh đơn
├── webcam.py                       # 🎥 Script xử lý camera realtime
└── requirements.txt                # 📋 Dependencies
```

### Giải Thích Các File Quan Trọng

#### 1. `function/helper.py` - Core OCR Logic

```python
def read_plate(yolo_license_plate, im):
    """
    Đọc biển số từ ảnh đã crop
    
    Args:
        yolo_license_plate: Model YOLOv5 OCR
        im: OpenCV image (numpy array)
    
    Returns:
        str: Biển số (VD: "59A1-2345") hoặc "unknown"
    
    Logic:
        1. Detect các ký tự trong ảnh
        2. Xác định biển 1 dòng hay 2 dòng
        3. Sắp xếp ký tự theo vị trí
        4. Ghép thành chuỗi biển số
    """
```

#### 2. `function/utils_rotate.py` - Image Preprocessing

```python
def deskew(src_img, change_cons, center_thres):
    """
    Xoay ảnh biển số bị nghiêng
    
    Args:
        src_img: Ảnh biển số đã crop
        change_cons: 1 = tăng contrast trước khi xoay
        center_thres: 1 = bỏ qua đường kẻ gần mép trên
    
    Returns:
        Ảnh đã được căn chỉnh
    """

def changeContrast(img):
    """Tăng độ tương phản bằng CLAHE"""

def rotate_image(image, angle):
    """Xoay ảnh theo góc"""
```

---

## 📥 Bước 1: Sao Chép Mã Nguồn

### Option A: Copy Thủ Công

```bash
# 1. Tạo thư mục trong project của bạn
mkdir -p your-project/license-plate-recognition

# 2. Copy các file cần thiết
cp -r License-Plate-Recognition/model your-project/license-plate-recognition/
cp -r License-Plate-Recognition/function your-project/license-plate-recognition/
```

### Option B: Git Submodule

```bash
# Thêm như submodule (nếu có repo riêng)
git submodule add <repo-url> license-plate-recognition
```

### Cấu Trúc Sau Khi Copy

```
your-project/
├── license-plate-recognition/
│   ├── model/
│   │   ├── LP_detector.pt
│   │   ├── LP_detector_nano_61.pt
│   │   ├── LP_ocr.pt
│   │   └── LP_ocr_nano_62.pt
│   └── function/
│       ├── __init__.py          # ⚠️ Tạo file này
│       ├── helper.py
│       └── utils_rotate.py
├── your-backend/
└── your-database/
```

### ⚠️ Quan Trọng: Tạo `__init__.py`

```bash
touch your-project/license-plate-recognition/function/__init__.py
```

---

## 📦 Bước 2: Cài Đặt Dependencies

### Tạo File `requirements.txt`

```txt
# Core ML Libraries
torch>=2.0.0
torchvision>=0.15.0

# Image Processing
opencv-python>=4.8.0
numpy>=1.24.0
pillow>=10.0.0

# Data Processing
pandas>=2.0.0
pyyaml>=6.0.0

# REST API (nếu cần)
flask>=3.0.0
flask-cors>=4.0.0

# YOLOv5 framework
# Sẽ được tải tự động qua torch.hub
```

### Cài Đặt

```bash
# Tạo virtual environment (khuyến nghị)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc
.\venv\Scripts\activate   # Windows

# Cài đặt dependencies
pip install -r requirements.txt
```

### Cài Đặt CUDA (Tùy Chọn - Tăng Tốc GPU)

```bash
# Kiểm tra CUDA version
nvidia-smi

# Cài torch với CUDA
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

---

## 🔧 Bước 3: Tạo Service Layer

### File: `lp_service.py`

Đây là module Python đóng gói toàn bộ logic nhận diện:

```python
"""
License Plate Recognition Service
Wrapper module for easy integration with any backend
"""

import cv2
import torch
import sys
import os
from typing import Dict, Optional, Union
import numpy as np

class LicensePlateService:
    """
    Service class cho nhận diện biển số xe Việt Nam
    
    Attributes:
        detector: YOLOv5 model phát hiện biển số
        ocr: YOLOv5 model đọc ký tự
        confidence_threshold: Ngưỡng confidence cho OCR
    
    Usage:
        service = LicensePlateService('/path/to/models')
        result = service.recognize('/path/to/image.jpg')
    """
    
    def __init__(
        self, 
        model_dir: str,
        helper_dir: str = None,
        use_nano: bool = False,
        ocr_confidence: float = 0.60,
        device: str = 'auto'
    ):
        """
        Khởi tạo service
        
        Args:
            model_dir: Thư mục chứa các file .pt
            helper_dir: Thư mục chứa function/helper.py
            use_nano: True = dùng model nano (nhanh hơn, ít chính xác hơn)
            ocr_confidence: Ngưỡng confidence cho OCR (0.0 - 1.0)
            device: 'auto', 'cpu', hoặc 'cuda'
        """
        self.model_dir = model_dir
        self.ocr_confidence = ocr_confidence
        
        # Thêm helper module vào path
        if helper_dir:
            sys.path.insert(0, helper_dir)
        else:
            # Mặc định: thư mục cha của model_dir
            sys.path.insert(0, os.path.dirname(model_dir))
        
        # Import helper functions
        try:
            from function import helper
            from function import utils_rotate
            self.helper = helper
            self.utils_rotate = utils_rotate
        except ImportError as e:
            raise ImportError(
                f"Cannot import helper module. "
                f"Ensure 'function' folder exists with helper.py and __init__.py. "
                f"Error: {e}"
            )
        
        # Xác định device
        if device == 'auto':
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        else:
            self.device = device
        
        print(f"🔧 Initializing LP Service on {self.device}...")
        
        # Chọn model
        if use_nano:
            detector_file = 'LP_detector_nano_61.pt'
            ocr_file = 'LP_ocr_nano_62.pt'
        else:
            detector_file = 'LP_detector.pt'
            ocr_file = 'LP_ocr.pt'
        
        detector_path = os.path.join(model_dir, detector_file)
        ocr_path = os.path.join(model_dir, ocr_file)
        
        # Kiểm tra file tồn tại
        if not os.path.exists(detector_path):
            raise FileNotFoundError(f"Detector model not found: {detector_path}")
        if not os.path.exists(ocr_path):
            raise FileNotFoundError(f"OCR model not found: {ocr_path}")
        
        # Load models
        print(f"📦 Loading detector: {detector_file}")
        self.detector = torch.hub.load(
            'ultralytics/yolov5',
            'custom',
            path=detector_path,
            force_reload=False,
            device=self.device
        )
        
        print(f"📦 Loading OCR: {ocr_file}")
        self.ocr = torch.hub.load(
            'ultralytics/yolov5',
            'custom',
            path=ocr_path,
            force_reload=False,
            device=self.device
        )
        self.ocr.conf = ocr_confidence
        
        print("✅ LP Service initialized!")
    
    def recognize(
        self, 
        image: Union[str, np.ndarray],
        return_crop: bool = False
    ) -> Dict:
        """
        Nhận diện biển số từ ảnh
        
        Args:
            image: Đường dẫn file ảnh hoặc numpy array (OpenCV format)
            return_crop: True = trả về ảnh biển số đã crop
        
        Returns:
            {
                'success': bool,
                'license_plate': str | None,
                'confidence': float,
                'plates_detected': int,
                'crop_image': np.ndarray | None,  # nếu return_crop=True
                'error': str | None
            }
        """
        try:
            # Đọc ảnh nếu là path
            if isinstance(image, str):
                img = cv2.imread(image)
                if img is None:
                    return {
                        'success': False,
                        'license_plate': None,
                        'confidence': 0,
                        'plates_detected': 0,
                        'error': f'Cannot read image: {image}'
                    }
            else:
                img = image
            
            # Phát hiện biển số
            detections = self.detector(img, size=640)
            plates = detections.pandas().xyxy[0].values.tolist()
            
            # Không phát hiện được biển nào
            if len(plates) == 0:
                # Thử đọc trực tiếp từ ảnh gốc
                lp_text = self.helper.read_plate(self.ocr, img)
                if lp_text and lp_text != "unknown":
                    return {
                        'success': True,
                        'license_plate': lp_text,
                        'confidence': 0.5,
                        'plates_detected': 0,
                        'crop_image': img if return_crop else None,
                        'error': None
                    }
                return {
                    'success': False,
                    'license_plate': None,
                    'confidence': 0,
                    'plates_detected': 0,
                    'error': 'No license plate detected'
                }
            
            # Xử lý từng biển số phát hiện được
            best_result = None
            best_confidence = 0
            best_crop = None
            
            for plate in plates:
                # Lấy tọa độ
                x1, y1, x2, y2 = int(plate[0]), int(plate[1]), int(plate[2]), int(plate[3])
                detection_conf = float(plate[4])
                
                # Crop biển số
                crop = img[y1:y2, x1:x2]
                
                # Thử đọc với các biến thể xoay/contrast
                lp_text = None
                for change_contrast in range(2):
                    for center_threshold in range(2):
                        processed = self.utils_rotate.deskew(
                            crop, change_contrast, center_threshold
                        )
                        text = self.helper.read_plate(self.ocr, processed)
                        if text and text != "unknown":
                            lp_text = text
                            break
                    if lp_text:
                        break
                
                # Cập nhật kết quả tốt nhất
                if lp_text and detection_conf > best_confidence:
                    best_result = lp_text
                    best_confidence = detection_conf
                    best_crop = crop
            
            if best_result:
                return {
                    'success': True,
                    'license_plate': best_result,
                    'confidence': best_confidence,
                    'plates_detected': len(plates),
                    'crop_image': best_crop if return_crop else None,
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'license_plate': None,
                    'confidence': 0,
                    'plates_detected': len(plates),
                    'error': 'Could not read text from detected plates'
                }
                
        except Exception as e:
            return {
                'success': False,
                'license_plate': None,
                'confidence': 0,
                'plates_detected': 0,
                'error': str(e)
            }
    
    def recognize_from_camera(self, camera_id: int = 0) -> Dict:
        """
        Chụp ảnh từ camera và nhận diện
        
        Args:
            camera_id: ID của camera (0, 1, 2...)
        
        Returns:
            Kết quả nhận diện (giống recognize())
        """
        try:
            cap = cv2.VideoCapture(camera_id)
            if not cap.isOpened():
                return {
                    'success': False,
                    'license_plate': None,
                    'confidence': 0,
                    'plates_detected': 0,
                    'error': f'Cannot open camera {camera_id}'
                }
            
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                return {
                    'success': False,
                    'license_plate': None,
                    'confidence': 0,
                    'plates_detected': 0,
                    'error': 'Failed to capture frame'
                }
            
            return self.recognize(frame)
            
        except Exception as e:
            return {
                'success': False,
                'license_plate': None,
                'confidence': 0,
                'plates_detected': 0,
                'error': str(e)
            }
    
    def batch_recognize(self, images: list) -> list:
        """
        Nhận diện nhiều ảnh cùng lúc
        
        Args:
            images: List đường dẫn ảnh hoặc numpy arrays
        
        Returns:
            List kết quả nhận diện
        """
        return [self.recognize(img) for img in images]


# Singleton pattern
_instance = None

def get_service(
    model_dir: str = None,
    **kwargs
) -> LicensePlateService:
    """
    Lấy singleton instance của service
    
    Args:
        model_dir: Thư mục chứa models
        **kwargs: Các tham số khác cho LicensePlateService
    
    Returns:
        LicensePlateService instance
    """
    global _instance
    if _instance is None:
        if model_dir is None:
            raise ValueError("model_dir is required for first initialization")
        _instance = LicensePlateService(model_dir, **kwargs)
    return _instance


# Test function
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-dir', required=True, help='Path to models directory')
    parser.add_argument('--image', required=True, help='Path to test image')
    parser.add_argument('--nano', action='store_true', help='Use nano models')
    args = parser.parse_args()
    
    service = LicensePlateService(
        model_dir=args.model_dir,
        use_nano=args.nano
    )
    
    result = service.recognize(args.image)
    print(f"\n{'='*50}")
    print(f"Result: {result}")
    print(f"{'='*50}")
```

---

## 🌐 Bước 4: Tạo REST API

### Option A: Flask API (Python)

File: `api_server.py`

```python
"""
Flask REST API for License Plate Recognition
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import base64
from datetime import datetime
from lp_service import LicensePlateService, get_service

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize service
MODEL_DIR = os.environ.get('MODEL_DIR', './license-plate-recognition/model')
try:
    service = get_service(model_dir=MODEL_DIR)
    SERVICE_READY = True
except Exception as e:
    print(f"❌ Failed to init service: {e}")
    SERVICE_READY = False


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok' if SERVICE_READY else 'error',
        'service': 'License Plate Recognition',
        'ready': SERVICE_READY,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/recognize', methods=['POST'])
def recognize():
    """
    Nhận diện biển số từ ảnh upload
    
    Request:
        - multipart/form-data với field 'file'
        HOẶC
        - JSON với field 'image' (base64 encoded)
    
    Response:
        {
            "success": true,
            "data": {
                "license_plate": "59A1-2345",
                "confidence": 0.95,
                "timestamp": "2025-01-14T10:30:00"
            }
        }
    """
    if not SERVICE_READY:
        return jsonify({'success': False, 'error': 'Service not ready'}), 503
    
    filepath = None
    
    try:
        # Handle file upload
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '' or not allowed_file(file.filename):
                return jsonify({'success': False, 'error': 'Invalid file'}), 400
            
            filename = f"{uuid.uuid4()}.jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
        
        # Handle base64 image
        elif request.is_json and 'image' in request.json:
            image_data = request.json['image']
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            filename = f"{uuid.uuid4()}.jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
        
        else:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        # Recognize
        result = service.recognize(filepath)
        
        # Cleanup
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        
        # Response
        if result['success']:
            return jsonify({
                'success': True,
                'data': {
                    'license_plate': result['license_plate'],
                    'confidence': result['confidence'],
                    'plates_detected': result['plates_detected'],
                    'timestamp': datetime.now().isoformat()
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Recognition failed')
            }), 422
            
    except Exception as e:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/recognize/camera', methods=['POST'])
def recognize_camera():
    """Nhận diện từ camera"""
    if not SERVICE_READY:
        return jsonify({'success': False, 'error': 'Service not ready'}), 503
    
    camera_id = request.json.get('camera_id', 0) if request.is_json else 0
    result = service.recognize_from_camera(camera_id)
    
    if result['success']:
        return jsonify({
            'success': True,
            'data': {
                'license_plate': result['license_plate'],
                'confidence': result['confidence'],
                'timestamp': datetime.now().isoformat()
            }
        })
    else:
        return jsonify({'success': False, 'error': result.get('error')}), 422


if __name__ == '__main__':
    print("🚀 License Plate Recognition API")
    print(f"📍 Health: http://localhost:5001/health")
    print(f"📍 Recognize: POST http://localhost:5001/api/recognize")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
```

### Option B: FastAPI (Modern Python)

File: `api_fastapi.py`

```python
"""
FastAPI Server for License Plate Recognition
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import base64
from datetime import datetime
from lp_service import get_service

app = FastAPI(title="License Plate Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MODEL_DIR = os.environ.get('MODEL_DIR', './license-plate-recognition/model')
service = get_service(model_dir=MODEL_DIR)


class Base64Image(BaseModel):
    image: str  # base64 encoded


class RecognitionResult(BaseModel):
    success: bool
    license_plate: Optional[str]
    confidence: float
    timestamp: str
    error: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "LP Recognition"}


@app.post("/api/recognize", response_model=RecognitionResult)
async def recognize(file: UploadFile = File(...)):
    """Recognize license plate from uploaded image"""
    
    # Save temp file
    filename = f"{uuid.uuid4()}.jpg"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    content = await file.read()
    with open(filepath, 'wb') as f:
        f.write(content)
    
    try:
        result = service.recognize(filepath)
        
        return RecognitionResult(
            success=result['success'],
            license_plate=result.get('license_plate'),
            confidence=result.get('confidence', 0),
            timestamp=datetime.now().isoformat(),
            error=result.get('error')
        )
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@app.post("/api/recognize/base64", response_model=RecognitionResult)
async def recognize_base64(data: Base64Image):
    """Recognize from base64 encoded image"""
    
    image_data = data.image
    if ',' in image_data:
        image_data = image_data.split(',')[1]
    
    image_bytes = base64.b64decode(image_data)
    
    filename = f"{uuid.uuid4()}.jpg"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    with open(filepath, 'wb') as f:
        f.write(image_bytes)
    
    try:
        result = service.recognize(filepath)
        
        return RecognitionResult(
            success=result['success'],
            license_plate=result.get('license_plate'),
            confidence=result.get('confidence', 0),
            timestamp=datetime.now().isoformat(),
            error=result.get('error')
        )
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


# Run with: uvicorn api_fastapi:app --host 0.0.0.0 --port 5001 --reload
```

---

## 🔌 Bước 5: Tích Hợp với Backend

### Option A: Node.js / Express Backend

File: `licensePlateClient.js`

```javascript
/**
 * Client để gọi Python License Plate Recognition Service
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class LicensePlateClient {
    constructor(serviceUrl = 'http://localhost:5001') {
        this.serviceUrl = serviceUrl;
        this.timeout = 30000; // 30 seconds
    }

    /**
     * Kiểm tra service health
     */
    async checkHealth() {
        try {
            const response = await axios.get(`${this.serviceUrl}/health`, {
                timeout: 5000
            });
            return response.data.ready === true;
        } catch (error) {
            console.error('LP Service health check failed:', error.message);
            return false;
        }
    }

    /**
     * Nhận diện biển số từ file ảnh
     * @param {string} imagePath - Đường dẫn file ảnh
     */
    async recognizeFromFile(imagePath) {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(imagePath));

        try {
            const response = await axios.post(
                `${this.serviceUrl}/api/recognize`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: this.timeout
                }
            );
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Nhận diện từ buffer ảnh
     * @param {Buffer} imageBuffer - Buffer chứa dữ liệu ảnh
     * @param {string} filename - Tên file
     */
    async recognizeFromBuffer(imageBuffer, filename = 'image.jpg') {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: filename,
            contentType: 'image/jpeg'
        });

        try {
            const response = await axios.post(
                `${this.serviceUrl}/api/recognize`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: this.timeout
                }
            );
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Nhận diện từ base64
     * @param {string} base64Image - Ảnh encode base64
     */
    async recognizeFromBase64(base64Image) {
        try {
            const response = await axios.post(
                `${this.serviceUrl}/api/recognize`,
                { image: base64Image },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: this.timeout
                }
            );
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Nhận diện từ camera
     * @param {number} cameraId - ID camera
     */
    async recognizeFromCamera(cameraId = 0) {
        try {
            const response = await axios.post(
                `${this.serviceUrl}/api/recognize/camera`,
                { camera_id: cameraId },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: this.timeout
                }
            );
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
}

module.exports = LicensePlateClient;

// Usage example
if (require.main === module) {
    const client = new LicensePlateClient();
    
    (async () => {
        console.log('Checking health...');
        const healthy = await client.checkHealth();
        console.log('Service healthy:', healthy);
        
        if (healthy) {
            const result = await client.recognizeFromFile('./test.jpg');
            console.log('Result:', result);
        }
    })();
}
```

### Option B: Django Backend (Python)

File: `views.py`

```python
"""
Django views for License Plate Recognition
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import os
import tempfile
from datetime import datetime

# Import service
from license_plate.lp_service import get_service

# Initialize service
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
lp_service = get_service(model_dir=MODEL_DIR)


@csrf_exempt
@require_http_methods(["POST"])
def recognize_license_plate(request):
    """
    API endpoint nhận diện biển số
    
    POST /api/recognize/
    - multipart/form-data với file 'image'
    """
    try:
        if 'image' not in request.FILES:
            return JsonResponse({
                'success': False,
                'error': 'No image provided'
            }, status=400)
        
        image_file = request.FILES['image']
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(
            suffix='.jpg', 
            delete=False
        ) as tmp:
            for chunk in image_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name
        
        try:
            # Recognize
            result = lp_service.recognize(tmp_path)
            
            if result['success']:
                return JsonResponse({
                    'success': True,
                    'data': {
                        'license_plate': result['license_plate'],
                        'confidence': result['confidence'],
                        'timestamp': datetime.now().isoformat()
                    }
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': result.get('error', 'Recognition failed')
                }, status=422)
                
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
```

### Option C: Spring Boot Backend (Java)

File: `LicensePlateController.java`

```java
package com.example.parking.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.ByteArrayResource;

import java.util.Map;

@RestController
@RequestMapping("/api/license-plate")
public class LicensePlateController {

    @Value("${lp.service.url:http://localhost:5001}")
    private String lpServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                lpServiceUrl + "/health",
                Map.class
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/recognize")
    public ResponseEntity<Map<String, Object>> recognize(
        @RequestParam("file") MultipartFile file
    ) {
        try {
            // Prepare multipart request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            });

            HttpEntity<MultiValueMap<String, Object>> requestEntity = 
                new HttpEntity<>(body, headers);

            // Call Python service
            ResponseEntity<Map> response = restTemplate.postForEntity(
                lpServiceUrl + "/api/recognize",
                requestEntity,
                Map.class
            );

            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}
```

---

## 💾 Bước 6: Tích Hợp với Database

### Schema Mẫu

```sql
-- PostgreSQL / MySQL

CREATE TABLE parking_logs (
    id SERIAL PRIMARY KEY,
    license_plate VARCHAR(20) NOT NULL,
    entry_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP,
    entry_image_path VARCHAR(500),
    exit_image_path VARCHAR(500),
    entry_confidence DECIMAL(4,3),
    exit_confidence DECIMAL(4,3),
    fee DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'in_parking',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_plate ON parking_logs(license_plate);
CREATE INDEX idx_entry_time ON parking_logs(entry_time);
CREATE INDEX idx_status ON parking_logs(status);
```

### MongoDB Schema

```javascript
// Mongoose model
const ParkingLogSchema = new mongoose.Schema({
    licensePlate: {
        type: String,
        required: true,
        index: true
    },
    entryTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    exitTime: Date,
    entryImage: {
        data: String,      // Base64 hoặc path
        mimeType: String,
        confidence: Number
    },
    exitImage: {
        data: String,
        mimeType: String,
        confidence: Number
    },
    fee: Number,
    status: {
        type: String,
        enum: ['in_parking', 'exited', 'cancelled'],
        default: 'in_parking'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ParkingLog', ParkingLogSchema);
```

### Ví Dụ Tích Hợp: Node.js + MongoDB

```javascript
/**
 * Parking Controller với License Plate Recognition
 */

const ParkingLog = require('./models/ParkingLog');
const LicensePlateClient = require('./licensePlateClient');

const lpClient = new LicensePlateClient('http://localhost:5001');

class ParkingController {
    /**
     * Xử lý xe vào bãi
     */
    async handleEntry(imageBuffer) {
        // 1. Nhận diện biển số
        const recognition = await lpClient.recognizeFromBuffer(imageBuffer);
        
        if (!recognition.success) {
            throw new Error(`Recognition failed: ${recognition.error}`);
        }
        
        const { license_plate, confidence } = recognition.data;
        
        // 2. Kiểm tra xe đã trong bãi chưa
        const existingEntry = await ParkingLog.findOne({
            licensePlate: license_plate,
            status: 'in_parking'
        });
        
        if (existingEntry) {
            throw new Error(`Vehicle ${license_plate} is already in parking`);
        }
        
        // 3. Tạo log mới
        const log = await ParkingLog.create({
            licensePlate: license_plate,
            entryTime: new Date(),
            entryImage: {
                data: imageBuffer.toString('base64'),
                mimeType: 'image/jpeg',
                confidence: confidence
            },
            status: 'in_parking'
        });
        
        return {
            success: true,
            data: {
                id: log._id,
                licensePlate: license_plate,
                confidence: confidence,
                entryTime: log.entryTime
            }
        };
    }
    
    /**
     * Xử lý xe ra bãi
     */
    async handleExit(imageBuffer) {
        // 1. Nhận diện biển số
        const recognition = await lpClient.recognizeFromBuffer(imageBuffer);
        
        if (!recognition.success) {
            throw new Error(`Recognition failed: ${recognition.error}`);
        }
        
        const { license_plate, confidence } = recognition.data;
        
        // 2. Tìm entry log
        const entryLog = await ParkingLog.findOne({
            licensePlate: license_plate,
            status: 'in_parking'
        });
        
        if (!entryLog) {
            throw new Error(`No entry record found for ${license_plate}`);
        }
        
        // 3. Tính phí
        const exitTime = new Date();
        const duration = (exitTime - entryLog.entryTime) / (1000 * 60 * 60); // hours
        const fee = this.calculateFee(duration);
        
        // 4. Cập nhật log
        entryLog.exitTime = exitTime;
        entryLog.exitImage = {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg',
            confidence: confidence
        };
        entryLog.fee = fee;
        entryLog.status = 'exited';
        await entryLog.save();
        
        return {
            success: true,
            data: {
                id: entryLog._id,
                licensePlate: license_plate,
                entryTime: entryLog.entryTime,
                exitTime: exitTime,
                duration: duration.toFixed(2),
                fee: fee
            }
        };
    }
    
    calculateFee(hours) {
        const RATE_PER_HOUR = 10000; // 10,000 VND/hour
        const MIN_FEE = 5000;
        return Math.max(MIN_FEE, Math.ceil(hours) * RATE_PER_HOUR);
    }
}

module.exports = new ParkingController();
```

---

## 🧪 Bước 7: Test và Debug

### Test Script Python

```python
"""
test_integration.py - Test toàn bộ hệ thống
"""

import requests
import os
import sys

def test_health(base_url):
    """Test health endpoint"""
    print("\n1️⃣  Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        data = response.json()
        
        if data.get('ready') or data.get('status') == 'ok':
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Service not ready: {data}")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


def test_recognize(base_url, image_path):
    """Test recognition endpoint"""
    print(f"\n2️⃣  Testing recognition with: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        return False
    
    try:
        with open(image_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(
                f"{base_url}/api/recognize",
                files=files,
                timeout=30
            )
        
        data = response.json()
        
        if data.get('success'):
            print(f"✅ Recognition successful!")
            print(f"   License Plate: {data['data']['license_plate']}")
            print(f"   Confidence: {data['data'].get('confidence', 'N/A')}")
            return True
        else:
            print(f"❌ Recognition failed: {data.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Recognition error: {e}")
        return False


def run_tests(base_url='http://localhost:5001', image_path=None):
    """Run all tests"""
    print("=" * 60)
    print("🧪 License Plate Recognition - Integration Tests")
    print("=" * 60)
    print(f"Service URL: {base_url}")
    
    # Test health
    if not test_health(base_url):
        print("\n⚠️  Service not available. Start the API server first.")
        return False
    
    # Test recognition
    if image_path:
        test_recognize(base_url, image_path)
    else:
        print("\n⚠️  No test image provided. Skipping recognition test.")
    
    print("\n" + "=" * 60)
    print("✅ Tests completed!")
    print("=" * 60)
    return True


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:5001')
    parser.add_argument('--image', help='Path to test image')
    args = parser.parse_args()
    
    run_tests(args.url, args.image)
```

### Test Script cURL

```bash
#!/bin/bash
# test_api.sh

BASE_URL="${LP_SERVICE_URL:-http://localhost:5001}"

echo "🧪 Testing License Plate Recognition API"
echo "URL: $BASE_URL"
echo "=========================================="

# Test health
echo -e "\n1. Health Check:"
curl -s "$BASE_URL/health" | jq

# Test recognize (if image provided)
if [ -n "$1" ]; then
    echo -e "\n2. Recognition Test:"
    curl -s -X POST "$BASE_URL/api/recognize" \
        -F "file=@$1" | jq
fi
```

---

## ⭐ Cropped Image Workflow

### Mục Đích

Thay vì trả về toàn bộ ảnh webcam/upload, hệ thống chỉ trả về **ảnh đã crop phần biển số xe**:

| Trước | Sau |
|-------|-----|
| Ảnh full ~500KB | Ảnh crop ~20KB |
| Nhiều chi tiết thừa | Chỉ biển số xe |
| Lộ môi trường xung quanh | Bảo mật tốt hơn |

### Luồng Xử Lý Chi Tiết

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         1. INPUT: Webcam/Upload Image                        │
│                         (Ảnh full resolution)                                │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    2. YOLOv5 LP DETECTOR                                     │
│                    Detect vị trí biển số trong ảnh                          │
│                    → Output: x, y, w, h, confidence                         │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    3. CROP IMAGE                                             │
│                    crop_img = img[y:y+h, x:x+w]                             │
│                    (Giống logic trong webcam.py)                            │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    4. DESKEW (Xoay/Căn chỉnh)                               │
│                    Thử 4 biến thể: cc={0,1} × ct={0,1}                      │
│                    utils_rotate.deskew(crop_img, cc, ct)                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    5. YOLOv5 OCR                                             │
│                    helper.read_plate(yolo_ocr, processed_img)               │
│                    → Output: "59A1-12345"                                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    6. ENCODE CROPPED IMAGE                                   │
│                    cv2.imencode('.jpg', best_crop)                          │
│                    base64.b64encode(buffer)                                 │
│                    → Output: "data:image/jpeg;base64,/9j/4AAQ..."           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    7. RETURN RESPONSE                                        │
│    {                                                                         │
│      "success": true,                                                        │
│      "licensePlate": "59A1-12345",                                          │
│      "confidence": 0.95,                                                     │
│      "croppedImage": "data:image/jpeg;base64,..."  ← CHỈ BIỂN SỐ           │
│    }                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cách Implement Trong Python Service

```python
def _process_image(self, img):
    """Process image and return cropped license plate"""
    import base64
    
    # 1. Detect plates
    plates = self.yolo_LP_detect(img, size=640)
    list_plates = plates.pandas().xyxy[0].values.tolist()
    
    best_result = None
    best_confidence = 0
    best_crop = None
    
    for plate in list_plates:
        # 2. Extract coordinates (giống webcam.py)
        x = int(plate[0])  # xmin
        y = int(plate[1])  # ymin
        w = int(plate[2] - plate[0])  # width
        h = int(plate[3] - plate[1])  # height
        confidence = float(plate[4])
        
        # 3. Crop (KHÔNG thêm padding - giống webcam.py)
        crop_img = img[y:y+h, x:x+w]
        
        # 4. Thử 4 biến thể deskew để đọc text
        lp_text = None
        for cc in range(0, 2):  # change_contrast
            for ct in range(0, 2):  # center_threshold
                try:
                    processed = utils_rotate.deskew(crop_img, cc, ct)
                    lp_text = helper.read_plate(self.yolo_ocr, processed)
                    if lp_text and lp_text != "unknown":
                        break
                except:
                    continue
            if lp_text and lp_text != "unknown":
                break
        
        # 5. Lưu kết quả tốt nhất
        if lp_text and lp_text != "unknown":
            if confidence > best_confidence:
                best_result = lp_text
                best_confidence = confidence
                best_crop = crop_img  # Lưu ảnh crop
    
    if best_result and best_crop is not None:
        # 6. Encode cropped image to base64
        _, buffer = cv2.imencode('.jpg', best_crop)
        crop_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            'success': True,
            'licensePlate': best_result,
            'confidence': best_confidence,
            'croppedImage': crop_base64  # ⭐ Trả về ảnh đã crop
        }
```

### Cách Forward Qua Các Tầng

#### 1. Python Flask API → Node.js

```python
# api_server.py
if result['success']:
    response_data = {
        'licensePlate': result['licensePlate'],
        'confidence': result.get('confidence', 0),
        'croppedImage': f'data:image/jpeg;base64,{result["croppedImage"]}',
        'timestamp': datetime.now().isoformat()
    }
```

#### 2. Node.js Client

```javascript
// licensePlateClient.js
if (response.data.success) {
    return {
        success: true,
        licensePlate: response.data.data.licensePlate,
        confidence: response.data.data.confidence,
        croppedImage: response.data.data.croppedImage,  // Forward
        timestamp: response.data.data.timestamp
    };
}
```

#### 3. Node.js Controller → Frontend

```javascript
// parkingLogs.js controller
response.json({
    success: true,
    data: {
        licensePlate: recognitionResult.licensePlate,
        confidence: recognitionResult.confidence,
        croppedImage: recognitionResult.croppedImage,  // ⭐
        imageData: recognitionResult.croppedImage || imageBase64,  // Fallback
    }
});
```

#### 4. Frontend React

```jsx
// EntryLane.jsx / ExitLane.jsx
if (result.success) {
    setFormData({
        ...formData,
        licensePlate: result.data.licensePlate,
        // Ưu tiên ảnh crop, fallback ảnh gốc
        imageData: result.data.croppedImage || result.data.imageData,
    });
}
```

### So Sánh Trước và Sau

#### ❌ Trước: Hiển thị ảnh full

```
┌──────────────────────────────────────────┐
│                                          │
│    👤  Người đang cầm điện thoại         │
│                                          │
│        📱 [12-B1-168.88]                 │
│                                          │
│           🏢  Nền phía sau               │
│                                          │
│    ← Nhiều thông tin thừa, lớn          │
└──────────────────────────────────────────┘
```

#### ✅ Sau: Hiển thị ảnh crop

```
┌───────────────────┐
│   12-B1           │
│   168.88          │
│                   │
│  ← Chỉ biển số    │
│    Gọn gàng!      │
└───────────────────┘
```

### Lợi Ích

| Khía Cạnh | Trước | Sau |
|-----------|-------|-----|
| **Kích thước ảnh** | ~500KB (full) | ~20KB (crop) |
| **Tốc độ tải** | Chậm | Nhanh ⚡ |
| **Database storage** | Tốn nhiều | Tiết kiệm 💾 |
| **UI/UX** | Nhiễu, khó nhìn | Gọn gàng ✨ |
| **Bảo mật** | Lộ môi trường | Chỉ biển số 🔒 |
| **Bandwidth** | Cao | Thấp 📶 |

### Checklist Implement Cropped Image

- [ ] Cập nhật Python Service: `_process_image()` trả về `croppedImage`
- [ ] Import `utils_rotate` để dùng `deskew()`
- [ ] Cập nhật Flask API: forward `croppedImage` trong response
- [ ] Cập nhật Node.js Client: forward `croppedImage`
- [ ] Cập nhật Node.js Controller: include `croppedImage` trong response
- [ ] Cập nhật Frontend: ưu tiên hiển thị `croppedImage`
- [ ] Test end-to-end

---

## 🎯 Các Trường Hợp Tích Hợp Phổ Biến

### Case 1: Microservice Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  API        │────▶│  LP Service │
│  (React)    │     │  Gateway    │     │  (Python)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Database   │
                    │  (MongoDB)  │
                    └─────────────┘
```

### Case 2: Monolith với Python Backend

```python
# Django/Flask app
from lp_service import LicensePlateService

# Khởi tạo 1 lần khi app start
lp_service = LicensePlateService(model_dir='./models')

# Sử dụng trong views
def recognize_view(request):
    result = lp_service.recognize(image_path)
    # ...
```

### Case 3: Serverless (AWS Lambda)

```python
# lambda_function.py

import json
import base64
import boto3
from lp_service import LicensePlateService

# Cold start: load models
service = None

def get_service():
    global service
    if service is None:
        service = LicensePlateService(
            model_dir='/opt/models',
            use_nano=True  # Nano models cho Lambda
        )
    return service

def handler(event, context):
    # Get image from S3 or base64
    if 'body' in event:
        body = json.loads(event['body'])
        image_b64 = body['image']
        # ... decode and process
    
    result = get_service().recognize(image_path)
    
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
```

---

## 📌 Best Practices

### 1. Performance

```python
# ✅ Sử dụng singleton pattern
service = get_service(model_dir='./models')

# ✅ Dùng nano models cho production
service = LicensePlateService(use_nano=True)

# ✅ Enable GPU nếu có
service = LicensePlateService(device='cuda')

# ✅ Batch processing cho nhiều ảnh
results = service.batch_recognize(images)
```

### 2. Error Handling

```python
# ✅ Luôn check result
result = service.recognize(image)
if not result['success']:
    logger.error(f"Recognition failed: {result['error']}")
    # Handle error appropriately
    
# ✅ Timeout cho HTTP calls
response = requests.post(url, timeout=30)

# ✅ Retry logic
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential())
def recognize_with_retry(image):
    return service.recognize(image)
```

### 3. Security

```python
# ✅ Validate file type
ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/bmp'}
if file.content_type not in ALLOWED_TYPES:
    raise ValueError('Invalid file type')

# ✅ Limit file size
MAX_SIZE = 10 * 1024 * 1024  # 10MB
if file.size > MAX_SIZE:
    raise ValueError('File too large')

# ✅ Clean up temp files
try:
    result = service.recognize(temp_path)
finally:
    os.remove(temp_path)
```

### 4. Logging & Monitoring

```python
import logging
import time

logger = logging.getLogger(__name__)

def recognize_with_logging(image_path):
    start = time.time()
    
    try:
        result = service.recognize(image_path)
        
        duration = time.time() - start
        logger.info(
            f"Recognition completed",
            extra={
                'license_plate': result.get('license_plate'),
                'confidence': result.get('confidence'),
                'duration_ms': duration * 1000,
                'success': result['success']
            }
        )
        
        return result
        
    except Exception as e:
        logger.exception(f"Recognition error: {e}")
        raise
```

---

## ❓ Troubleshooting

### Lỗi Thường Gặp

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-------------|-----------|
| `ModuleNotFoundError: torch` | Chưa cài PyTorch | `pip install torch torchvision` |
| `Could not import helper` | Thiếu `__init__.py` | Tạo file `function/__init__.py` |
| `Model not found` | Sai đường dẫn model | Kiểm tra `model_dir` |
| `CUDA out of memory` | Không đủ VRAM | Dùng `device='cpu'` hoặc nano models |
| `Recognition timeout` | Ảnh quá lớn / server chậm | Resize ảnh, tăng timeout |
| `No license plate detected` | Ảnh chất lượng kém | Cải thiện ánh sáng, góc chụp |

### Debug Commands

```bash
# Kiểm tra CUDA
python -c "import torch; print(torch.cuda.is_available())"

# Kiểm tra model files
ls -la ./models/*.pt

# Test service trực tiếp
python lp_service.py --model-dir ./models --image test.jpg

# Check API logs
tail -f logs/api.log

# Test API health
curl http://localhost:5001/health | jq
```

### Performance Tuning

```python
# Resize ảnh trước khi recognize
def preprocess_image(image_path, max_size=1024):
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        new_size = (int(w * scale), int(h * scale))
        img = cv2.resize(img, new_size)
    
    return img
```

---

## 📚 Tài Liệu Tham Khảo

- [YOLOv5 Official Documentation](https://docs.ultralytics.com/)
- [PyTorch Documentation](https://pytorch.org/docs/)
- [OpenCV Python Tutorials](https://docs.opencv.org/master/d6/d00/tutorial_py_root.html)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

## 📝 Checklist Tích Hợp

- [ ] Sao chép thư mục `model/` và `function/`
- [ ] Tạo file `function/__init__.py`
- [ ] Cài đặt Python dependencies
- [ ] Tạo service layer (`lp_service.py`)
- [ ] Tạo REST API (Flask/FastAPI)
- [ ] Tạo client cho backend
- [ ] Thiết kế database schema
- [ ] Implement business logic
- [ ] Viết tests
- [ ] Cấu hình logging
- [ ] Setup production deployment

---

**Chúc bạn tích hợp thành công! 🎉**

*Tài liệu này được tạo dựa trên mã nguồn License-Plate-Recognition project.*
