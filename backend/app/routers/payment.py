from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.payment_service import generate_promptpay_payload

router = APIRouter()

class PromptPayRequest(BaseModel):
    promptpay_id: str
    amount: float = 0.0

@router.post("/promptpay/generate")
async def generate_promptpay(req: PromptPayRequest):
    try:
        payload = generate_promptpay_payload(req.promptpay_id, req.amount)
        return {"success": True, "payload": payload}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
