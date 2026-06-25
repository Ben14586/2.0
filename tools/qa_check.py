from __future__ import annotations

import json
import py_compile
import re
import sqlite3
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "database.db"
INDEX_PATH = ROOT / "index.html"
ADMIN_PATH = ROOT / "admin.html"
SERVER_PATH = ROOT / "server.py"
PACKAGE_JSON_PATH = ROOT / "package.json"
FEATURES_PATH = ROOT / "components" / "blocks" / "features-10.tsx"
RUNTIME_CONFIG_PATH = ROOT / "runtime-config.js"
RENDER_PATH = ROOT / "render.yaml"
RAILWAY_PATH = ROOT / "railway.json"
DOCKERFILE_PATH = ROOT / "Dockerfile"
PROCFILE_PATH = ROOT / "Procfile"
ENV_EXAMPLE_PATH = ROOT / ".env.example"
SMOKE_TEST_PATH = ROOT / "tools" / "smoke_test.py"
EXPORT_STATIC_PATH = ROOT / "tools" / "export_static.py"
EXPORT_EXCEL_PATH = ROOT / "tools" / "export_excel.py"
SYNC_MEDIA_PATH = ROOT / "tools" / "sync_game_media.py"
CACHE_MEDIA_PATH = ROOT / "tools" / "cache_game_media.py"
PACKAGE_BACKEND_PATH = ROOT / "tools" / "package_backend.py"
CONFIGURE_BACKEND_PATH = ROOT / "tools" / "configure_backend.py"
CONFIGURE_SITE_PATH = ROOT / "tools" / "configure_site_origin.py"
PHASE3_PREFLIGHT_PATH = ROOT / "tools" / "phase3_preflight.py"
GO_LIVE_STATUS_PATH = ROOT / "tools" / "write_go_live_status.py"
GO_LIVE_CONNECT_PATH = ROOT / "tools" / "go_live_connect.py"
STEP2_PREPARE_PATH = ROOT / "tools" / "prepare_step2_release.py"
MANAGE_TOKENS_PATH = ROOT / "tools" / "manage_tokens.py"
PHASE3_BUILD_PATH = ROOT / "tools" / "phase3_build.py"
PHASE4_UAT_PATH = ROOT / "tools" / "phase4_order_uat.py"
BUILD_FRONTEND_PATH = ROOT / "tools" / "build_frontend.py"
SECURITY_AUDIT_PATH = ROOT / "tools" / "security_audit.py"
PRODUCTION_ENV_EXAMPLE_PATH = ROOT / "production.env.example"
PHASE3_RUNBOOK_PATH = ROOT / "docs" / "phase3-go-live-runbook.md"
PHASE4_RUNBOOK_PATH = ROOT / "docs" / "phase4-uat-and-hardening.md"
BACKEND_DEPLOY_CHECKLIST_PATH = ROOT / "docs" / "backend-deploy-checklist.md"
TOKEN_SYSTEM_DOC_PATH = ROOT / "docs" / "token-system.md"
STEP2_PLAN_PATH = ROOT / "docs" / "step2-backend-online-plan.md"
TELEGRAM_DOC_PATH = ROOT / "docs" / "telegram-bot-ops.md"
ZIP_PATH = ROOT / "netlify-deploy-latest.zip"
BACKEND_ZIP_PATH = ROOT / "backend-deploy-latest.zip"
MANIFEST_PATH = ROOT / "netlify-deploy" / "deploy-manifest.json"


checks: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    checks.append((name, ok, detail))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require_tokens(label: str, text: str, tokens: list[str]) -> None:
    missing = [token for token in tokens if token not in text]
    record(label, not missing, "missing: " + ", ".join(missing) if missing else "")


def reject_tokens(label: str, text: str, tokens: list[str]) -> None:
    found = [token for token in tokens if token in text]
    record(label, not found, "found: " + ", ".join(found) if found else "")


def check_python() -> None:
    try:
        py_compile.compile(str(SERVER_PATH), doraise=True)
        record("python compile", True)
    except Exception as exc:
        record("python compile", False, str(exc))


def check_source_files() -> None:
    record("index.html exists", INDEX_PATH.exists())
    record("admin.html exists", ADMIN_PATH.exists())
    record("server.py exists", SERVER_PATH.exists())
    record("package.json exists", PACKAGE_JSON_PATH.exists())
    record("features block exists", FEATURES_PATH.exists())
    record("runtime-config.js exists", RUNTIME_CONFIG_PATH.exists())
    record("render.yaml exists", RENDER_PATH.exists())
    record("railway.json exists", RAILWAY_PATH.exists())
    record("Dockerfile exists", DOCKERFILE_PATH.exists())
    record("Procfile exists", PROCFILE_PATH.exists())
    record(".env.example exists", ENV_EXAMPLE_PATH.exists())
    record("smoke test exists", SMOKE_TEST_PATH.exists())
    record("static export cli exists", EXPORT_STATIC_PATH.exists())
    record("excel export cli exists", EXPORT_EXCEL_PATH.exists())
    record("media sync cli exists", SYNC_MEDIA_PATH.exists())
    record("media cache cli exists", CACHE_MEDIA_PATH.exists())
    record("backend package cli exists", PACKAGE_BACKEND_PATH.exists())
    record("backend configure cli exists", CONFIGURE_BACKEND_PATH.exists())
    record("site configure cli exists", CONFIGURE_SITE_PATH.exists())
    record("phase3 preflight cli exists", PHASE3_PREFLIGHT_PATH.exists())
    record("go live status cli exists", GO_LIVE_STATUS_PATH.exists())
    record("go live connect cli exists", GO_LIVE_CONNECT_PATH.exists())
    record("step2 prepare cli exists", STEP2_PREPARE_PATH.exists())
    record("token manager cli exists", MANAGE_TOKENS_PATH.exists())
    record("phase3 build cli exists", PHASE3_BUILD_PATH.exists())
    record("phase4 uat cli exists", PHASE4_UAT_PATH.exists())
    record("frontend build cli exists", BUILD_FRONTEND_PATH.exists())
    record("security audit cli exists", SECURITY_AUDIT_PATH.exists())
    record("production env example exists", PRODUCTION_ENV_EXAMPLE_PATH.exists())
    record("phase3 runbook exists", PHASE3_RUNBOOK_PATH.exists())
    record("phase4 runbook exists", PHASE4_RUNBOOK_PATH.exists())
    record("backend deploy checklist exists", BACKEND_DEPLOY_CHECKLIST_PATH.exists())
    record("token system doc exists", TOKEN_SYSTEM_DOC_PATH.exists())
    record("step2 plan exists", STEP2_PLAN_PATH.exists())
    record("telegram ops doc exists", TELEGRAM_DOC_PATH.exists())
    if not (INDEX_PATH.exists() and ADMIN_PATH.exists() and SERVER_PATH.exists()):
        return

    index = read_text(INDEX_PATH)
    admin = read_text(ADMIN_PATH)
    server = read_text(SERVER_PATH)
    package_json = read_text(PACKAGE_JSON_PATH) if PACKAGE_JSON_PATH.exists() else ""
    features_block = read_text(FEATURES_PATH) if FEATURES_PATH.exists() else ""
    runtime_config = read_text(RUNTIME_CONFIG_PATH) if RUNTIME_CONFIG_PATH.exists() else ""
    render_yaml = read_text(RENDER_PATH) if RENDER_PATH.exists() else ""
    railway_json = read_text(RAILWAY_PATH) if RAILWAY_PATH.exists() else ""
    dockerfile = read_text(DOCKERFILE_PATH) if DOCKERFILE_PATH.exists() else ""
    procfile = read_text(PROCFILE_PATH) if PROCFILE_PATH.exists() else ""
    env_example = read_text(ENV_EXAMPLE_PATH) if ENV_EXAMPLE_PATH.exists() else ""
    smoke_test = read_text(SMOKE_TEST_PATH) if SMOKE_TEST_PATH.exists() else ""
    export_static = read_text(EXPORT_STATIC_PATH) if EXPORT_STATIC_PATH.exists() else ""
    export_excel = read_text(EXPORT_EXCEL_PATH) if EXPORT_EXCEL_PATH.exists() else ""
    sync_media = read_text(SYNC_MEDIA_PATH) if SYNC_MEDIA_PATH.exists() else ""
    cache_media = read_text(CACHE_MEDIA_PATH) if CACHE_MEDIA_PATH.exists() else ""
    package_backend = read_text(PACKAGE_BACKEND_PATH) if PACKAGE_BACKEND_PATH.exists() else ""
    configure_backend = read_text(CONFIGURE_BACKEND_PATH) if CONFIGURE_BACKEND_PATH.exists() else ""
    configure_site = read_text(CONFIGURE_SITE_PATH) if CONFIGURE_SITE_PATH.exists() else ""
    phase3_preflight = read_text(PHASE3_PREFLIGHT_PATH) if PHASE3_PREFLIGHT_PATH.exists() else ""
    go_live_status = read_text(GO_LIVE_STATUS_PATH) if GO_LIVE_STATUS_PATH.exists() else ""
    go_live_connect = read_text(GO_LIVE_CONNECT_PATH) if GO_LIVE_CONNECT_PATH.exists() else ""
    step2_prepare = read_text(STEP2_PREPARE_PATH) if STEP2_PREPARE_PATH.exists() else ""
    manage_tokens = read_text(MANAGE_TOKENS_PATH) if MANAGE_TOKENS_PATH.exists() else ""
    phase3_build = read_text(PHASE3_BUILD_PATH) if PHASE3_BUILD_PATH.exists() else ""
    phase4_uat = read_text(PHASE4_UAT_PATH) if PHASE4_UAT_PATH.exists() else ""
    build_frontend = read_text(BUILD_FRONTEND_PATH) if BUILD_FRONTEND_PATH.exists() else ""
    security_audit = read_text(SECURITY_AUDIT_PATH) if SECURITY_AUDIT_PATH.exists() else ""
    production_env = read_text(PRODUCTION_ENV_EXAMPLE_PATH) if PRODUCTION_ENV_EXAMPLE_PATH.exists() else ""
    phase3_runbook = read_text(PHASE3_RUNBOOK_PATH) if PHASE3_RUNBOOK_PATH.exists() else ""
    phase4_runbook = read_text(PHASE4_RUNBOOK_PATH) if PHASE4_RUNBOOK_PATH.exists() else ""
    backend_deploy_checklist = read_text(BACKEND_DEPLOY_CHECKLIST_PATH) if BACKEND_DEPLOY_CHECKLIST_PATH.exists() else ""
    token_system_doc = read_text(TOKEN_SYSTEM_DOC_PATH) if TOKEN_SYSTEM_DOC_PATH.exists() else ""
    step2_plan = read_text(STEP2_PLAN_PATH) if STEP2_PLAN_PATH.exists() else ""
    telegram_doc = read_text(TELEGRAM_DOC_PATH) if TELEGRAM_DOC_PATH.exists() else ""

    require_tokens(
        "customer order flow",
        index,
        [
            'id="orderSuccess"',
            "showOrderSuccess",
            "createLocalOrderId",
            "LOCAL_ORDERS_KEY",
            "orders-api-unavailable",
            "trackingOrderId",
        ],
    )
    require_tokens(
        "public catalog",
        index,
        [
            "window.STATIC_GAMES",
            "runtime-config.js",
            "renderGames",
            "renderPackages",
            "renderCreatorReference",
            "gameDescriptions",
            "game-card__media",
            "playImage",
            "referenceByName",
        ],
    )
    require_tokens(
        "react upgrade island",
        index,
        ["react-service-upgrade", "react-upgrade-root", "frontend/entry.tsx"],
    )
    require_tokens(
        "react features block",
        features_block,
        ["lucide-react", "Premium Service System", "UAT", "CardDecorator"],
    )
    require_tokens(
        "npm frontend stack",
        package_json,
        ["react", "react-dom", "tailwindcss", "vite", "lucide-react", "tools/build_frontend.py"],
    )
    reject_tokens(
        "removed public noise",
        index,
        [
            "Luxury Service Studio",
            "libtool",
            "/api/public-packages",
            "แพ็คบริการที่เปิดเผย",
        ],
    )
    reject_tokens(
        "unsafe sqlite full-row seed inserts",
        server,
        ["INSERT INTO games VALUES", "INSERT INTO packages VALUES", "INSERT INTO coupons VALUES"],
    )
    require_tokens(
        "admin controls",
        admin,
        [
            "/api/admin-games",
            "/api/admin-packages",
            "/api/admin-orders",
            "/api/admin-upload-image",
            "/api/admin-backup",
            "/api/admin-export-excel",
            "checkBackendHealth",
            "backupDatabase",
            "exportExcel",
            "exportExcelButton",
            "testTelegramButton",
            "testTelegramNotification",
            "backendHealthStatus",
            "gamePlayImageFile",
            "exportStaticSite",
            "Authorization",
        ],
    )
    require_tokens(
        "backend endpoints",
        server,
        [
            'path == "/api/orders"',
            'path == "/api/orders/track"',
            'path == "/api/orders/verify-slip"',
            'path == "/api/admin-orders"',
            'path == "/api/admin-export-static"',
            'path == "/api/admin-backup"',
            'path == "/api/admin-export-excel"',
            'path == "/api/admin-test-telegram"',
            'path == "/health"',
            'path == "/runtime-config.js"',
            "export_netlify_deploy",
            "export_operations_excel",
            "build_excel_workbook",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "npm_cmd",
            "PUBLIC_API_BASE_URL",
            "ALLOWED_ORIGINS",
            "UPLOADS_DIR",
            "CURATED_GAME_MEDIA",
            "/uploads/game-images/",
            "hash_admin_session_token",
            "verify_admin_session_token",
            "revoke_admin_session_token",
            "session_sha256$",
            "notify_order_created",
            "notify_slip_uploaded",
            "notify_order_status_changed",
        ],
    )
    require_tokens(
        "runtime config source",
        runtime_config,
        ["window.APP_CONFIG", "window.API_BASE_URL", "apiBaseUrl"],
    )
    require_tokens(
        "production env example",
        env_example,
        [
            "PUBLIC_SITE_URL",
            "ADMIN_SITE_URL",
            "PUBLIC_API_BASE_URL",
            "ALLOWED_ORIGINS",
            "COOKIE_SAMESITE",
            "UPLOADS_DIR",
        ],
    )
    require_tokens(
        "render blueprint",
        render_yaml,
        ["healthCheckPath: /health", "startCommand: python server.py", "PUBLIC_API_BASE_URL", "mountPath: /var/data", "UPLOADS_DIR"],
    )
    require_tokens(
        "railway blueprint",
        railway_json,
        ['"startCommand": "python server.py"', '"/health"', '"restartPolicyType": "ON_FAILURE"'],
    )
    require_tokens(
        "docker backend blueprint",
        dockerfile,
        ["FROM python", "pip install", "EXPOSE 3000", "CMD"],
    )
    require_tokens(
        "procfile backend command",
        procfile,
        ["web: python server.py"],
    )
    require_tokens(
        "smoke test tool",
        smoke_test,
        ["/health", "/api/games", "/api/posts", "deploy-manifest.json", "SMOKE_BASE_URL"],
    )
    require_tokens(
        "static export cli",
        export_static,
        ["load_public_games", "export_netlify_deploy", "netlify-deploy-latest.zip"],
    )
    require_tokens(
        "excel export cli",
        export_excel,
        ["export_operations_excel", "game-services-operations-latest.xlsx", "exports"],
    )
    require_tokens(
        "media sync cli",
        sync_media,
        ["REFERENCE_PATTERN", "playImage", "playStore", "UPDATE games SET play_image"],
    )
    require_tokens(
        "media cache cli",
        cache_media,
        ["game-images", "download_image", "UPDATE games SET play_image"],
    )
    require_tokens(
        "backend package cli",
        package_backend,
        ["backend-deploy-latest.zip", "server.py", "requirements.txt", "Dockerfile", "Procfile", "render.yaml", "components", "dist", "uploads/game-images"],
    )
    require_tokens(
        "backend configure cli",
        configure_backend,
        ["PUBLIC_API_BASE_URL", "/health", "export:static", "ALLOWED_ORIGINS"],
    )
    require_tokens(
        "site configure cli",
        configure_site,
        ["PUBLIC_SITE_URL", "ADMIN_SITE_URL", "ALLOWED_ORIGINS"],
    )
    require_tokens(
        "phase3 preflight cli",
        phase3_preflight,
        ["backend-deploy-latest.zip", "netlify-deploy-latest.zip", "PUBLIC_API_BASE_URL", "Phase 3"],
    )
    require_tokens(
        "go live status cli",
        go_live_status,
        ["production-online-status.md", "backend-deploy-latest.zip", "netlify-deploy-latest.zip", "Current Blocker"],
    )
    require_tokens(
        "go live connect cli",
        go_live_connect,
        ["configure_backend.py", "smoke_test.py", "phase4_order_uat.py", "go-live:status", "netlify-deploy-latest.zip"],
    )
    require_tokens(
        "step2 prepare cli",
        step2_prepare,
        ["backend-deploy-latest.zip", "step2-backend-release", "RENDER_ENV_PLACEHOLDERS.txt", "STEP2_UPLOAD_README.md", "step2-checksums.json"],
    )
    require_tokens(
        "token manager cli",
        manage_tokens,
        ["ADMIN_KEY", "ADMIN_BOOTSTRAP_PASSWORD", "--rotate-admin-key", "--write-env", "--print-values"],
    )
    require_tokens(
        "phase3 build cli",
        phase3_build,
        ["package_backend.py", "export_static.py", "qa_check.py", "smoke_test.py", "phase3_preflight.py"],
    )
    require_tokens(
        "phase4 uat cli",
        phase4_uat,
        ["/api/orders", "/api/orders/track", "ORD-", "--create", "--cancel"],
    )
    require_tokens(
        "frontend build cli",
        build_frontend,
        ["vite.js", "find_node", "node.exe", "subprocess.run"],
    )
    require_tokens(
        "security audit cli",
        security_audit,
        ["SECRET_PATTERNS", "live HEAD / returns 200", "no default FastAPI ADMIN_KEY", "backend zip excludes slips"],
    )
    reject_tokens(
        "production env sample secrets",
        production_env,
        ["admin007x", "GameServices@2026!", "admin_secret_key_123"],
    )
    require_tokens(
        "production env template",
        production_env,
        ["DATABASE_FILE=/var/data/database.db", "UPLOADS_DIR=/var/data/uploads", "COOKIE_SAMESITE=None", "ADMIN_KEY="],
    )
    require_tokens(
        "phase3 runbook",
        phase3_runbook,
        ["Real Order Test", "Go / No-Go", "npm run configure:backend", "ORD-"],
    )
    require_tokens(
        "phase4 runbook",
        phase4_runbook,
        ["Manual Browser UAT", "Admin Hardening Checklist", "Go / No-Go", "WEB-"],
    )
    require_tokens(
        "backend deploy checklist",
        backend_deploy_checklist,
        ["backend-deploy-latest.zip", "PUBLIC_SITE_URL", "/health", "ORD-"],
    )
    require_tokens(
        "token system doc",
        token_system_doc,
        ["session_sha256$", "npm run tokens:setup", "ADMIN_KEY", "Deploy Provider Tokens"],
    )
    require_tokens(
        "step2 online plan",
        step2_plan,
        ["step2-backend-release", "npm run go-live:connect", "ORD-", "Render"],
    )
    require_tokens(
        "telegram ops doc",
        telegram_doc,
        ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "ทดสอบ Telegram", "BotFather"],
    )


def check_database() -> None:
    if not DB_PATH.exists():
        record("database exists", False)
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        tables = {
            row["name"]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        required_tables = {"games", "packages", "orders", "coupons", "slip_checks", "admins"}
        record("database tables", required_tables.issubset(tables), f"missing: {sorted(required_tables - tables)}")

        active_games = conn.execute("SELECT COUNT(*) FROM games WHERE is_active = 1").fetchone()[0]
        active_packages = conn.execute("SELECT COUNT(*) FROM packages WHERE is_active = 1").fetchone()[0]
        record("active games available", active_games > 0, f"active_games={active_games}")
        record("active packages available", active_packages > 0, f"active_packages={active_packages}")
        active_games_without_images = conn.execute(
            "SELECT name FROM games WHERE is_active = 1 AND (play_image IS NULL OR TRIM(play_image) = '')"
        ).fetchall()
        record("active games have images", not active_games_without_images, ", ".join(row["name"] for row in active_games_without_images))

        rows = conn.execute(
            """
            SELECT g.name
            FROM games g
            WHERE g.is_active = 1
              AND NOT EXISTS (
                SELECT 1 FROM packages p
                WHERE p.game_id = g.id AND p.is_active = 1
              )
            """
        ).fetchall()
        record("active games have packages", not rows, ", ".join(row["name"] for row in rows))
        conn.close()
    except Exception as exc:
        record("database checks", False, str(exc))


def load_manifest_from_zip(zip_path: Path) -> dict | None:
    try:
        with zipfile.ZipFile(zip_path) as archive:
            if "deploy-manifest.json" not in archive.namelist():
                record("zip manifest present", False)
                return None
            return json.loads(archive.read("deploy-manifest.json").decode("utf-8"))
    except Exception as exc:
        record("zip readable", False, str(exc))
        return None


def extract_static_games_count(index_html: str) -> int | None:
    match = re.search(
        r'<script id="static-games-data">window\.STATIC_GAMES = (.*?);</script>',
        index_html,
        re.DOTALL,
    )
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return len(data) if isinstance(data, list) else None


def check_deploy_zip() -> None:
    if not ZIP_PATH.exists():
        record("deploy zip exists", False)
        return
    record("deploy zip non-empty", ZIP_PATH.stat().st_size > 0, f"bytes={ZIP_PATH.stat().st_size}")

    try:
        with zipfile.ZipFile(ZIP_PATH) as archive:
            names = set(archive.namelist())
            required = {"index.html", "deploy-manifest.json", "netlify.toml", "runtime-config.js"}
            asset_js = [name for name in names if name.startswith("assets/") and name.endswith(".js")]
            game_image_assets = [name for name in names if name.startswith("uploads/game-images/") and name.lower().endswith((".jpg", ".png", ".webp"))]
            record("zip required files", required.issubset(names), f"missing: {sorted(required - names)}")
            record("zip built js assets", bool(asset_js), f"assets={len(asset_js)}")
            record("zip excludes tsx source", "frontend/entry.tsx" not in names, "frontend/entry.tsx found" if "frontend/entry.tsx" in names else "")
            index_html = archive.read("index.html").decode("utf-8") if "index.html" in names else ""
    except Exception as exc:
        record("zip readable", False, str(exc))
        return

    manifest = load_manifest_from_zip(ZIP_PATH)
    if manifest is not None:
        game_count = int(manifest.get("gameCount", -1))
        listed_games = manifest.get("games", [])
        record("manifest game count", game_count == len(listed_games), f"gameCount={game_count}, listed={len(listed_games)}")
        record("zip includes game images", len(game_image_assets) >= game_count, f"images={len(game_image_assets)}, games={game_count}")
        static_count = extract_static_games_count(index_html)
        record("static games injected", static_count is not None, f"static_count={static_count}")
        if static_count is not None:
            record("static count matches manifest", static_count == game_count, f"static={static_count}, manifest={game_count}")

    require_tokens(
        "zip order fallback",
        index_html,
        ["LOCAL_ORDERS_KEY", "createLocalOrderId", "orders-api-unavailable", "orderSuccess"],
    )
    reject_tokens(
        "zip removed public noise",
        index_html,
        ["Luxury Service Studio", "libtool", "/api/public-packages", "แพ็คบริการที่เปิดเผย"],
    )


def check_backend_deploy_zip() -> None:
    if not BACKEND_ZIP_PATH.exists():
        record("backend deploy zip exists", False)
        return
    record("backend deploy zip non-empty", BACKEND_ZIP_PATH.stat().st_size > 0, f"bytes={BACKEND_ZIP_PATH.stat().st_size}")

    try:
        with zipfile.ZipFile(BACKEND_ZIP_PATH) as archive:
            names = set(archive.namelist())
            required = {
                "server.py",
                "requirements.txt",
                "Dockerfile",
                ".dockerignore",
                "Procfile",
                "render.yaml",
                "railway.json",
                "docs/backend-deploy-checklist.md",
            }
            game_image_assets = [
                name for name in names
                if name.startswith("uploads/game-images/") and name.lower().endswith((".jpg", ".png", ".webp"))
            ]
            record("backend zip required files", required.issubset(names), f"missing: {sorted(required - names)}")
            record("backend zip includes game images", len(game_image_assets) >= 16, f"images={len(game_image_assets)}")
            record("backend zip excludes live database", "database.db" not in names)
            record("backend zip excludes slip uploads", not any(name.startswith("uploads/slips/") for name in names))
    except Exception as exc:
        record("backend deploy zip readable", False, str(exc))


def main() -> int:
    check_python()
    check_source_files()
    check_database()
    check_deploy_zip()
    check_backend_deploy_zip()

    failed = [item for item in checks if not item[1]]
    for name, ok, detail in checks:
        status = "PASS" if ok else "FAIL"
        suffix = f" - {detail}" if detail else ""
        print(f"[{status}] {name}{suffix}")

    if failed:
        print(f"\nQA failed: {len(failed)} check(s) need attention.")
        return 1
    print("\nQA passed: website package is ready for deploy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
