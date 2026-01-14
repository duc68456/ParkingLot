import cv2
import torch
import sys
import os

# Add License-Plate-Recognition to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'License-Plate-Recognition'))

try:
    from function import helper
    from function import utils_rotate
except ImportError:
    print("Warning: Could not import helper/utils_rotate module. Make sure License-Plate-Recognition is properly set up.")


class LicensePlateRecognitionService:
    """
    Vietnamese License Plate Recognition Service
    Wraps the License-Plate-Recognition module for easy integration
    """
    
    def __init__(self):
        """Initialize YOLOv5 models for license plate detection and OCR"""
        print("🔧 Initializing License Plate Recognition Service...")
        
        # Paths to models
        base_path = os.path.join(os.path.dirname(__file__), '..', 'License-Plate-Recognition')
        lp_detector_path = os.path.join(base_path, 'model', 'LP_detector.pt')
        lp_ocr_path = os.path.join(base_path, 'model', 'LP_ocr.pt')
        
        # Load YOLOv5 License Plate Detection model
        self.yolo_LP_detect = torch.hub.load(
            'ultralytics/yolov5', 
            'custom', 
            path=lp_detector_path,
            force_reload=False
        )
        
        # Load YOLOv5 OCR model for reading characters
        self.yolo_license_plate = torch.hub.load(
            'ultralytics/yolov5',
            'custom',
            path=lp_ocr_path,
            force_reload=False
        )
        
        # Set confidence threshold
        self.yolo_license_plate.conf = 0.60
        
        print("✅ Models loaded successfully!")

    def recognize_from_image(self, image_path):
        """
        Recognize license plate from image file
        
        Args:
            image_path (str): Path to image file
            
        Returns:
            dict: {
                'success': bool,
                'licensePlate': str or None,
                'confidence': float,
                'error': str (if failed)
            }
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                return {
                    'success': False,
                    'error': 'Could not read image file'
                }
            
            return self._process_image(img)
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def recognize_from_camera(self, camera_id=0):
        """
        Capture image from camera and recognize license plate
        
        Args:
            camera_id (int): Camera device ID (default: 0)
            
        Returns:
            dict: Recognition result
        """
        try:
            # Open camera
            cap = cv2.VideoCapture(camera_id)
            
            if not cap.isOpened():
                return {
                    'success': False,
                    'error': f'Could not open camera {camera_id}'
                }
            
            # Capture frame
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                return {
                    'success': False,
                    'error': 'Could not capture frame from camera'
                }
            
            return self._process_image(frame)
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _process_image(self, img):
        """
        Process image and extract license plate text
        
        Args:
            img: OpenCV image (numpy array)
            
        Returns:
            dict: Recognition result with cropped image
        """
        try:
            import base64
            
            # Detect license plates in image
            plates = self.yolo_LP_detect(img, size=640)
            list_plates = plates.pandas().xyxy[0].values.tolist()
            
            # If no plates detected, try direct OCR on whole image
            if len(list_plates) == 0:
                lp_text = helper.read_plate(self.yolo_license_plate, img)
                if lp_text and lp_text != "unknown":
                    # Encode whole image as fallback
                    _, buffer = cv2.imencode('.jpg', img)
                    crop_base64 = base64.b64encode(buffer).decode('utf-8')
                    
                    return {
                        'success': True,
                        'licensePlate': lp_text,
                        'confidence': 0.5,
                        'croppedImage': crop_base64
                    }
                else:
                    return {
                        'success': False,
                        'error': 'No license plate detected in image'
                    }
            
            # Process each detected plate
            best_result = None
            best_confidence = 0
            best_crop = None
            
            for plate in list_plates:
                # Extract coordinates (giống webcam.py)
                x = int(plate[0])  # xmin
                y = int(plate[1])  # ymin
                w = int(plate[2] - plate[0])  # xmax - xmin
                h = int(plate[3] - plate[1])  # ymax - ymin
                confidence = float(plate[4])
                
                # Crop license plate region (KHÔNG padding - giống webcam.py)
                crop_img = img[y:y+h, x:x+w]
                
                # Thử nhiều biến thể xoay/contrast như webcam.py
                lp_text = None
                for cc in range(0, 2):  # change_contrast: 0 hoặc 1
                    for ct in range(0, 2):  # center_threshold: 0 hoặc 1
                        try:
                            processed_img = utils_rotate.deskew(crop_img, cc, ct)
                            lp_text = helper.read_plate(self.yolo_license_plate, processed_img)
                            if lp_text and lp_text != "unknown":
                                break
                        except:
                            continue
                    if lp_text and lp_text != "unknown":
                        break
                
                if lp_text and lp_text != "unknown":
                    if confidence > best_confidence:
                        best_result = lp_text
                        best_confidence = confidence
                        best_crop = crop_img
            
            if best_result and best_crop is not None:
                # Encode cropped image to base64
                _, buffer = cv2.imencode('.jpg', best_crop)
                crop_base64 = base64.b64encode(buffer).decode('utf-8')
                
                return {
                    'success': True,
                    'licensePlate': best_result,
                    'confidence': best_confidence,
                    'croppedImage': crop_base64
                }
            else:
                return {
                    'success': False,
                    'error': 'Could not read text from detected license plate'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Processing error: {str(e)}'
            }


# Singleton instance
_service_instance = None

def get_recognition_service():
    """
    Get singleton instance of recognition service
    
    Returns:
        LicensePlateRecognitionService: Singleton instance
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = LicensePlateRecognitionService()
    return _service_instance


# Test function
def test_service():
    """Test the recognition service with sample image"""
    service = get_recognition_service()
    
    # Test with sample image
    test_image_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 
        'License-Plate-Recognition', 
        'test_image', 
        '3.jpg'
    )
    
    if os.path.exists(test_image_path):
        print(f"\n📸 Testing with image: {test_image_path}")
        result = service.recognize_from_image(test_image_path)
        print(f"Result: {result}")
    else:
        print(f"⚠️  Test image not found: {test_image_path}")


if __name__ == '__main__':
    print("🚀 License Plate Recognition Service")
    print("=" * 50)
    test_service()
