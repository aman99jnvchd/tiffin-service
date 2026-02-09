from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

# T allows the response to wrap any data type (List, Dict, or Single Object)
T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    status: int # Standard HTTP-like status (200, 201, 400, 404, etc.)
    message: str # Human-readable message for the UI (e.g., "Login successful")
    data: Optional[T] = None # The actual payload

    class Config:
        from_attributes = True

# Usage Example in a route:
# return ApiResponse(status=200, message="Success", data=user_obj)
