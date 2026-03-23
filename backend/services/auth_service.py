"""
Auth service — Role-Based Access Control (RBAC)
Roles: admin, manager, recruiter, viewer
"""
import os
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data/users.json")

# Role hierarchy and permissions
ROLES = {
    "admin": {
        "label": "Administrator",
        "permissions": ["*"],  # All permissions
    },
    "manager": {
        "label": "Zarząd / Manager",
        "permissions": [
            "contracts.read", "contracts.create", "contracts.modify", "contracts.status",
            "contracts.annex", "contracts.terminate", "contracts.delete",
            "contracts.review", "contracts.email",
            "analytics.read", "analytics.export",
            "reports.read",
            "legal.read",
            "settings.read",
        ],
    },
    "recruiter": {
        "label": "Rekruter",
        "permissions": [
            "contracts.read", "contracts.create", "contracts.modify", "contracts.status",
            "contracts.annex",
            "analytics.read",
            "reports.read",
            "legal.read",
        ],
    },
    "viewer": {
        "label": "Podgląd",
        "permissions": [
            "contracts.read",
            "analytics.read",
            "reports.read",
            "legal.read",
        ],
    },
}

# Endpoint → required permission mapping
ENDPOINT_PERMISSIONS = {
    # Contracts
    "POST /api/contracts/generate": "contracts.create",
    "POST /api/contracts/onboard": "contracts.create",
    "POST /api/contracts/modify": "contracts.modify",
    "POST /api/contracts/check-risks": "contracts.read",
    "PATCH /api/contracts/": "contracts.status",
    "DELETE /api/contracts/": "contracts.delete",
    "POST /api/contracts/*/annex": "contracts.annex",
    "POST /api/contracts/*/terminate": "contracts.terminate",
    "POST /api/contracts/*/full-review": "contracts.review",
    "POST /api/contracts/*/send-welcome-email": "contracts.email",
    # Analytics
    "GET /api/analytics/": "analytics.read",
    "GET /api/contracts/export/": "analytics.export",
    # System
    "POST /api/backup": "settings.admin",
    "POST /api/import/excel": "settings.admin",
    "POST /api/normalize/clients": "settings.admin",
}


def _load_users() -> dict:
    """Load users from JSON file."""
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE) as f:
            return json.load(f)
    
    # Create default admin
    default_users = {
        "admin": {
            "name": "Administrator",
            "role": "admin",
            "password_hash": _hash_password("admin123"),
            "api_key": secrets.token_hex(16),
            "created_at": datetime.now().isoformat(),
            "active": True,
        },
        "marta": {
            "name": "Marta Kozarzewska",
            "role": "manager",
            "password_hash": _hash_password("marta2026"),
            "api_key": secrets.token_hex(16),
            "created_at": datetime.now().isoformat(),
            "active": True,
        },
        "rekruter": {
            "name": "Rekruter",
            "role": "recruiter",
            "password_hash": _hash_password("rekruter2026"),
            "api_key": secrets.token_hex(16),
            "created_at": datetime.now().isoformat(),
            "active": True,
        },
    }
    _save_users(default_users)
    return default_users


def _save_users(users: dict):
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def authenticate(username: str = None, password: str = None, api_key: str = None) -> Optional[dict]:
    """Authenticate user by username+password or API key."""
    users = _load_users()
    
    if api_key:
        for uname, user in users.items():
            if user.get("api_key") == api_key and user.get("active", True):
                return {"username": uname, **user}
        return None
    
    if username and password:
        user = users.get(username)
        if user and user.get("password_hash") == _hash_password(password) and user.get("active", True):
            return {"username": username, **user}
    
    return None


def has_permission(user: dict, permission: str) -> bool:
    """Check if user has a specific permission."""
    role = user.get("role", "viewer")
    role_perms = ROLES.get(role, {}).get("permissions", [])
    
    if "*" in role_perms:
        return True
    
    return permission in role_perms


def check_endpoint_permission(user: dict, method: str, path: str) -> bool:
    """Check if user can access an endpoint."""
    if not user:
        return True  # No auth configured → allow all
    
    role = user.get("role", "viewer")
    if role == "admin":
        return True
    
    # Check specific endpoint permissions
    for pattern, permission in ENDPOINT_PERMISSIONS.items():
        pat_method, pat_path = pattern.split(" ", 1)
        if method == pat_method and (path.startswith(pat_path) or pat_path.replace("*", "") in path):
            return has_permission(user, permission)
    
    # Default: allow GET for all authenticated users
    if method == "GET":
        return True
    
    return True  # Default allow (security by endpoint, not blanket deny)


def list_users() -> list:
    """List all users (without passwords)."""
    users = _load_users()
    return [
        {
            "username": uname,
            "name": user["name"],
            "role": user["role"],
            "role_label": ROLES.get(user["role"], {}).get("label", user["role"]),
            "active": user.get("active", True),
            "api_key": user.get("api_key", "")[:8] + "...",
        }
        for uname, user in users.items()
    ]


def create_user(username: str, name: str, role: str, password: str) -> dict:
    """Create a new user."""
    users = _load_users()
    if username in users:
        return {"error": f"User {username} already exists"}
    if role not in ROLES:
        return {"error": f"Invalid role. Available: {list(ROLES.keys())}"}
    
    users[username] = {
        "name": name,
        "role": role,
        "password_hash": _hash_password(password),
        "api_key": secrets.token_hex(16),
        "created_at": datetime.now().isoformat(),
        "active": True,
    }
    _save_users(users)
    return {"success": True, "username": username, "api_key": users[username]["api_key"]}


def update_user_role(username: str, new_role: str) -> dict:
    """Change user role."""
    users = _load_users()
    if username not in users:
        return {"error": "User not found"}
    if new_role not in ROLES:
        return {"error": f"Invalid role. Available: {list(ROLES.keys())}"}
    
    users[username]["role"] = new_role
    _save_users(users)
    return {"success": True, "username": username, "role": new_role}


def delete_user(username: str) -> dict:
    """Deactivate a user."""
    users = _load_users()
    if username not in users:
        return {"error": "User not found"}
    if username == "admin":
        return {"error": "Cannot delete admin"}
    
    users[username]["active"] = False
    _save_users(users)
    return {"success": True}
