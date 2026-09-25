"""
E-Commerce Checkout & Payment Microservice
Author: Student Submission
Tech Stack: Python, FastAPI, SQLAlchemy, Redis, Stripe API
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field
import hashlib
import time

app = FastAPI(title="E-Commerce Payment Service", version="1.0.0")

# In-memory inventory cache for speed
INVENTORY_CACHE = {
    "item_101": {"name": "Mechanical Keyboard", "price": 4500, "stock": 14},
    "item_102": {"name": "Wireless Gaming Mouse", "price": 2800, "stock": 5},
    "item_103": {"name": "4K Monitor 27-inch", "price": 22000, "stock": 2}
}

ORDERS_DB = []

class OrderItem(BaseModel):
    item_id: str
    quantity: int = Field(gt=0, description="Quantity must be positive")

class CheckoutRequest(BaseModel):
    customer_id: str
    items: list[OrderItem]
    coupon_code: str | None = None
    payment_method: str = "CARD"

def apply_discount(total: float, coupon: str | None) -> float:
    # BUG/RISK: Hardcoded promo codes without database lookup or expiration check
    if coupon == "HACKATHON50":
        return total * 0.5
    elif coupon == "FLAT500":
        return max(0.0, total - 500.0)
    return total

def verify_jwt_token(authorization: str = Header(...)):
    # Tricky line: Simplified token check for demo
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.split(" ")[1]
    if len(token) < 16:
        raise HTTPException(status_code=403, detail="Signature invalid or expired")
    return token

@app.post("/api/checkout")
def process_checkout(payload: CheckoutRequest, token: str = Depends(verify_jwt_token)):
    """
    Handles end-to-end checkout with inventory lock and order settlement.
    Race Condition Note: Inventory is checked and subtracted without distributed locking.
    """
    subtotal = 0.0
    reserved_items = []

    # Check and deduct inventory
    for item in payload.items:
        if item.item_id not in INVENTORY_CACHE:
            raise HTTPException(status_code=404, detail=f"Product {item.item_id} not found")
        
        current_stock = INVENTORY_CACHE[item.item_id]["stock"]
        if current_stock < item.quantity:
            # Rollback previously reserved items
            for r_id, r_qty in reserved_items:
                INVENTORY_CACHE[r_id]["stock"] += r_qty
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {INVENTORY_CACHE[item.item_id]['name']}. Available: {current_stock}"
            )
        
        # Deduct
        INVENTORY_CACHE[item.item_id]["stock"] -= item.quantity
        reserved_items.append((item.item_id, item.quantity))
        subtotal += INVENTORY_CACHE[item.item_id]["price"] * item.quantity

    final_amount = apply_discount(subtotal, payload.coupon_code)
    
    order_id = f"ORD-{int(time.time())}-{hashlib.md5(payload.customer_id.encode()).hexdigest()[:6]}"
    
    record = {
        "order_id": order_id,
        "customer": payload.customer_id,
        "subtotal": subtotal,
        "final_amount": final_amount,
        "status": "PAID",
        "created_at": time.time()
    }
    ORDERS_DB.append(record)
    
    return {"status": "SUCCESS", "order": record}
