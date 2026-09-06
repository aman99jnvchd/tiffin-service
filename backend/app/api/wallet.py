from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List
from pydantic import BaseModel

from ..models.models import Wallet, WalletTransaction
from ..schemas.schemas import WalletSchema
from ..schemas.responses import ApiResponse
from .deps import RoleChecker
from ..db.session import get_db

router = APIRouter()

class RechargeRequest(BaseModel):
    amount: float

@router.get("/customer/wallet", response_model=ApiResponse[WalletSchema])
async def get_customer_wallet(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    wallet = db.query(Wallet).options(
        joinedload(Wallet.transactions)
    ).filter(Wallet.user_id == current_user['user_id']).first()

    if not wallet:
        # Auto-create if it doesn't exist
        wallet = Wallet(user_id=current_user['user_id'], balance=0.00)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    # Sort transactions by created_at descending (safest to do in Python for joinedload if not specifically ordered)
    wallet.transactions.sort(key=lambda x: x.created_at, reverse=True)

    return ApiResponse(status=200, message="Wallet fetched", data=wallet)

@router.post("/customer/wallet/recharge", response_model=ApiResponse)
async def recharge_wallet(
    request: RechargeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    if request.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")

    wallet = db.query(Wallet).filter(Wallet.user_id == current_user['user_id']).first()
    if not wallet:
        wallet = Wallet(user_id=current_user['user_id'], balance=0.00)
        db.add(wallet)
        db.flush()

    wallet.balance = float(wallet.balance) + request.amount

    transaction = WalletTransaction(
        wallet_id=wallet.id,
        amount=request.amount,
        transaction_type="credit",
        description="Wallet Recharge"
    )
    db.add(transaction)
    db.commit()
    db.refresh(wallet)

    return ApiResponse(status=200, message="Recharge successful", data={"balance": wallet.balance})
