#!/usr/bin/env python3
"""
GitBook HTTP Server — serves pre-built HTML from html/ directory.
"""
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'html')

class GitBookHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        """Root '/' serves the cover page, other paths serve from html/ directory."""
        path = self.path.strip('/')
        if not path or path.endswith('/'):
            path = 'index.html'
        return super().do_GET()

    def translate_path(self, path):
        """Serve files from html/ directory."""
        path = path.strip('/')
        return os.path.join(BASE_DIR, path)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        # Enable caching for static assets (lib/, node_modules fallback)
        if self.path.startswith('/lib/') or self.path.endswith('.js') or self.path.endswith('.css'):
            self.send_header('Cache-Control', 'public, max-age=86400')
        else:
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    port = 4004
    server = HTTPServer(('0.0.0.0', port), GitBookHandler)
    print(f'Serving pre-built HTML from: {BASE_DIR}')
    print(f'Server running at http://0.0.0.0:{port}/')
    server.serve_forever()
