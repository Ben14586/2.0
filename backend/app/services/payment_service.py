import crcmod

def generate_promptpay_payload(promptpay_id: str, amount: float = 0.0) -> str:
    """
    Generates an EMVCo PromptPay payload string.
    promptpay_id can be a 10-digit phone number or 13-digit citizen ID/Tax ID.
    amount is optional.
    """
    promptpay_id = promptpay_id.replace("-", "").replace(" ", "")
    
    # Payload Format Indicator
    payload = "000201"
    # Point of Initiation Method (11: static, 12: dynamic if amount present)
    payload += "010212" if amount > 0 else "010211"
    
    # Merchant Account Information (PromptPay App ID: A000000677010111)
    # Biller ID varies based on phone number vs NID
    if len(promptpay_id) >= 13:
        # NID or Tax ID
        acc_info = f"0016A0000006770101110213{promptpay_id}"
    else:
        # Phone number (convert 08... to 668...)
        if promptpay_id.startswith("0"):
            promptpay_id = "66" + promptpay_id[1:]
        acc_info = f"0016A0000006770101110113{promptpay_id.zfill(13)}"
        
    payload += f"29{len(acc_info):02d}{acc_info}"
    
    # Country Code
    payload += "5802TH"
    # Currency (THB)
    payload += "5303764"
    
    # Transaction Amount
    if amount > 0:
        amt_str = f"{amount:.2f}"
        payload += f"54{len(amt_str):02d}{amt_str}"
        
    # Checksum Header
    payload += "6304"
    
    # Calculate CRC16-CCITT (0xFFFF initial value, polynomial 0x1021)
    crc16 = crcmod.mkCrcFun(0x11021, rev=False, initCrc=0xFFFF, xorOut=0x0000)
    crc_val = crc16(payload.encode("utf-8"))
    
    checksum = f"{crc_val:04X}"
    return payload + checksum
