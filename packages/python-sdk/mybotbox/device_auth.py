"""
Device-flow login for the Python SDK — the gh-style browser auth used by the
CLI, exposed so SDK users authenticate themselves instead of pasting a key.

Credentials are stored in ``~/.mybotbox/hosts.json`` — the SAME file the
``mybotbox`` CLI and the Node SDK use — so one login works everywhere.
Interactive (opens a browser); for headless/CI set ``MBB_API_KEY``.
"""

import json
import os
import time
import webbrowser
from pathlib import Path
from socket import gethostname
from typing import Optional, Tuple

import requests

CLIENT_ID = "mybotbox-sdk"
DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code"
DEFAULT_HOST = "https://app.mybotbox.com"


def resolve_host(host: Optional[str] = None) -> str:
    """Resolve the active host: explicit -> MYBOTBOX_HOST -> default."""
    raw = (host or os.environ.get("MYBOTBOX_HOST") or DEFAULT_HOST).rstrip("/")
    return raw if raw.startswith("http") else f"https://{raw}"


def _normalize_host_key(host: str) -> str:
    return host.replace("https://", "").replace("http://", "").rstrip("/").lower()


def _config_paths() -> Tuple[Path, Path]:
    base = os.environ.get("MYBOTBOX_CONFIG_DIR") or str(Path.home() / ".mybotbox")
    directory = Path(base)
    return directory, directory / "hosts.json"


def _read_hosts() -> dict:
    _, hosts_file = _config_paths()
    if not hosts_file.exists():
        return {}
    try:
        return json.loads(hosts_file.read_text())
    except Exception:
        return {}


def _write_hosts(data: dict) -> None:
    directory, hosts_file = _config_paths()
    directory.mkdir(parents=True, exist_ok=True)
    hosts_file.write_text(json.dumps(data, indent=2) + "\n")
    try:
        # 0o700 = owner-only; the correct, most-restrictive perms for a private
        # credential dir (matches the CLI). The rule's 0o644 suggestion is wrong here.
        os.chmod(directory, 0o700)  # nosemgrep
        os.chmod(hosts_file, 0o600)
    except OSError:
        pass


def load_stored_token(host: Optional[str] = None) -> Optional[str]:
    """Env ``MBB_API_KEY``/``MYBOTBOX_TOKEN`` wins; else the stored file entry."""
    for var in ("MBB_API_KEY", "MYBOTBOX_TOKEN"):
        if os.environ.get(var):
            return os.environ[var]
    entry = _read_hosts().get(_normalize_host_key(resolve_host(host)))
    return entry.get("token") if entry else None


def _save_token(host: str, token: str) -> None:
    hosts = _read_hosts()
    hosts[_normalize_host_key(host)] = {"token": token}
    _write_hosts(hosts)


def device_login(
    host: Optional[str] = None, scope: Optional[str] = None, log: bool = True
) -> str:
    """Run the browser device-login flow, persist and return the token.

    Interactive (opens a browser). For headless/CI, set ``MBB_API_KEY`` instead.
    """
    base = resolve_host(host)
    init = requests.post(
        f"{base}/api/auth/device",
        json={"client_id": CLIENT_ID, "scope": scope, "device_name": gethostname()},
        timeout=30,
    )
    if not init.ok:
        raise RuntimeError(f"Failed to start login (HTTP {init.status_code})")
    data = init.json()

    if log:
        print(f"\n  First copy your one-time code: {data['user_code']}")
        print(f"  Opening {data['verification_uri']} in your browser...")
        if data.get("scope"):
            print(f"  Requested scopes: {data['scope']}")
        print("  (If the browser does not open, visit the URL above and enter the code.)\n")
    try:
        webbrowser.open(data.get("verification_uri_complete") or data["verification_uri"])
    except Exception:
        pass

    deadline = time.time() + data["expires_in"]
    interval = max(data.get("interval", 5), 1)
    while time.time() < deadline:
        time.sleep(interval)
        res = requests.post(
            f"{base}/api/auth/device/token",
            json={
                "grant_type": DEVICE_GRANT,
                "device_code": data["device_code"],
                "client_id": CLIENT_ID,
            },
            timeout=30,
        )
        body = res.json() if res.content else {}
        if res.ok and body.get("access_token"):
            token = body["access_token"]
            _save_token(base, token)
            if log:
                print(f"✓ Logged in to {base}")
            return token
        err = body.get("error")
        if err == "authorization_pending":
            continue
        if err == "slow_down":
            interval += 5
            continue
        if err == "access_denied":
            raise RuntimeError("Authorization was denied in the browser.")
        if err == "expired_token":
            raise RuntimeError("The code expired before you approved. Run device_login() again.")
        if not res.ok:
            raise RuntimeError(body.get("error_description") or err or f"HTTP {res.status_code}")
    raise RuntimeError("Timed out waiting for authorization.")
