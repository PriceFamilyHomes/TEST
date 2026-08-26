#!/usr/bin/env python3
"""Turn a browser-copied 'Copy as cURL' command into a config.json entity
snippet. Usage: python3 parse_curl.py capture/bids.curl.txt
"""
import json
import re
import shlex
import sys
from urllib.parse import urlparse


def parse_curl_file(path: str) -> dict:
    text = open(path, encoding="utf-8").read().strip()
    text = text.removeprefix("curl ")
    tokens = shlex.split(text)

    method = "GET"
    url = None
    headers = {}
    cookie = None
    data = None

    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok in ("-X", "--request"):
            method = tokens[i + 1]
            i += 2
        elif tok in ("-H", "--header"):
            header = tokens[i + 1]
            name, _, value = header.partition(":")
            name = name.strip()
            value = value.strip()
            if name.lower() == "cookie":
                cookie = value
            else:
                headers[name] = value
            i += 2
        elif tok in ("-b", "--cookie"):
            cookie = tokens[i + 1]
            i += 2
        elif tok in ("-d", "--data", "--data-raw", "--data-binary"):
            data = tokens[i + 1]
            method = "POST" if method == "GET" else method
            i += 2
        elif tok.startswith("http"):
            url = tok
            i += 1
        else:
            i += 1

    if url is None:
        raise SystemExit(f"Could not find a URL in {path} — is this a real 'Copy as cURL' capture?")

    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    path_and_query = parsed.path + (("?" + parsed.query) if parsed.query else "")

    return {
        "base_url": base_url,
        "method": method,
        "path": path_and_query,
        "cookie": cookie,
        "extra_headers": headers,
        "body": data,
    }


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(1)

    result = parse_curl_file(sys.argv[1])

    print("# Detected base_url — put in config.json's top-level \"base_url\":")
    print(json.dumps(result["base_url"]))
    print()
    print("# Detected cookie — put in config.json's top-level \"cookie\":")
    print(json.dumps(result["cookie"]))
    print()
    print("# Detected non-cookie headers worth keeping (skim for an auth/anti-forgery token):")
    print(json.dumps(result["extra_headers"], indent=2))
    print()
    print(f"# Request was {result['method']} {result['path']}")
    if result["body"]:
        print("# Body sent with the request (adapt for pagination if it's a POST with a JSON filter):")
        print(result["body"])
    print()
    print("# Now edit config.json's matching entity: replace list_path/method/body_template")
    print("# using the path/method/body above. Swap the job id and page-number values in the")
    print("# path or body for the {job_id}/{page}/{page_size} placeholders, and check the JSON")
    print("# response shape to fix items_key/total_key.")


if __name__ == "__main__":
    main()
