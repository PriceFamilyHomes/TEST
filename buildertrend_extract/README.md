# Buildertrend financials extractor

Pulls bids, purchase orders, and invoices directly over HTTP (no browser
rendering) using your own logged-in Buildertrend session, and writes them to
CSV/JSON in `./output`.

Buildertrend does not publish these endpoints, so this script can't be
finished blind — you need to capture the real requests once from your
browser and paste the details into `config.json`. That's a 5-minute,
one-time step; after that the script runs on its own.

## 1. Capture the real requests (one-time)

1. Log into Buildertrend in Chrome/Edge, open DevTools (F12) → **Network**
   tab → filter to **Fetch/XHR**.
2. Navigate to a job's **Bids** list. Find the request that loads the bid
   list (usually a `POST` or `GET` to something under `/api/...`). Right
   click it → **Copy → Copy as cURL**.
3. Paste that cURL into `capture/bids.curl.txt`.
4. Repeat for **Purchase Orders** → `capture/pos.curl.txt` and
   **Invoices** → `capture/invoices.curl.txt`.
5. Also grab one "detail" request (clicking into a single bid/PO/invoice) if
   you want line-item detail, not just the list view — same process, save
   as `capture/bids_detail.curl.txt` etc.

Run:

```
python3 parse_curl.py capture/bids.curl.txt
python3 parse_curl.py capture/pos.curl.txt
python3 parse_curl.py capture/invoices.curl.txt
```

Each prints a `config.json` snippet (URL, method, headers, body template)
— drop it into the matching section of `config.json`.

## 2. Auth

Buildertrend's web app is cookie-session based. The cURL you copy already
contains the full `Cookie` header for your logged-in session — `parse_curl.py`
extracts it into `config.json`'s `"cookie"` field automatically.

That cookie **will expire** (session timeout, usually a handful of hours).
This is the fundamental tradeoff of going around the official API: there's
no refresh token, so an expired cookie means re-capturing it. If you end up
running this on a schedule (not just ad hoc), it's worth asking Buildertrend
support whether your plan includes API/Open API access — that gets you a
real token that doesn't expire on you mid-run.

## 3. Run it

```
pip install -r requirements.txt
python3 extract.py --jobs 12345,67890 --entities bids,pos,invoices
```

Output lands in `output/<job_id>/<entity>.csv` and `.json`.

## Files

- `config.json` — endpoint templates + cookie (gitignored — don't commit real cookies/tokens)
- `parse_curl.py` — turns a copied cURL command into a config.json snippet
- `extract.py` — the actual extractor: pagination, retries, CSV/JSON export
- `capture/` — where you drop the raw cURL captures (gitignored)
