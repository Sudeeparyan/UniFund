from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict
from app.services.data_loader import load_json, save_json
import uuid
import os
import base64
import json
import re
import io
from datetime import datetime

router = APIRouter()


@router.get("/transactions")
def get_transactions():
    return load_json("transactions.json")


class NewExpense(BaseModel):
    amount: float
    category: str
    merchant: Optional[str] = "Manual Entry"


@router.post("/transactions")
def add_transaction(expense: NewExpense):
    """Add a new expense transaction."""
    transactions = load_json("transactions.json")
    
    category_icons = {
        "coffee": "☕", "food": "🍕", "transport": "🚗",
        "groceries": "🛒", "entertainment": "🎮", "school": "📚",
        "shopping": "🛍️",
    }
    roasts = load_json("roasts.json")
    category_key = expense.category.lower()
    roast_list = roasts.get(category_key, roasts.get("shopping", []))
    import random
    roast = random.choice(roast_list) if roast_list else "Money well spent... or was it?"

    new_tx = {
        "id": f"tx-{uuid.uuid4().hex[:8]}",
        "merchant": expense.merchant,
        "icon": category_icons.get(category_key, "💸"),
        "category": category_key,
        "amount": expense.amount,
        "currency": "EUR",
        "date": datetime.now().isoformat(),
        "aiRoast": roast,
        "roastEmoji": "🤖",
        "type": "roast" if expense.amount > 15 else "neutral",
        "perkMissed": None,
    }
    transactions.insert(0, new_tx)
    save_json("transactions.json", transactions)
    return new_tx


@router.post("/expense/scan")
async def scan_receipt(file: UploadFile = File(...)):
    """
    OCR receipt scanning endpoint.
    Priority:
      1. Azure OpenAI Vision (gpt-4.1 with vision — uses AZURE_OPENAI_API_KEY)
      2. OpenAI GPT-4o Vision (if OPENAI_API_KEY is set)
      3. Local OCR via RapidOCR (fallback — no API key needed)
    Accepts image uploads (JPEG, PNG, WebP).
    """
    image_bytes = await file.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    # Determine MIME type
    content_type = file.content_type or "image/jpeg"
    if content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        content_type = "image/jpeg"

    vision_system_prompt = (
        "You are an expert receipt OCR system. Extract structured data from the receipt image. "
        "Return ONLY valid JSON with this exact schema:\n"
        '{"merchant": "Store Name", "date": "YYYY-MM-DD", '
        '"items": [{"name": "Item name", "price": 1.99}], '
        '"total": 10.50, "currency": "EUR"}\n'
        "Rules:\n"
        "- Extract EVERY line item with its exact price\n"
        "- The total should match the receipt total, not the sum of items\n"
        "- Use the actual store name from the receipt\n"
        "- If you cannot read something clearly, make your best guess\n"
        "- Always return valid JSON, nothing else."
    )

    vision_user_content = [
        {"type": "text", "text": "Extract all items, prices, merchant name, date, and total from this receipt image:"},
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:{content_type};base64,{image_b64}",
                "detail": "high",
            },
        },
    ]

    # ── Method 1: Azure OpenAI Vision (primary — uses existing Azure config) ──
    azure_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
    if azure_key:
        try:
            from openai import AzureOpenAI

            endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "https://cityupstart.cognitiveservices.azure.com/")
            api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
            model = os.environ.get("AI_MODEL", "gpt-4.1")

            client = AzureOpenAI(
                api_key=azure_key,
                azure_endpoint=endpoint,
                api_version=api_version,
            )

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": vision_system_prompt},
                    {"role": "user", "content": vision_user_content},
                ],
                max_tokens=1000,
                temperature=0.1,
            )

            raw = response.choices[0].message.content.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            parsed = json.loads(raw)

            parsed.setdefault("merchant", "Unknown Store")
            parsed.setdefault("date", datetime.now().strftime("%Y-%m-%d"))
            parsed.setdefault("items", [])
            parsed.setdefault("currency", "EUR")
            if "total" not in parsed:
                parsed["total"] = sum(item.get("price", 0) for item in parsed["items"])

            return {
                "success": True,
                "parsed": parsed,
                "message": f"Receipt scanned with Azure AI Vision ({model})",
                "method": "ai",
            }

        except Exception as e:
            print(f"Azure Vision scan failed: {e}, trying next method...")

    # ── Method 2: OpenAI GPT-4o Vision (if direct API key set) ──
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": vision_system_prompt},
                    {"role": "user", "content": vision_user_content},
                ],
                max_tokens=1000,
                temperature=0.1,
            )

            raw = response.choices[0].message.content.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            parsed = json.loads(raw)

            parsed.setdefault("merchant", "Unknown Store")
            parsed.setdefault("date", datetime.now().strftime("%Y-%m-%d"))
            parsed.setdefault("items", [])
            parsed.setdefault("currency", "EUR")
            if "total" not in parsed:
                parsed["total"] = sum(item.get("price", 0) for item in parsed["items"])

            return {
                "success": True,
                "parsed": parsed,
                "message": "Receipt scanned with AI Vision (GPT-4o)",
                "method": "ai",
            }

        except Exception as e:
            print(f"OpenAI Vision scan failed: {e}, falling back to local OCR")

    # ── Method 2: Local OCR via RapidOCR (no API key needed) ──
    try:
        parsed = _local_ocr_parse(image_bytes)
        if parsed and parsed.get("items"):
            return {
                "success": True,
                "parsed": parsed,
                "message": "Receipt scanned with local OCR (RapidOCR)",
                "method": "ocr",
            }
    except Exception as e:
        print(f"Local OCR failed: {e}")

    # Should never reach here, but just in case return an error
    return {
        "success": False,
        "parsed": None,
        "message": "Could not read the receipt. Please try a clearer image.",
        "method": "failed",
    }


def _local_ocr_parse(image_bytes: bytes) -> Dict:
    """
    Run local OCR on the image using RapidOCR, then parse the raw
    text lines into structured receipt data (merchant, date, items, total).
    """
    from rapidocr_onnxruntime import RapidOCR
    import numpy as np
    from PIL import Image

    # Load image as numpy array (RapidOCR accepts ndarray, bytes, str path)
    engine = RapidOCR()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(img)
    result, _ = engine(img_array)

    if not result:
        return {}

    # Extract text lines in reading order (RapidOCR returns [bbox, text, conf])
    lines: List[str] = [entry[1].strip() for entry in result if entry[1].strip()]
    print(f"[OCR] Extracted {len(lines)} text lines: {lines}")

    # ── Parse structured data from OCR lines ──
    merchant = ""
    date_str = datetime.now().strftime("%Y-%m-%d")
    items: List[Dict] = []
    total = 0.0
    currency = "EUR"

    # 1. Merchant name — first line (typically store name in caps)
    if lines:
        merchant = lines[0]

    # 2. Find date — look for DD/MM/YYYY or YYYY-MM-DD patterns
    date_pattern = re.compile(r"(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})")
    for line in lines:
        m = date_pattern.search(line)
        if m:
            raw_date = m.group(1)
            # Try to parse various formats
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y", "%Y/%m/%d"):
                try:
                    date_str = datetime.strptime(raw_date, fmt).strftime("%Y-%m-%d")
                    break
                except ValueError:
                    continue
            break

    # 3. Extract items and prices
    #    OCR can split lines in various ways:
    #    a) "Item Name            EUR 1.65"  (item + price on same line)
    #    b) "Item Name" / "EUR 1.65"         (item on line N, price on N+1)
    #    c) "Item Name" / "EUR" / "4.50"     (item on N, "EUR" on N+1, digits on N+2)
    price_pattern = re.compile(r"(?:EUR|€|eur)\s*(\d+[.,]\d{2})", re.IGNORECASE)
    standalone_price = re.compile(r"^(\d+[.,]\d{2})$")
    bare_currency = re.compile(r"^(?:EUR|€|eur)$", re.IGNORECASE)

    skip_keywords = [
        "TAX INVOICE", "INVOICE", "RECEIPT", "VISA", "MASTERCARD",
        "CONTACTLESS", "CARD", "CHANGE", "THANK", "RETAIN",
        "RETURN", "WELCOME", "ADDRESS", "TEL", "VAT", "****",
        "SUBTOTAL", "CASHIER",
    ]

    i = 0
    found_subtotal = False
    last_item_name = ""  # Track item name for multi-line price patterns

    while i < len(lines):
        line = lines[i]
        upper = line.upper().strip()

        # Stop extracting items when we hit SUBTOTAL / TOTAL section
        if any(kw in upper for kw in ["SUBTOTAL", "SUB TOTAL", "SUB-TOTAL"]):
            found_subtotal = True
            i += 1
            continue

        # Capture the TOTAL value
        if "TOTAL" in upper and "SUB" not in upper:
            pm = price_pattern.search(line)
            if pm:
                total = float(pm.group(1).replace(",", "."))
            elif i + 1 < len(lines):
                pm2 = price_pattern.search(lines[i + 1])
                if pm2:
                    total = float(pm2.group(1).replace(",", "."))
                    i += 1
                else:
                    sp = standalone_price.match(lines[i + 1].strip())
                    if sp:
                        total = float(sp.group(1).replace(",", "."))
                        i += 1
            i += 1
            continue

        # Skip non-item lines
        if any(kw in upper for kw in skip_keywords):
            i += 1
            continue

        # Skip time-only lines (HH:MM)
        if re.match(r"^\d{1,2}:\d{2}$", line.strip()):
            i += 1
            continue

        # Skip if we're past subtotal section
        if found_subtotal:
            i += 1
            continue

        # ── Case A: "Item Name  EUR 1.65" on same line ──
        pm = price_pattern.search(line)
        if pm:
            price = float(pm.group(1).replace(",", "."))
            item_name = price_pattern.sub("", line).strip().rstrip(" -–—")
            if item_name and item_name.upper() not in skip_keywords:
                items.append({"name": item_name, "price": price})
                last_item_name = ""
            i += 1
            continue

        # ── Check if this is a bare "EUR" (no number) — price follows on next line ──
        if bare_currency.match(line.strip()):
            # "EUR" alone — look for price on next line
            if last_item_name and i + 1 < len(lines):
                sp_next = standalone_price.match(lines[i + 1].strip())
                if sp_next:
                    price = float(sp_next.group(1).replace(",", "."))
                    items.append({"name": last_item_name, "price": price})
                    last_item_name = ""
                    i += 2
                    continue
            i += 1
            continue

        # ── Standalone price (just a number like "4.50") — attach to last item ──
        sp = standalone_price.match(line.strip())
        if sp and last_item_name:
            price = float(sp.group(1).replace(",", "."))
            items.append({"name": last_item_name, "price": price})
            last_item_name = ""
            i += 1
            continue

        # ── This looks like an item name — check next line(s) for price ──
        item_name = line.strip().strip(" -–—.")
        if item_name and item_name.upper() not in skip_keywords:
            if i + 1 < len(lines):
                next_line = lines[i + 1]

                # Case B: next line is "EUR X.XX"
                pm_next = price_pattern.search(next_line)
                if pm_next:
                    price = float(pm_next.group(1).replace(",", "."))
                    items.append({"name": item_name, "price": price})
                    last_item_name = ""
                    i += 2
                    continue

                # Case B2: next line is just "X.XX"
                sp_next = standalone_price.match(next_line.strip())
                if sp_next:
                    price = float(sp_next.group(1).replace(",", "."))
                    items.append({"name": item_name, "price": price})
                    last_item_name = ""
                    i += 2
                    continue

                # Case C: next line might be bare "EUR", price on line after
                if bare_currency.match(next_line.strip()) and i + 2 < len(lines):
                    sp_after = standalone_price.match(lines[i + 2].strip())
                    if sp_after:
                        price = float(sp_after.group(1).replace(",", "."))
                        items.append({"name": item_name, "price": price})
                        last_item_name = ""
                        i += 3
                        continue

            # Price not found yet — remember this item name for future lines
            last_item_name = item_name

        i += 1

    # If total wasn't found explicitly, compute from items
    if total == 0 and items:
        total = round(sum(itm["price"] for itm in items), 2)

    return {
        "merchant": merchant,
        "date": date_str,
        "items": items,
        "total": total,
        "currency": currency,
    }
