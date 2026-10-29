from contextlib import asynccontextmanager
import json
import sys
from typing import Optional

# Ensure standard output and error streams support UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from database import (
    admin_change_password,
    admin_create_product,
    admin_delete_order,
    admin_delete_product,
    admin_get_dashboard_overview,
    admin_list_orders,
    admin_list_users,
    admin_update_low_stock_threshold,
    admin_update_order_status,
    admin_update_product,
    admin_update_profile,
    admin_update_stock,
    admin_update_user_status_or_role,
    authenticate_user,
    create_whatsapp_order,
    get_session_user,
    init_and_seed_db,
    logout_session,
    query_categories,
    query_product_detail,
    query_products,
    query_store_overview,
    register_customer,
)

try:
    from fastapi import FastAPI, Header, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from schemas import (
        ChangePasswordRequest,
        CreateOrderRequest,
        LoginRequest,
        OrderStatusUpdateRequest,
        ProductUpsertRequest,
        ProfileUpdateRequest,
        RegisterRequest,
        StockUpdateRequest,
        ThresholdUpdateRequest,
        UserUpdateRequest,
    )

    @asynccontextmanager
    async def lifespan(app_instance: FastAPI):
        init_and_seed_db()
        yield

    app = FastAPI(
        title="The Creative Castles & Choco Delights API",
        description="FastAPI + SQLite backend for e-commerce storefront and administrative dashboard.",
        version="2.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def extract_bearer(authorization: Optional[str]) -> str:
        if not authorization:
            return ""
        return authorization.replace("Bearer ", "").strip()

    @app.get("/api/store")
    def get_store_overview():
        return query_store_overview()

    @app.get("/api/categories")
    def get_categories():
        return {"categories": query_categories()}

    @app.get("/api/products")
    def get_products(
        category_id: Optional[int] = Query(default=None),
        category_name: Optional[str] = Query(default=None),
        search: Optional[str] = Query(default=None),
        featured: bool = Query(default=False),
        sort: str = Query(default="default"),
    ):
        products = query_products(
            category_id=category_id,
            category_name=category_name,
            search=search,
            featured_only=featured,
            sort=sort,
        )
        return {"products": products, "total": len(products)}

    @app.get("/api/products/{product_id}")
    def get_product(product_id: int):
        detail = query_product_detail(product_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Product not found")
        return detail

    @app.post("/api/orders")
    def create_order(order_req: CreateOrderRequest):
        try:
            result = create_whatsapp_order(order_req.model_dump())
            return {"success": True, "data": result}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    # Auth Endpoints
    @app.post("/api/auth/login")
    def login(req: LoginRequest):
        try:
            return authenticate_user(req.email, req.password)
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc))

    @app.post("/api/auth/register")
    def register(req: RegisterRequest):
        try:
            return register_customer(req.model_dump())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.get("/api/auth/me")
    def me(authorization: Optional[str] = Header(default=None)):
        user = get_session_user(extract_bearer(authorization))
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {"user": user}

    @app.post("/api/auth/logout")
    def logout(authorization: Optional[str] = Header(default=None)):
        return logout_session(extract_bearer(authorization))

    @app.post("/api/auth/change-password")
    def change_pw(
        req: ChangePasswordRequest,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            user = admin_change_password(
                extract_bearer(authorization),
                req.current_password,
                req.new_password,
            )
            return {"success": True, "user": user}
        except PermissionError as exc:
            raise HTTPException(status_code=401, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    # Admin Endpoints
    @app.get("/api/admin/overview")
    def admin_overview(
        range: str = Query(default="30d"),
        start_date: Optional[str] = Query(default=None),
        end_date: Optional[str] = Query(default=None),
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            return admin_get_dashboard_overview(
                extract_bearer(authorization), range, start_date, end_date
            )
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))

    @app.post("/api/admin/products")
    def create_prod(
        req: ProductUpsertRequest,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            prod = admin_create_product(
                extract_bearer(authorization), req.model_dump()
            )
            return {"success": True, "product": prod}
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.put("/api/admin/products/{product_id}")
    def update_prod(
        product_id: int,
        req: ProductUpsertRequest,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            prod = admin_update_product(
                extract_bearer(authorization), product_id, req.model_dump()
            )
            return {"success": True, "product": prod}
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.delete("/api/admin/products/{product_id}")
    def delete_prod(
        product_id: int,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            res = admin_delete_product(extract_bearer(authorization), product_id)
            return {"success": True, **res}
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.patch("/api/admin/products/{product_id}/stock")
    def patch_stock(
        product_id: int,
        req: StockUpdateRequest,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            prod = admin_update_stock(
                extract_bearer(authorization), product_id, req.available_stock
            )
            return {"success": True, "product": prod}
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.put("/api/admin/settings/threshold")
    def update_threshold(
        req: ThresholdUpdateRequest,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            return admin_update_low_stock_threshold(
                extract_bearer(authorization), req.low_stock_threshold
            )
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))

    @app.get("/api/admin/orders")
    def list_orders(
        status: Optional[str] = Query(default=None),
        search: Optional[str] = Query(default=None),
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            return {
                "orders": admin_list_orders(
                    extract_bearer(authorization), status, search
                )
            }
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))

    @app.patch("/api/admin/orders/{order_id}/status")
    def patch_order_status(
        order_id: int,
        req: OrderStatusUpdateRequest,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            order = admin_update_order_status(
                extract_bearer(authorization), order_id, req.status
            )
            return {"success": True, "order": order}
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.delete("/api/admin/orders/{order_id}")
    def remove_order(
        order_id: int,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            res = admin_delete_order(extract_bearer(authorization), order_id)
            return {"success": True, **res}
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.get("/api/admin/users")
    def list_users(
        search: Optional[str] = Query(default=None),
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            return {
                "users": admin_list_users(extract_bearer(authorization), search)
            }
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))

    @app.patch("/api/admin/users/{user_id}")
    def patch_user(
        user_id: int,
        req: UserUpdateRequest,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            user = admin_update_user_status_or_role(
                extract_bearer(authorization),
                user_id,
                req.is_active,
                req.role,
            )
            return {"success": True, "user": user}
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.put("/api/admin/profile")
    def put_profile(
        req: ProfileUpdateRequest,
        authorization: Optional[str] = Header(default=None),
    ):
        try:
            user = admin_update_profile(
                extract_bearer(authorization), req.model_dump()
            )
            return {"success": True, "user": user}
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

except ImportError:
    app = None


def handle_cli() -> None:
    init_and_seed_db()
    if len(sys.argv) < 3 or sys.argv[1] != "--cli":
        print(json.dumps({"status": "seeded", "db": "backend/store.db"}))
        return

    action = sys.argv[2]
    arg_json = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    token = arg_json.get("_token", "")

    try:
        if action == "store":
            out = query_store_overview()
        elif action == "categories":
            out = {"categories": query_categories()}
        elif action == "products":
            prods = query_products(
                category_id=arg_json.get("category_id"),
                category_name=arg_json.get("category_name"),
                search=arg_json.get("search"),
                featured_only=bool(arg_json.get("featured", False)),
                sort=arg_json.get("sort", "default"),
            )
            out = {"products": prods, "total": len(prods)}
        elif action == "product_detail":
            detail = query_product_detail(int(arg_json["product_id"]))
            if not detail:
                print(json.dumps({"error": "Product not found", "status": 404}))
                return
            out = detail
        elif action == "create_order":
            result = create_whatsapp_order(arg_json)
            out = {"success": True, "data": result}

        # Auth actions
        elif action == "auth_login":
            out = authenticate_user(
                arg_json.get("email", ""), arg_json.get("password", "")
            )
        elif action == "auth_register":
            out = register_customer(arg_json)
        elif action == "auth_me":
            user = get_session_user(token)
            if not user:
                print(json.dumps({"error": "Not authenticated", "status": 401}))
                return
            out = {"user": user}
        elif action == "auth_logout":
            out = logout_session(token)
        elif action == "auth_change_password":
            user = admin_change_password(
                token,
                arg_json.get("current_password", ""),
                arg_json.get("new_password", ""),
            )
            out = {"success": True, "user": user}

        # Admin actions
        elif action == "admin_overview":
            out = admin_get_dashboard_overview(
                token,
                arg_json.get("range", "30d"),
                arg_json.get("start_date"),
                arg_json.get("end_date"),
            )
        elif action == "admin_create_product":
            prod = admin_create_product(token, arg_json)
            out = {"success": True, "product": prod}
        elif action == "admin_update_product":
            prod = admin_update_product(
                token, int(arg_json["product_id"]), arg_json
            )
            out = {"success": True, "product": prod}
        elif action == "admin_delete_product":
            res = admin_delete_product(token, int(arg_json["product_id"]))
            out = {"success": True, **res}
        elif action == "admin_update_stock":
            prod = admin_update_stock(
                token,
                int(arg_json["product_id"]),
                int(arg_json["available_stock"]),
            )
            out = {"success": True, "product": prod}
        elif action == "admin_update_threshold":
            res = admin_update_low_stock_threshold(
                token, int(arg_json["low_stock_threshold"])
            )
            out = {"success": True, **res}
        elif action == "admin_list_orders":
            orders = admin_list_orders(
                token, arg_json.get("status"), arg_json.get("search")
            )
            out = {"orders": orders}
        elif action == "admin_update_order_status":
            order = admin_update_order_status(
                token, int(arg_json["order_id"]), str(arg_json["status"])
            )
            out = {"success": True, "order": order}
        elif action == "admin_delete_order":
            res = admin_delete_order(token, int(arg_json["order_id"]))
            out = {"success": True, **res}
        elif action == "admin_list_users":
            users = admin_list_users(token, arg_json.get("search"))
            out = {"users": users}
        elif action == "admin_update_user":
            user = admin_update_user_status_or_role(
                token,
                int(arg_json["user_id"]),
                arg_json.get("is_active"),
                arg_json.get("role"),
            )
            out = {"success": True, "user": user}
        elif action == "admin_update_profile":
            user = admin_update_profile(token, arg_json)
            out = {"success": True, "user": user}
        else:
            out = {"error": f"Unknown action: {action}", "status": 400}

        print(json.dumps(out, ensure_ascii=False))
    except PermissionError as exc:
        print(json.dumps({"error": str(exc), "status": 403}, ensure_ascii=False))
    except ValueError as exc:
        print(json.dumps({"error": str(exc), "status": 400}, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"error": str(exc), "status": 500}, ensure_ascii=False))


if __name__ == "__main__":
    handle_cli()
