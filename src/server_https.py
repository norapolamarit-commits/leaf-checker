from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import ssl


HOST = "0.0.0.0"
PORT = 5443
BASE_DIR = Path(__file__).resolve().parent
CERT_FILE = BASE_DIR / "local-cert.pem"
KEY_FILE = BASE_DIR / "local-key.pem"


def main():
    if not CERT_FILE.exists() or not KEY_FILE.exists():
        raise SystemExit(
            "Missing local-cert.pem or local-key.pem. "
            "Run the openssl command in README.md first."
        )

    server = ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)
    server.socket = context.wrap_socket(server.socket, server_side=True)

    print(f"LeafCheck HTTPS server running at https://127.0.0.1:{PORT}/")
    print(f"Share on the same Wi-Fi using https://<this-computer-ip>:{PORT}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
