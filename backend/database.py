import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "store.db"
SEED_JSON_PATH = BASE_DIR.parent / "frontend" / "src" / "data" / "catalog.json"
BACKUP_JSON_PATH = BASE_DIR / "backup_catalog_v1.json"

PBKDF2_ITERATIONS = 200_000

VALID_ORDER_STATUSES = [
    "New",
    "Confirmed",
    "Preparing",
    "Ready",
    "Completed",
    "Cancelled",
]


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        parts = stored_hash.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_hex = parts[3]
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return hmac.compare_digest(dk.hex(), expected_hex)
    except Exception:
        return False


def validate_password_strength(password: str) -> Optional[str]:
    if len(password) < 6:
        return "Password must be at least 6 characters long."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9@#$%!^&*]", password):
        return "Password must contain both letters and numbers or special characters."
    return None


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def init_and_seed_db() -> None:
    conn = get_connection()
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS store_info (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            full_header_name TEXT NOT NULL,
            alias TEXT NOT NULL,
            reference_url TEXT NOT NULL,
            logo_url TEXT NOT NULL,
            banner_url TEXT NOT NULL,
            whatsapp_region_code TEXT NOT NULL,
            whatsapp_number TEXT NOT NULL,
            address TEXT NOT NULL,
            copyright TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS store_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            image TEXT NOT NULL,
            original_url TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            category_name TEXT NOT NULL,
            currency_icon TEXT NOT NULL DEFAULT '₹',
            selling_price REAL NOT NULL DEFAULT 0,
            original_price REAL,
            available_stock INTEGER NOT NULL DEFAULT 0,
            image TEXT NOT NULL,
            images_json TEXT NOT NULL DEFAULT '[]',
            description_html TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            is_featured INTEGER NOT NULL DEFAULT 0,
            original_url TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_code TEXT NOT NULL UNIQUE,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            region_code TEXT NOT NULL DEFAULT '91',
            customer_address TEXT NOT NULL,
            grand_total REAL NOT NULL,
            whatsapp_url TEXT NOT NULL,
            whatsapp_message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'New',
            completed_at TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            product_url TEXT NOT NULL,
            currency_icon TEXT NOT NULL DEFAULT '₹',
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            total_price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL DEFAULT '',
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'customer',
            is_active INTEGER NOT NULL DEFAULT 1,
            must_change_password INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            last_login_at TEXT
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """
    )

    # Ensure backward-compatible migration on orders table if created earlier
    cur.execute("PRAGMA table_info(orders)")
    existing_order_cols = {r["name"] for r in cur.fetchall()}
    if "status" not in existing_order_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'New'")
    if "completed_at" not in existing_order_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN completed_at TEXT")

    # Ensure default low_stock_threshold setting exists
    cur.execute("SELECT value FROM store_settings WHERE key = 'low_stock_threshold'")
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO store_settings (key, value) VALUES ('low_stock_threshold', '20')"
        )

    # Ensure initial administrator account exists
    admin_email = os.environ.get("ADMIN_INITIAL_EMAIL", "admin@gmail.com").strip().lower()
    admin_password = os.environ.get("ADMIN_INITIAL_PASSWORD", "admin@123")
    cur.execute("SELECT id FROM users WHERE LOWER(email) = ?", (admin_email,))
    if not cur.fetchone():
        now_iso = datetime.utcnow().isoformat() + "Z"
        cur.execute(
            """
            INSERT INTO users (
                name, email, phone, password_hash, role,
                is_active, must_change_password, created_at
            ) VALUES (?, ?, ?, ?, 'admin', 1, 1, ?)
            """,
            (
                "Store Administrator",
                admin_email,
                "9807654321",
                hash_password(admin_password),
                now_iso,
            ),
        )

    # Seed catalog if store_info or categories are empty (never overwrite existing admin edits!)
    cur.execute("SELECT COUNT(*) as cnt FROM categories")
    cat_count = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) as cnt FROM products")
    prod_count = cur.fetchone()["cnt"]

    if cat_count == 0 or prod_count == 0:
        if SEED_JSON_PATH.exists():
            with open(SEED_JSON_PATH, "r", encoding="utf-8") as f:
                seed_data = json.load(f)

            store = seed_data["store"]
            cur.execute("DELETE FROM store_info")
            cur.execute(
                """
                INSERT INTO store_info (
                    id, name, full_header_name, alias, reference_url,
                    logo_url, banner_url, whatsapp_region_code, whatsapp_number,
                    address, copyright
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    store["id"],
                    store["name"],
                    store["full_header_name"],
                    store["alias"],
                    store["reference_url"],
                    store["logo_url"],
                    store["banner_url"],
                    store["whatsapp_region_code"],
                    store["whatsapp_number"],
                    store["address"],
                    store["copyright"],
                ),
            )

            for idx, cat in enumerate(seed_data["categories"]):
                cur.execute(
                    """
                    INSERT OR IGNORE INTO categories (id, name, image, original_url, display_order)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (cat["id"], cat["name"], cat["image"], cat["original_url"], idx),
                )

            for idx, prod in enumerate(seed_data["products"]):
                cur.execute(
                    """
                    INSERT OR IGNORE INTO products (
                        id, name, category_id, category_name, currency_icon,
                        selling_price, original_price, available_stock, image,
                        images_json, description_html, description, is_featured,
                        original_url, display_order
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        prod["id"],
                        prod["name"],
                        prod["category_id"],
                        prod["category_name"],
                        prod.get("currency_icon", "₹"),
                        prod["selling_price"],
                        prod.get("original_price"),
                        prod.get("available_stock", 0),
                        prod["image"],
                        json.dumps(prod.get("images", [prod["image"]])),
                        prod.get("description_html", ""),
                        prod.get("description", ""),
                        1 if prod.get("is_featured") else 0,
                        prod["original_url"],
                        idx,
                    ),
                )
    else:
        # Ensure contact number is 9807654321 in store_info
        cur.execute("UPDATE store_info SET whatsapp_number = '9807654321'")

    conn.commit()
    conn.close()


def format_product_row(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["images"] = json.loads(d.pop("images_json", "[]"))
    d["is_featured"] = bool(d["is_featured"])
    if d["selling_price"] is not None and float(d["selling_price"]).is_integer():
        d["selling_price"] = int(d["selling_price"])
    if d["original_price"] is not None and float(d["original_price"]).is_integer():
        d["original_price"] = int(d["original_price"])
    return d


def format_user_row(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "must_change_password": bool(row["must_change_password"]),
        "created_at": row["created_at"],
        "last_login_at": row["last_login_at"],
    }


# ============================================================================
# AUTHENTICATION & SESSION HELPERS
# ============================================================================


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    init_and_seed_db()
    clean_email = str(email or "").strip().lower()
    if not clean_email or not password:
        raise ValueError("Please enter both email address and password.")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE LOWER(email) = ?", (clean_email,))
    user_row = cur.fetchone()

    if not user_row or not verify_password(password, user_row["password_hash"]):
        conn.close()
        raise ValueError("Invalid email or password. Please check your credentials and try again.")

    if not user_row["is_active"]:
        conn.close()
        raise ValueError("This account has been deactivated. Please contact the store administrator.")

    now_iso = datetime.utcnow().isoformat() + "Z"
    raw_token = secrets.token_urlsafe(32)
    token_digest = hash_token(raw_token)
    expires_iso = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"

    cur.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now_iso, user_row["id"]))
    cur.execute(
        """
        INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (token_digest, user_row["id"], expires_iso, now_iso),
    )
    conn.commit()

    cur.execute("SELECT * FROM users WHERE id = ?", (user_row["id"],))
    updated_user = format_user_row(cur.fetchone())
    conn.close()

    return {
        "token": raw_token,
        "user": updated_user,
    }


def register_customer(payload: Dict[str, Any]) -> Dict[str, Any]:
    init_and_seed_db()
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    phone = "".join(ch for ch in str(payload.get("phone", "")) if ch.isdigit())
    password = str(payload.get("password", ""))

    if not name or len(name) < 2:
        raise ValueError("Please enter your full name (at least 2 characters).")
    if not email or "@" not in email or "." not in email:
        raise ValueError("Please enter a valid email address.")
    pw_err = validate_password_strength(password)
    if pw_err:
        raise ValueError(pw_err)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
    if cur.fetchone():
        conn.close()
        raise ValueError("An account with this email address already exists. Please sign in.")

    now_iso = datetime.utcnow().isoformat() + "Z"
    cur.execute(
        """
        INSERT INTO users (
            name, email, phone, password_hash, role,
            is_active, must_change_password, created_at, last_login_at
        ) VALUES (?, ?, ?, ?, 'customer', 1, 0, ?, ?)
        """,
        (name, email, phone, hash_password(password), now_iso, now_iso),
    )
    user_id = cur.lastrowid

    raw_token = secrets.token_urlsafe(32)
    token_digest = hash_token(raw_token)
    expires_iso = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
    cur.execute(
        """
        INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (token_digest, user_id, expires_iso, now_iso),
    )
    conn.commit()

    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    new_user = format_user_row(cur.fetchone())
    conn.close()

    return {
        "token": raw_token,
        "user": new_user,
    }


def get_session_user(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    init_and_seed_db()
    token_digest = hash_token(token.strip())
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT u.*, s.expires_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
        """,
        (token_digest,),
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return None

    now_iso = datetime.utcnow().isoformat() + "Z"
    if row["expires_at"] < now_iso or not row["is_active"]:
        cur.execute("DELETE FROM sessions WHERE token_hash = ?", (token_digest,))
        conn.commit()
        conn.close()
        return None

    user = format_user_row(row)
    conn.close()
    return user


def logout_session(token: Optional[str]) -> Dict[str, Any]:
    if not token:
        return {"success": True}
    init_and_seed_db()
    token_digest = hash_token(token.strip())
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM sessions WHERE token_hash = ?", (token_digest,))
    conn.commit()
    conn.close()
    return {"success": True}


def require_admin(token: Optional[str]) -> Dict[str, Any]:
    user = get_session_user(token)
    if not user:
        raise PermissionError("Authentication required. Please log in.")
    if user["role"] != "admin":
        raise PermissionError("Access denied. Administrator privileges are required.")
    return user


# ============================================================================
# PUBLIC STOREFRONT QUERIES
# ============================================================================


def get_low_stock_threshold(conn: sqlite3.Connection) -> int:
    cur = conn.cursor()
    cur.execute("SELECT value FROM store_settings WHERE key = 'low_stock_threshold'")
    row = cur.fetchone()
    try:
        return max(1, int(row["value"])) if row else 20
    except Exception:
        return 20


def query_store_overview() -> Dict[str, Any]:
    init_and_seed_db()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM store_info LIMIT 1")
    store_row = cur.fetchone()
    store = dict(store_row) if store_row else {}

    cur.execute(
        """
        SELECT c.*, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.display_order ASC
        """
    )
    categories = [dict(r) for r in cur.fetchall()]

    cur.execute(
        """
        SELECT * FROM products
        WHERE is_featured = 1
        ORDER BY display_order ASC, id DESC
        """
    )
    featured_products = [format_product_row(r) for r in cur.fetchall()]

    cur.execute("SELECT COUNT(*) as total FROM products")
    total_products = cur.fetchone()["total"]

    threshold = get_low_stock_threshold(conn)
    conn.close()
    return {
        "store": store,
        "categories": categories,
        "featured_products": featured_products,
        "total_products": total_products,
        "low_stock_threshold": threshold,
    }


def query_categories() -> List[Dict[str, Any]]:
    init_and_seed_db()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT c.*, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.display_order ASC
        """
    )
    categories = [dict(r) for r in cur.fetchall()]
    conn.close()
    return categories


def query_products(
    category_id: Optional[int] = None,
    category_name: Optional[str] = None,
    search: Optional[str] = None,
    featured_only: bool = False,
    sort: str = "default",
) -> List[Dict[str, Any]]:
    init_and_seed_db()
    conn = get_connection()
    cur = conn.cursor()

    clauses = []
    params: List[Any] = []

    if category_id is not None:
        clauses.append("category_id = ?")
        params.append(category_id)
    if category_name:
        clauses.append("LOWER(category_name) = LOWER(?)")
        params.append(category_name.strip())
    if featured_only:
        clauses.append("is_featured = 1")
    if search and search.strip():
        q = f"%{search.strip().lower()}%"
        clauses.append(
            "(LOWER(name) LIKE ? OR LOWER(category_name) LIKE ? OR LOWER(description) LIKE ? OR CAST(id AS TEXT) LIKE ?)"
        )
        params.extend([q, q, q, q])

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    order_sql = "ORDER BY display_order ASC, id DESC"
    if sort == "price_asc":
        order_sql = "ORDER BY selling_price ASC, display_order ASC"
    elif sort == "price_desc":
        order_sql = "ORDER BY selling_price DESC, display_order ASC"
    elif sort == "name_asc":
        order_sql = "ORDER BY name ASC, display_order ASC"
    elif sort == "stock_asc":
        order_sql = "ORDER BY available_stock ASC, name ASC"
    elif sort == "stock_desc":
        order_sql = "ORDER BY available_stock DESC, name ASC"

    cur.execute(f"SELECT * FROM products {where_sql} {order_sql}", params)
    rows = [format_product_row(r) for r in cur.fetchall()]
    conn.close()
    return rows


def query_product_detail(product_id: int) -> Optional[Dict[str, Any]]:
    init_and_seed_db()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return None

    product = format_product_row(row)

    cur.execute(
        """
        SELECT * FROM products
        WHERE category_id = ? AND id != ?
        ORDER BY display_order ASC
        LIMIT 8
        """,
        (product["category_id"], product_id),
    )
    related = [format_product_row(r) for r in cur.fetchall()]

    if len(related) < 4:
        existing_ids = [product_id] + [r["id"] for r in related]
        placeholders = ",".join("?" for _ in existing_ids)
        cur.execute(
            f"""
            SELECT * FROM products
            WHERE id NOT IN ({placeholders})
            ORDER BY is_featured DESC, display_order ASC
            LIMIT ?
            """,
            (*existing_ids, 8 - len(related)),
        )
        related.extend([format_product_row(r) for r in cur.fetchall()])

    conn.close()
    return {
        "product": product,
        "related_products": related,
    }


def create_whatsapp_order(payload: Dict[str, Any]) -> Dict[str, Any]:
    init_and_seed_db()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM store_info LIMIT 1")
    store = dict(cur.fetchone())

    name = str(payload.get("name", "")).strip()
    phone = "".join(ch for ch in str(payload.get("phone", "")) if ch.isdigit())
    region_code = "".join(ch for ch in str(payload.get("region_code", "91")) if ch.isdigit()) or "91"
    address = str(payload.get("address", "")).strip()
    items_input = payload.get("items", [])
    initial_status = str(payload.get("status", "New")).strip()
    if initial_status not in VALID_ORDER_STATUSES:
        initial_status = "New"

    if not name or not phone or not address or not items_input:
        conn.close()
        raise ValueError("Name, WhatsApp number, delivery address, and at least one cart item are required.")

    cur.execute("SELECT COALESCE(MAX(id), 0) as max_id FROM orders")
    next_num = cur.fetchone()["max_id"] + 1
    order_code = f"ORD-{store['id']}-{1000 + next_num}"

    resolved_items = []
    grand_total = 0

    for item in items_input:
        pid = int(item["product_id"])
        qty = max(1, int(item.get("quantity", 1)))
        cur.execute("SELECT * FROM products WHERE id = ?", (pid,))
        prow = cur.fetchone()
        if not prow:
            continue
        p = format_product_row(prow)
        unit_price = p["selling_price"]
        total_price = unit_price * qty
        grand_total += total_price
        resolved_items.append(
            {
                "product_id": p["id"],
                "product_name": p["name"],
                "product_url": p["original_url"],
                "currency_icon": p["currency_icon"],
                "unit_price": unit_price,
                "quantity": qty,
                "total_price": total_price,
            }
        )

    if not resolved_items:
        conn.close()
        raise ValueError("No valid products found in order.")

    lines = [
        "Customer Details:",
        "------------------------------",
        f"Name: {name}",
        f"Phone: +{region_code} {phone}",
        f"Address: {address}",
        "",
        f"Order ID: {order_code}",
        "------------------------------",
        "Product Details:",
        "------------------------------",
    ]

    for idx, it in enumerate(resolved_items, start=1):
        lines.extend(
            [
                f"{idx}.",
                f"Product Name: {it['product_name']}",
                f"Product URL : {it['product_url']}",
                f"Price : {it['currency_icon']} {it['unit_price']}",
                f"Quantity : {it['quantity']}",
                f"Total Price : {it['currency_icon']} {it['total_price']}",
                "------------------------------",
            ]
        )

    lines.append("")
    lines.append(f"Grand Total: ₹ {grand_total}")
    whatsapp_message = "\n".join(lines)

    encoded_msg = quote(whatsapp_message)
    store_wp = f"+{store['whatsapp_region_code']}{store['whatsapp_number']}"
    whatsapp_url = f"https://wa.me/{store_wp}?text={encoded_msg}"
    created_at = datetime.utcnow().isoformat() + "Z"
    completed_at = created_at if initial_status == "Completed" else None

    cur.execute(
        """
        INSERT INTO orders (
            order_code, customer_name, customer_phone, region_code,
            customer_address, grand_total, whatsapp_url, whatsapp_message,
            status, completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            order_code,
            name,
            phone,
            region_code,
            address,
            grand_total,
            whatsapp_url,
            whatsapp_message,
            initial_status,
            completed_at,
            created_at,
        ),
    )
    order_db_id = cur.lastrowid

    for it in resolved_items:
        cur.execute(
            """
            INSERT INTO order_items (
                order_id, product_id, product_name, product_url,
                currency_icon, unit_price, quantity, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                order_db_id,
                it["product_id"],
                it["product_name"],
                it["product_url"],
                it["currency_icon"],
                it["unit_price"],
                it["quantity"],
                it["total_price"],
            ),
        )
        if initial_status == "Completed":
            cur.execute(
                "UPDATE products SET available_stock = MAX(0, available_stock - ?) WHERE id = ?",
                (it["quantity"], it["product_id"]),
            )

    conn.commit()
    conn.close()

    return {
        "id": order_db_id,
        "order_id": order_code,
        "name": name,
        "phone": phone,
        "region_code": region_code,
        "address": address,
        "grand_total": grand_total,
        "status": initial_status,
        "products": resolved_items,
        "whatsapp_message": whatsapp_message,
        "whatsapp_url": whatsapp_url,
        "store_whatsapp_number": f"+{store['whatsapp_region_code']} {store['whatsapp_number']}",
        "created_at": created_at,
    }


# ============================================================================
# ADMIN DASHBOARD OPERATIONS (PROTECTED)
# ============================================================================


def admin_get_dashboard_overview(
    token: str,
    date_range: str = "30d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    require_admin(token)
    conn = get_connection()
    cur = conn.cursor()

    now = datetime.utcnow()
    today_prefix = now.strftime("%Y-%m-%d")

    if date_range == "today":
        filter_start = today_prefix
        filter_end = today_prefix + "T23:59:59Z"
    elif date_range == "7d":
        filter_start = (now - timedelta(days=6)).strftime("%Y-%m-%d")
        filter_end = today_prefix + "T23:59:59Z"
    elif date_range == "30d":
        filter_start = (now - timedelta(days=29)).strftime("%Y-%m-%d")
        filter_end = today_prefix + "T23:59:59Z"
    elif date_range == "custom" and start_date:
        filter_start = start_date[:10]
        filter_end = (end_date[:10] if end_date else today_prefix) + "T23:59:59Z"
    else:
        filter_start = "2000-01-01"
        filter_end = "2099-12-31T23:59:59Z"

    # Fetch all orders in range
    cur.execute(
        """
        SELECT * FROM orders
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
        """,
        (filter_start, filter_end),
    )
    orders_in_range = [dict(r) for r in cur.fetchall()]

    # Verifiable sales income strictly from Completed orders
    verifiable_sales_income = sum(
        float(o["grand_total"]) for o in orders_in_range if o["status"] == "Completed"
    )
    completed_orders_count = sum(
        1 for o in orders_in_range if o["status"] == "Completed"
    )
    pending_bookings_value = sum(
        float(o["grand_total"])
        for o in orders_in_range
        if o["status"] in ("New", "Confirmed", "Preparing", "Ready")
    )
    total_orders_in_range = len(orders_in_range)

    # Orders received today
    cur.execute(
        "SELECT COUNT(*) as cnt FROM orders WHERE SUBSTR(created_at, 1, 10) = ?",
        (today_prefix,),
    )
    orders_today = cur.fetchone()["cnt"]

    # Product & Stock counts
    threshold = get_low_stock_threshold(conn)
    cur.execute("SELECT COUNT(*) as cnt FROM products")
    total_products = cur.fetchone()["cnt"]

    cur.execute(
        "SELECT COUNT(*) as cnt FROM products WHERE available_stock <= ?",
        (threshold,),
    )
    low_stock_count = cur.fetchone()["cnt"]

    cur.execute("SELECT COUNT(*) as cnt FROM products WHERE available_stock <= 0")
    out_of_stock_count = cur.fetchone()["cnt"]

    # Build daily time-series for chart
    if date_range == "today":
        days_list = [today_prefix]
    elif date_range == "7d":
        days_list = [
            (now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)
        ]
    elif date_range == "custom" and start_date and end_date:
        try:
            s_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
            e_dt = datetime.strptime(end_date[:10], "%Y-%m-%d")
            delta_days = min(60, max(0, (e_dt - s_dt).days))
            days_list = [
                (s_dt + timedelta(days=i)).strftime("%Y-%m-%d")
                for i in range(delta_days + 1)
            ]
        except Exception:
            days_list = [today_prefix]
    else:
        days_list = [
            (now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(13, -1, -1)
        ]

    daily_map: Dict[str, Dict[str, Any]] = {
        d: {"date": d, "sales_income": 0, "completed_orders": 0, "total_bookings": 0}
        for d in days_list
    }

    for o in orders_in_range:
        day_str = str(o["created_at"])[:10]
        if day_str not in daily_map:
            daily_map[day_str] = {
                "date": day_str,
                "sales_income": 0,
                "completed_orders": 0,
                "total_bookings": 0,
            }
        daily_map[day_str]["total_bookings"] += 1
        if o["status"] == "Completed":
            daily_map[day_str]["sales_income"] += float(o["grand_total"])
            daily_map[day_str]["completed_orders"] += 1

    trend_series = [daily_map[k] for k in sorted(daily_map.keys())]

    # Best-selling products from Completed orders in range
    cur.execute(
        """
        SELECT
            oi.product_id,
            oi.product_name,
            SUM(oi.quantity) as units_sold,
            SUM(oi.total_price) as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'Completed'
          AND o.created_at >= ? AND o.created_at <= ?
        GROUP BY oi.product_id, oi.product_name
        ORDER BY units_sold DESC, revenue DESC
        LIMIT 6
        """,
        (filter_start, filter_end),
    )
    best_selling = [
        {
            "product_id": r["product_id"],
            "product_name": r["product_name"],
            "units_sold": int(r["units_sold"]),
            "revenue": int(r["revenue"]) if float(r["revenue"]).is_integer() else float(r["revenue"]),
        }
        for r in cur.fetchall()
    ]

    # Also compute most-requested products across all bookings (for visibility when completed sales = 0)
    cur.execute(
        """
        SELECT
            oi.product_id,
            oi.product_name,
            SUM(oi.quantity) as units_requested,
            SUM(oi.total_price) as booking_value
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'Cancelled'
          AND o.created_at >= ? AND o.created_at <= ?
        GROUP BY oi.product_id, oi.product_name
        ORDER BY units_requested DESC
        LIMIT 6
        """,
        (filter_start, filter_end),
    )
    most_requested = [
        {
            "product_id": r["product_id"],
            "product_name": r["product_name"],
            "units_requested": int(r["units_requested"]),
            "booking_value": int(r["booking_value"]) if float(r["booking_value"]).is_integer() else float(r["booking_value"]),
        }
        for r in cur.fetchall()
    ]

    # Status breakdown
    status_counts = {s: 0 for s in VALID_ORDER_STATUSES}
    for o in orders_in_range:
        st = o["status"] if o["status"] in status_counts else "New"
        status_counts[st] += 1

    conn.close()
    return {
        "summary": {
            "verifiable_sales_income": int(verifiable_sales_income)
            if float(verifiable_sales_income).is_integer()
            else verifiable_sales_income,
            "completed_orders_count": completed_orders_count,
            "pending_bookings_value": int(pending_bookings_value)
            if float(pending_bookings_value).is_integer()
            else pending_bookings_value,
            "total_orders": total_orders_in_range,
            "orders_today": orders_today,
            "total_products": total_products,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "low_stock_threshold": threshold,
        },
        "trend_series": trend_series,
        "best_selling_products": best_selling,
        "most_requested_products": most_requested,
        "status_breakdown": status_counts,
    }


def admin_create_product(token: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    require_admin(token)
    name = str(payload.get("name", "")).strip()
    category_id = int(payload.get("category_id", 0))
    selling_price = float(payload.get("selling_price", -1))
    original_price_raw = payload.get("original_price")
    original_price = (
        float(original_price_raw)
        if original_price_raw not in (None, "", 0, "0")
        else None
    )
    available_stock = int(payload.get("available_stock", 0))
    description = str(payload.get("description", "")).strip()
    image = str(payload.get("image", "")).strip()
    is_featured = bool(payload.get("is_featured", False))

    if not name:
        raise ValueError("Product name is required.")
    if selling_price < 0:
        raise ValueError("Selling price must be 0 or greater.")
    if available_stock < 0:
        raise ValueError("Available stock cannot be negative.")
    if not image:
        raise ValueError("Product image is required.")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
    cat_row = cur.fetchone()
    if not cat_row:
        conn.close()
        raise ValueError("Please select a valid existing product category.")

    cur.execute("SELECT COALESCE(MAX(id), 11515) as max_id, COALESCE(MAX(display_order), 50) as max_ord FROM products")
    meta = cur.fetchone()
    new_id = int(meta["max_id"]) + 1
    new_ord = int(meta["max_ord"]) + 1

    cur.execute("SELECT reference_url FROM store_info LIMIT 1")
    s_row = cur.fetchone()
    base_url = s_row["reference_url"] if s_row else "https://mybusinessweb.in/whatsapp-store/the-creative-castles-&-choco-delights-kovvur"
    original_url = f"{base_url}/{new_id}/product-details"

    desc_html = "".join(f"<p>{line}</p>" for line in description.split("\n") if line.strip())
    images_list = payload.get("images") if isinstance(payload.get("images"), list) and payload.get("images") else [image]

    cur.execute(
        """
        INSERT INTO products (
            id, name, category_id, category_name, currency_icon,
            selling_price, original_price, available_stock, image,
            images_json, description_html, description, is_featured,
            original_url, display_order
        ) VALUES (?, ?, ?, ?, '₹', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            new_id,
            name,
            cat_row["id"],
            cat_row["name"],
            selling_price,
            original_price,
            available_stock,
            image,
            json.dumps(images_list),
            desc_html,
            description,
            1 if is_featured else 0,
            original_url,
            new_ord,
        ),
    )
    conn.commit()

    cur.execute("SELECT * FROM products WHERE id = ?", (new_id,))
    created = format_product_row(cur.fetchone())
    conn.close()
    return created


def admin_update_product(token: str, product_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    require_admin(token)
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    existing = cur.fetchone()
    if not existing:
        conn.close()
        raise ValueError("Product not found.")

    name = str(payload.get("name", existing["name"])).strip()
    category_id = int(payload.get("category_id", existing["category_id"]))
    selling_price = float(payload.get("selling_price", existing["selling_price"]))

    if "original_price" in payload:
        orig_raw = payload.get("original_price")
        original_price = float(orig_raw) if orig_raw not in (None, "", 0, "0") else None
    else:
        original_price = existing["original_price"]

    available_stock = int(payload.get("available_stock", existing["available_stock"]))
    description = str(payload.get("description", existing["description"])).strip()
    image = str(payload.get("image", existing["image"])).strip()
    is_featured = (
        bool(payload["is_featured"])
        if "is_featured" in payload
        else bool(existing["is_featured"])
    )

    if not name:
        conn.close()
        raise ValueError("Product name cannot be empty.")
    if selling_price < 0:
        conn.close()
        raise ValueError("Selling price must be 0 or greater.")
    if available_stock < 0:
        conn.close()
        raise ValueError("Stock quantity cannot be negative.")
    if not image:
        conn.close()
        raise ValueError("Product image is required.")

    cur.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
    cat_row = cur.fetchone()
    if not cat_row:
        conn.close()
        raise ValueError("Selected category does not exist.")

    existing_images = json.loads(existing["images_json"] or "[]")
    if image != existing["image"]:
        images_list = [image] + [img for img in existing_images if img != image]
    else:
        images_list = existing_images if existing_images else [image]

    desc_html = "".join(f"<p>{line}</p>" for line in description.split("\n") if line.strip())

    cur.execute(
        """
        UPDATE products
        SET name = ?,
            category_id = ?,
            category_name = ?,
            selling_price = ?,
            original_price = ?,
            available_stock = ?,
            image = ?,
            images_json = ?,
            description = ?,
            description_html = ?,
            is_featured = ?
        WHERE id = ?
        """,
        (
            name,
            cat_row["id"],
            cat_row["name"],
            selling_price,
            original_price,
            available_stock,
            image,
            json.dumps(images_list),
            description,
            desc_html,
            1 if is_featured else 0,
            product_id,
        ),
    )
    conn.commit()

    cur.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    updated = format_product_row(cur.fetchone())
    conn.close()
    return updated


def admin_delete_product(token: str, product_id: int) -> Dict[str, Any]:
    require_admin(token)
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, name FROM products WHERE id = ?", (product_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise ValueError("Product not found.")

    cur.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    return {"deleted_id": product_id, "name": row["name"]}


def admin_update_stock(token: str, product_id: int, available_stock: int) -> Dict[str, Any]:
    require_admin(token)
    stock_val = int(available_stock)
    if stock_val < 0:
        raise ValueError("Stock quantity cannot be negative.")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM products WHERE id = ?", (product_id,))
    if not cur.fetchone():
        conn.close()
        raise ValueError("Product not found.")

    cur.execute(
        "UPDATE products SET available_stock = ? WHERE id = ?",
        (stock_val, product_id),
    )
    conn.commit()
    cur.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    updated = format_product_row(cur.fetchone())
    conn.close()
    return updated


def admin_update_low_stock_threshold(token: str, threshold: int) -> Dict[str, Any]:
    require_admin(token)
    val = max(1, int(threshold))
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO store_settings (key, value) VALUES ('low_stock_threshold', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """,
        (str(val),),
    )
    conn.commit()
    conn.close()
    return {"low_stock_threshold": val}


def admin_list_orders(token: str, status_filter: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    require_admin(token)
    conn = get_connection()
    cur = conn.cursor()

    clauses = []
    params: List[Any] = []
    if status_filter and status_filter != "All":
        clauses.append("status = ?")
        params.append(status_filter)
    if search and search.strip():
        q = f"%{search.strip().lower()}%"
        clauses.append(
            "(LOWER(customer_name) LIKE ? OR LOWER(customer_phone) LIKE ? OR LOWER(order_code) LIKE ? OR LOWER(customer_address) LIKE ?)"
        )
        params.extend([q, q, q, q])

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    cur.execute(f"SELECT * FROM orders {where_sql} ORDER BY id DESC", params)
    orders_rows = [dict(r) for r in cur.fetchall()]

    for o in orders_rows:
        cur.execute("SELECT * FROM order_items WHERE order_id = ?", (o["id"],))
        items = [dict(ir) for ir in cur.fetchall()]
        o["items"] = items
        if float(o["grand_total"]).is_integer():
            o["grand_total"] = int(o["grand_total"])

        # Direct link to contact customer on WhatsApp with prefilled booking reference
        clean_phone = "".join(ch for ch in str(o["customer_phone"]) if ch.isdigit())
        clean_region = "".join(ch for ch in str(o.get("region_code") or "91") if ch.isdigit()) or "91"
        if clean_phone:
            item_summary = ", ".join(f"{it['product_name']} (x{it['quantity']})" for it in items)
            msg = (
                f"Hello {o['customer_name']},\n"
                f"Greetings from The Creative Castles & Choco Delights Kovvur!\n\n"
                f"Regarding your WhatsApp Booking {o['order_code']} (Status: {o['status']}):\n"
                f"Items: {item_summary}\n"
                f"Total Amount: ₹{o['grand_total']}\n"
                f"Delivery Address: {o['customer_address']}\n\n"
                f"Please share your customization photos/names or confirm your order details."
            )
            o["customer_whatsapp_link"] = f"https://wa.me/+{clean_region}{clean_phone}?text={quote(msg)}"
        else:
            o["customer_whatsapp_link"] = ""

    conn.close()
    return orders_rows


def admin_update_order_status(token: str, order_id: int, new_status: str) -> Dict[str, Any]:
    require_admin(token)
    if new_status not in VALID_ORDER_STATUSES:
        raise ValueError(f"Invalid status. Allowed values: {', '.join(VALID_ORDER_STATUSES)}")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    order_row = cur.fetchone()
    if not order_row:
        conn.close()
        raise ValueError("Booking record not found.")

    old_status = order_row["status"]
    now_iso = datetime.utcnow().isoformat() + "Z"
    completed_at = now_iso if new_status == "Completed" else (None if new_status != "Completed" else order_row["completed_at"])

    # If transitioning into Completed for the first time, deduct product stock
    if old_status != "Completed" and new_status == "Completed":
        cur.execute("SELECT product_id, quantity FROM order_items WHERE order_id = ?", (order_id,))
        for item in cur.fetchall():
            cur.execute(
                "UPDATE products SET available_stock = MAX(0, available_stock - ?) WHERE id = ?",
                (item["quantity"], item["product_id"]),
            )
    elif old_status == "Completed" and new_status != "Completed":
        # Restore stock if unmarked from Completed
        cur.execute("SELECT product_id, quantity FROM order_items WHERE order_id = ?", (order_id,))
        for item in cur.fetchall():
            cur.execute(
                "UPDATE products SET available_stock = available_stock + ? WHERE id = ?",
                (item["quantity"], item["product_id"]),
            )

    cur.execute(
        "UPDATE orders SET status = ?, completed_at = ? WHERE id = ?",
        (new_status, completed_at, order_id),
    )
    conn.commit()
    conn.close()

    updated_list = admin_list_orders(token)
    for o in updated_list:
        if o["id"] == order_id:
            return o
    raise ValueError("Order updated but could not be reloaded.")


def admin_delete_order(token: str, order_id: int) -> Dict[str, Any]:
    require_admin(token)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, order_code FROM orders WHERE id = ?", (order_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise ValueError("Booking not found.")
    cur.execute("DELETE FROM order_items WHERE order_id = ?", (order_id,))
    cur.execute("DELETE FROM orders WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()
    return {"deleted_id": order_id, "order_code": row["order_code"]}


def admin_list_users(token: str, search: Optional[str] = None) -> List[Dict[str, Any]]:
    require_admin(token)
    conn = get_connection()
    cur = conn.cursor()

    if search and search.strip():
        q = f"%{search.strip().lower()}%"
        cur.execute(
            "SELECT * FROM users WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? ORDER BY id ASC",
            (q, q),
        )
    else:
        cur.execute("SELECT * FROM users ORDER BY id ASC")

    users = [format_user_row(r) for r in cur.fetchall()]
    conn.close()
    return users


def admin_update_user_status_or_role(
    token: str,
    target_user_id: int,
    is_active: Optional[bool] = None,
    role: Optional[str] = None,
) -> Dict[str, Any]:
    current_admin = require_admin(token)
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE id = ?", (target_user_id,))
    target = cur.fetchone()
    if not target:
        conn.close()
        raise ValueError("User account not found.")

    new_active = bool(target["is_active"]) if is_active is None else bool(is_active)
    new_role = target["role"] if role is None else str(role).strip().lower()
    if new_role not in ("admin", "customer"):
        conn.close()
        raise ValueError("Invalid role. Must be 'admin' or 'customer'.")

    # Prevent deactivating or demoting the last active administrator
    if target["role"] == "admin" and (not new_active or new_role != "admin"):
        cur.execute(
            "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = 1 AND id != ?",
            (target_user_id,),
        )
        other_active_admins = cur.fetchone()["cnt"]
        if other_active_admins == 0:
            conn.close()
            raise ValueError(
                "Cannot deactivate or remove administrator role from the last active administrator account."
            )

    if target_user_id == current_admin["id"] and not new_active:
        conn.close()
        raise ValueError("You cannot deactivate your own currently logged-in administrator account.")

    cur.execute(
        "UPDATE users SET is_active = ?, role = ? WHERE id = ?",
        (1 if new_active else 0, new_role, target_user_id),
    )
    if not new_active:
        cur.execute("DELETE FROM sessions WHERE user_id = ?", (target_user_id,))

    conn.commit()
    cur.execute("SELECT * FROM users WHERE id = ?", (target_user_id,))
    updated_user = format_user_row(cur.fetchone())
    conn.close()
    return updated_user


def admin_update_profile(token: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    current_admin = require_admin(token)
    name = str(payload.get("name", current_admin["name"])).strip()
    email = str(payload.get("email", current_admin["email"])).strip().lower()
    phone = "".join(ch for ch in str(payload.get("phone", current_admin.get("phone", ""))) if ch.isdigit())

    if not name or len(name) < 2:
        raise ValueError("Name must be at least 2 characters.")
    if not email or "@" not in email:
        raise ValueError("Please provide a valid email address.")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM users WHERE LOWER(email) = ? AND id != ?",
        (email, current_admin["id"]),
    )
    if cur.fetchone():
        conn.close()
        raise ValueError("Another user is already registered with this email address.")

    cur.execute(
        "UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?",
        (name, email, phone, current_admin["id"]),
    )
    conn.commit()
    cur.execute("SELECT * FROM users WHERE id = ?", (current_admin["id"],))
    updated = format_user_row(cur.fetchone())
    conn.close()
    return updated


def admin_change_password(
    token: str,
    current_password: str,
    new_password: str,
) -> Dict[str, Any]:
    current_user = get_session_user(token)
    if not current_user:
        raise PermissionError("Authentication required.")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],))
    user_row = cur.fetchone()

    if not user_row or not verify_password(current_password, user_row["password_hash"]):
        conn.close()
        raise ValueError("Current password is incorrect.")

    strength_err = validate_password_strength(new_password)
    if strength_err:
        conn.close()
        raise ValueError(strength_err)

    if current_password == new_password:
        conn.close()
        raise ValueError("New password must be different from the current password.")

    cur.execute(
        "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
        (hash_password(new_password), current_user["id"]),
    )
    conn.commit()
    cur.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],))
    updated = format_user_row(cur.fetchone())
    conn.close()
    return updated
