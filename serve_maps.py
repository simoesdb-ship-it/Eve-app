#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == "__main__":
    PORT = 8083
    Handler = CustomHTTPRequestHandler
    
    # Change to the current directory where HTML files are located
    os.chdir('/home/runner/workspace')
    
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
            print(f"✅ Server running at http://localhost:{PORT}")
            print(f"📍 Maps available at:")
            print(f"   - http://localhost:{PORT}/basic_map.html")
            print(f"   - http://localhost:{PORT}/simple_map.html") 
            print(f"   - http://localhost:{PORT}/working_map.html")
            print(f"   - http://localhost:{PORT}/spatial_analysis_map.html")
            print(f"\n🗂️ Files in directory: {os.listdir('.')}")
            httpd.serve_forever()
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)