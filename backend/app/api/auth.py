from sqlalchemy.orm import Session
from ..db.session import get_db
from fastapi import APIRouter, Depends, status
from ..schemas.schemas import ProfileCreate, LoginRequest, SelfProfileUpdate, SelfPasswordUpdate
from ..schemas.responses import ApiResponse
from .deps import get_current_user_data
from ..services.auth_service import AuthService

router = APIRouter()

@router.post("/register", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: ProfileCreate, db: Session = Depends(get_db)):
    data = AuthService.register_user(db, user_data)
    return ApiResponse(status=201, message="Profile created successfully", data=data)

@router.post("/login", response_model=ApiResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    data = AuthService.login(db, login_data)
    return ApiResponse(status=200, message="Login successful", data=data)

@router.get("/me/permissions", response_model=ApiResponse)
def get_my_permissions(
    current_user: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    permission_slugs = AuthService.get_my_permissions(db, current_user)
    if not permission_slugs:
        return ApiResponse(status=200, message="No permissions found", data={"permissions": []})
    
    return ApiResponse(status=200, message="Permissions fetched successfully", data={"permissions": permission_slugs})

@router.get("/me", response_model=ApiResponse)
def get_my_profile(
    current_user: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    data = AuthService.get_my_profile(db, current_user)
    return ApiResponse(status=200, message="Profile fetched", data=data)

@router.put("/me", response_model=ApiResponse)
def update_my_profile(
    body: SelfProfileUpdate,
    current_user: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    AuthService.update_my_profile(db, body, current_user)
    return ApiResponse(status=200, message="Profile updated", data=None)

@router.patch("/me/password", response_model=ApiResponse)
def update_my_password(
    body: SelfPasswordUpdate,
    current_user: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    AuthService.update_my_password(db, body, current_user)
    return ApiResponse(status=200, message="Password updated successfully", data=None)
