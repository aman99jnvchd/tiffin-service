import os
import uuid
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from ..schemas.responses import ApiResponse
from .deps import get_current_user_data

router = APIRouter()

UPLOAD_DIR = "static/house_photos"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB Limit
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-house-photo", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def upload_house_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_data)
):
    # 1. Validate Extension
    filename_parts = file.filename.split(".")
    if len(filename_parts) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File has no extension"
        )
        
    extension = filename_parts[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Validate Content Type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image"
        )

    # 3. Read content and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 5MB."
        )

    # 4. Generate unique name and save
    unique_filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        # Proper 500 Server Error for IO failures 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage failure: {str(e)}"
        )

    # Return URL for database storage
    image_url = f"/static/house_photos/{unique_filename}"
    
    return ApiResponse(
        status=201, 
        message="Photo uploaded successfully", 
        data={"url": image_url}
    )


MEAL_IMAGE_DIR = "static/meal_images"
os.makedirs(MEAL_IMAGE_DIR, exist_ok=True)

@router.post("/upload-meal-image", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def upload_meal_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_data)
):
    filename_parts = file.filename.split(".")
    if len(filename_parts) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File has no extension")

    extension = filename_parts[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be an image")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large. Maximum size is 5MB.")

    unique_filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(MEAL_IMAGE_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Storage failure: {str(e)}")

    return ApiResponse(status=201, message="Meal image uploaded successfully", data={"url": f"/static/meal_images/{unique_filename}"})
