import os
import sys
sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "boda_site.settings")
import django
django.setup()
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

def handler(request):
    from urllib.parse import unquote
    method = request.method.upper()
    path = unquote(request.path or "/")
    query = request.queryString or ""
    headers = {}
    for k,v in request.headers.items():
        headers[k.lower()] = v
    body = request.body or b""
    environ = {
        "REQUEST_METHOD": method,
        "PATH_INFO": path,
        "QUERY_STRING": query,
        "SERVER_NAME": "vercel",
        "SERVER_PORT": "443",
        "wsgi.url_scheme": "https",
        "wsgi.input": body if isinstance(body, bytes) else body.encode(),
        "wsgi.errors": sys.stderr,
        "wsgi.version": (1,0),
        "wsgi.multithread": False,
        "wsgi.multiprocess": True,
        "wsgi.run_once": False,
        "CONTENT_TYPE": headers.get("content-type",""),
        "CONTENT_LENGTH": str(len(body) if isinstance(body, (bytes,bytearray)) else len(body.encode())),
    }
    for k,v in headers.items():
        if k.startswith("cookie"):
            environ["HTTP_COOKIE"] = v
        else:
            environ[f"HTTP_{k.upper().replace("-","_")}"] = v

    from wsgiref.util import setup_testing_defaults
    setup_testing_defaults(environ)
    if isinstance(environ["wsgi.input"], bytes):
        from io import BytesIO
        environ["wsgi.input"] = BytesIO(environ["wsgi.input"])

    captured_status = []
    captured_headers = []
    def start_response(status, response_headers, exc_info=None):
        captured_status.append(status)
        captured_headers.extend(response_headers)

    result = application(environ, start_response)
    body_bytes = b"".join(result)
    status = captured_status[0] if captured_status else "200 OK"
    status_code = int(status.split()[0])
    headers_out = {}
    for k,v in captured_headers:
        headers_out[k] = v
    return {
        "statusCode": status_code,
        "headers": headers_out,
        "body": body_bytes.decode("utf-8", errors="ignore")
    }
