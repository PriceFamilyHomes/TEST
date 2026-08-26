#!/usr/bin/env python3
"""Pull Buildertrend financials (bids/POs/invoices) over HTTP using a
captured session cookie, and write them to output/<job_id>/<entity>.{csv,json}.

See README.md for the one-time capture step needed before this will work —
config.example.json ships with TODO placeholders instead of real endpoints
because Buildertrend doesn't publish them.
"""
import argparse
import csv
import json
import sys
import time
from pathlib import Path

import requests

HERE = Path(__file__).parent
CONFIG_PATH = HERE / "config.json"
OUTPUT_DIR = HERE / "output"

MAX_RETRIES = 4
RETRY_BACKOFF_SECONDS = 2


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        sys.exit(
            f"Missing {CONFIG_PATH}. Copy config.example.json to config.json "
            "and fill it in per README.md before running this."
        )
    config = json.loads(CONFIG_PATH.read_text())
    if "TODO" in json.dumps(config):
        sys.exit(
            "config.json still has TODO placeholders in it. Capture the real "
            "requests (see README.md) and fill in the entity endpoints first."
        )
    return config


def build_session(config: dict) -> requests.Session:
    session = requests.Session()
    session.headers["Cookie"] = config["cookie"]
    session.headers["Accept"] = "application/json"
    session.headers.update(config.get("extra_headers", {}))
    return session


def fetch_page(session: requests.Session, base_url: str, entity_cfg: dict, job_id: str, page: int, page_size: int) -> dict:
    url = base_url + entity_cfg["list_path"].format(job_id=job_id, page=page, page_size=page_size)
    method = entity_cfg.get("method", "GET").upper()
    body = None
    if entity_cfg.get("body_template"):
        body = json.loads(
            json.dumps(entity_cfg["body_template"]).format(job_id=job_id, page=page, page_size=page_size)
        )

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.request(method, url, json=body, timeout=30)
            if resp.status_code == 401 or resp.status_code == 403:
                sys.exit(
                    f"Got HTTP {resp.status_code} from Buildertrend — your captured "
                    "session cookie has almost certainly expired. Re-capture it "
                    "(see README.md step 1) and update config.json."
                )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
    raise SystemExit(f"Failed to fetch {url} after {MAX_RETRIES} attempts: {last_error}")


def fetch_all(session: requests.Session, base_url: str, entity_name: str, entity_cfg: dict, job_id: str, page_size: int) -> list:
    items_key = entity_cfg["items_key"]
    total_key = entity_cfg.get("total_key")
    all_items = []
    page = 1
    while True:
        payload = fetch_page(session, base_url, entity_cfg, job_id, page, page_size)
        items = payload.get(items_key, []) if isinstance(payload, dict) else payload
        if not items:
            break
        all_items.extend(items)
        print(f"  [{entity_name}] job {job_id}: page {page} -> {len(items)} rows (total so far: {len(all_items)})")

        if total_key and isinstance(payload, dict) and payload.get(total_key) is not None:
            if len(all_items) >= payload[total_key]:
                break
        elif len(items) < page_size:
            break
        page += 1
    return all_items


def write_output(job_id: str, entity_name: str, rows: list):
    job_dir = OUTPUT_DIR / str(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)

    json_path = job_dir / f"{entity_name}.json"
    json_path.write_text(json.dumps(rows, indent=2))

    csv_path = job_dir / f"{entity_name}.csv"
    if rows and isinstance(rows[0], dict):
        fieldnames = sorted({key for row in rows for key in row.keys()})
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
    else:
        csv_path.write_text("")

    print(f"  wrote {len(rows)} rows -> {json_path} / {csv_path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jobs", required=True, help="Comma-separated Buildertrend job IDs")
    parser.add_argument(
        "--entities",
        default="bids,pos,invoices",
        help="Comma-separated entities to pull (default: bids,pos,invoices)",
    )
    args = parser.parse_args()

    config = load_config()
    session = build_session(config)
    base_url = config["base_url"]
    page_size = config.get("page_size", 50)

    job_ids = [j.strip() for j in args.jobs.split(",") if j.strip()]
    entity_names = [e.strip() for e in args.entities.split(",") if e.strip()]

    for entity_name in entity_names:
        entity_cfg = config["entities"].get(entity_name)
        if not entity_cfg:
            print(f"Skipping unknown entity {entity_name!r} (not in config.json)", file=sys.stderr)
            continue
        for job_id in job_ids:
            print(f"Fetching {entity_name} for job {job_id}...")
            rows = fetch_all(session, base_url, entity_name, entity_cfg, job_id, page_size)
            write_output(job_id, entity_name, rows)


if __name__ == "__main__":
    main()
