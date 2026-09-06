from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from ..core.security import SECRET_KEY, ALGORITHM
from ..db.session import get_db

# HTTPBearer tells Swagger to show a 'Lock' icon that accepts a 'Bearer' token
security = HTTPBearer()

async def get_current_user_data(auth: HTTPAuthorizationCredentials = Depends(security)):
    """
    Decodes the JWT token provided in the Authorization header.
    Returns the extracted user_id, role, and city_id.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = auth.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        city_id: int = payload.get("city_id")
        
        if user_id is None or role is None:
            raise credentials_exception
        
        return {
            "user_id": int(user_id), 
            "role": role, 
            "city_id": city_id
        }
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise credentials_exception

class RoleChecker:
    """
    Restricts access based on user role slug (e.g., 'customer' or 'vendor').
    """
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, user_data: dict = Depends(get_current_user_data)):
        if user_data["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Role '{user_data['role']}' does not have permission"
            )
        return user_data

class PermissionChecker:
    """
    Restricts access based on a permission slug assigned to the user's role.
    Looks up the user's role permissions from the database.
    """
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(
        self,
        user_data: dict = Depends(get_current_user_data),
        db: Session = Depends(get_db)
    ):
        from ..models.models import Profile
        user = db.query(Profile).filter(Profile.id == user_data["user_id"]).first()
        if not user or not user.role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No role assigned")

        slugs = [p.slug for p in user.role.permissions]
        if self.required_permission not in slugs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{self.required_permission}' required"
            )
        return user_data
