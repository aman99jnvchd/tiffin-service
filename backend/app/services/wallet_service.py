from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from ..models.models import Wallet, WalletTransaction

class WalletService:
    @staticmethod
    def get_wallet(db: Session, user_id: int):
        wallet = db.query(Wallet).options(
            joinedload(Wallet.transactions)
        ).filter(Wallet.user_id == user_id).first()

        if not wallet:
            # Auto-create if it doesn't exist
            wallet = Wallet(user_id=user_id, balance=0.00)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

        # Sort transactions by created_at descending
        wallet.transactions.sort(key=lambda x: x.created_at, reverse=True)
        return wallet

    @staticmethod
    def recharge_wallet(db: Session, user_id: int, amount: float):
        if amount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")

        # FIX: Row-level locking to prevent race conditions during updates
        wallet = db.query(Wallet).filter(
            Wallet.user_id == user_id
        ).with_for_update().first() 

        if not wallet:
            wallet = Wallet(user_id=user_id, balance=0.00)
            db.add(wallet)
            db.flush()

        # FIX: Atomic database-level increment
        wallet.balance = Wallet.balance + amount

        transaction = WalletTransaction(
            wallet_id=wallet.id,
            amount=amount,
            transaction_type="credit",
            description="Wallet Recharge"
        )
        db.add(transaction)
        db.commit()
        db.refresh(wallet)

        return wallet
