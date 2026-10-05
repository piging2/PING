"""Local Meta webhook starter. Requires public HTTPS hosting before Meta setup."""
import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

VERIFY_TOKEN = os.environ["META_VERIFY_TOKEN"]
APP_SECRET = os.environ["META_APP_SECRET"].encode()
LOG_PATH = Path(os.environ.get("META_WEBHOOK_LOG", "meta-webhook-events.jsonl"))
MAX_BYTES = 1024 * 1024


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Avoid logging verification tokens from request URLs.

    def reply(self, status, body):
        with LOG_PATH.with_suffix('.requests.jsonl').open('a', encoding='utf-8') as stream:
            stream.write(json.dumps({'time': datetime.now(timezone.utc).isoformat(),
                                     'method': self.command,
                                     'path': urlsplit(self.path).path,
                                     'status': status,
                                     'content_length': self.headers.get('Content-Length'),
                                     'transfer_encoding': self.headers.get('Transfer-Encoding'),
                                     'has_sha256_signature': bool(self.headers.get('X-Hub-Signature-256'))}) + '\n')
        data = body.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path != "/webhook":
            return self.reply(404, "Not found")
        query = parse_qs(parsed.query)
        token = query.get("hub.verify_token", [""])[0]
        if (query.get("hub.mode") == ["subscribe"]
                and hmac.compare_digest(token, VERIFY_TOKEN)):
            return self.reply(200, query.get("hub.challenge", [""])[0])
        self.reply(403, "Forbidden")

    def do_POST(self):
        if urlsplit(self.path).path != "/webhook":
            return self.reply(404, "Not found")
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.reply(400, "Invalid length")
        if not 0 < size <= MAX_BYTES:
            return self.reply(413, "Invalid payload size")
        body = self.rfile.read(size)
        expected = "sha256=" + hmac.new(APP_SECRET, body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(self.headers.get("X-Hub-Signature-256", ""), expected):
            return self.reply(403, "Invalid signature")
        try:
            payload = json.loads(body)
        except (ValueError, UnicodeDecodeError):
            return self.reply(400, "Invalid JSON")
        try:
            LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
            with LOG_PATH.open("a", encoding="utf-8") as stream:
                stream.write(json.dumps({"received_at": datetime.now(timezone.utc).isoformat(),
                                         "event": payload}) + "\n")
        except OSError:
            return self.reply(500, "Log unavailable")
        self.reply(200, "EVENT_RECEIVED")


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", int(os.environ.get("PORT", "8080"))), Handler).serve_forever()
