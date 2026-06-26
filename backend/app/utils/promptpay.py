import binascii

def crc16_ccitt(data: str) -> str:
    crc = 0xFFFF
    for byte in data.encode('ascii'):
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc = crc << 1
            crc &= 0xFFFF
    return format(crc, '04X')

def generate_payload(promptpay_id: str, amount: float = 0.0) -> str:
    # 00: Version (01)
    # 01: Initiation Method (11 for multiple use, 12 for single use/amount specific)
    payload = "000201010212" if amount > 0 else "000201010211"
    
    # 29: Merchant Account Information
    # 00: AID (A000000677010111)
    merchant_info = "0016A000000677010111"
    
    # Check if ID is phone number or citizen ID
    promptpay_id = promptpay_id.replace("-", "").replace(" ", "")
    if len(promptpay_id) == 10: # Phone
        # 01: Phone number (0066 + phone without leading 0)
        formatted_phone = "0066" + promptpay_id[1:]
        merchant_info += f"01{len(formatted_phone):02d}{formatted_phone}"
    else: # Citizen ID or E-Wallet (13-15 digits)
        merchant_info += f"02{len(promptpay_id):02d}{promptpay_id}"
        
    payload += f"29{len(merchant_info):02d}{merchant_info}"
    
    # 58: Country Code (TH)
    payload += "5802TH"
    
    # 53: Currency Code (764 for THB)
    payload += "5303764"
    
    # 54: Transaction Amount
    if amount > 0:
        amt_str = f"{amount:.2f}"
        payload += f"54{len(amt_str):02d}{amt_str}"
        
    # 63: CRC (Checksum) appended at the end
    payload += "6304"
    
    crc = crc16_ccitt(payload)
    return payload + crc
