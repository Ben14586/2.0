import os
import requests
import json

def send_line_notify(message: str) -> bool:
    """
    Sends a notification to the admin LINE group using LINE Notify.
    Requires LINE_NOTIFY_TOKEN in environment variables.
    """
    token = os.getenv("LINE_NOTIFY_TOKEN", "").strip()
    if not token:
        print("[LINE Notify skipped] No token provided. Message:", message)
        return False
        
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"message": message}
    
    try:
        response = requests.post("https://notify-api.line.me/api/notify", headers=headers, data=data)
        response.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        print(f"[LINE Notify error] {e}")
        return False

def push_line_message(user_line_id: str, message: str) -> bool:
    """
    Pushes a message to a specific user via LINE Messaging API.
    Requires LINE_CHANNEL_ACCESS_TOKEN.
    """
    token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
    if not token or not user_line_id:
        print(f"[LINE Push skipped] No token or user ID. To: {user_line_id}, Msg: {message}")
        return False
        
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "to": user_line_id,
        "messages": [
            {
                "type": "text",
                "text": message
            }
        ]
    }
    
    try:
        response = requests.post("https://api.line.me/v2/bot/message/push", headers=headers, json=data)
        response.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        print(f"[LINE Push error] {e}")
        if e.response is not None:
            print(e.response.text)
        return False
