from typing import List, Optional
from pydantic import BaseModel, Field


class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, default=1)


class CreateOrderRequest(BaseModel):
    name: str = Field(min_length=1)
    phone: str = Field(min_length=6)
    region_code: str = Field(default="91")
    address: str = Field(min_length=1)
    items: List[OrderItemRequest]
    status: Optional[str] = Field(default="New")


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    password: str


class ProductUpsertRequest(BaseModel):
    name: str
    category_id: int
    selling_price: float
    original_price: Optional[float] = None
    available_stock: int = 0
    description: str = ""
    image: str
    is_featured: bool = False


class StockUpdateRequest(BaseModel):
    available_stock: int


class ThresholdUpdateRequest(BaseModel):
    low_stock_threshold: int


class OrderStatusUpdateRequest(BaseModel):
    status: str


class UserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
