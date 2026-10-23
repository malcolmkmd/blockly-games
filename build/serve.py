#!/usr/bin/env python3
# Copyright 2026 Thinka
# SPDX-License-Identifier: Apache-2.0
"""Serve the Thinka games so http://localhost:8088/ is the hub.

Works on macOS, Windows, and Linux with the Python 3 standard library
only. Falls back to IPv4 if binding [::] fails.

--classroom is what the double-click Start Class launchers use. It picks
a free port, prints the address students should open, and opens the
teacher page. It does not stop other programs.
"""

import argparse
import functools
import json
import os
import signal
import socket
import subprocess
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from race_hub import HUB  # noqa: E402
from race_ws import accept_value  # noqa: E402
import class_api  # noqa: E402


class NoCacheHandler(SimpleHTTPRequestHandler):
  def end_headers(self):
    self.send_header('Cache-Control', 'no-store, max-age=0')
    self.send_header('Pragma', 'no-cache')
    super().end_headers()

  def do_GET(self):
    path = urlparse(self.path).path
    if path.startswith('/class/api/'):
      self._class_api()
      return
    if path == '/race/ws':
      self._race_ws()
      return
    if path == '/race/info':
      self._race_info()
      return
    super().do_GET()

  def do_POST(self):
    path = urlparse(self.path).path
    if path.startswith('/class/api/'):
      self._class_api()
      return
    self.send_error(404)

  def do_PUT(self):
    path = urlparse(self.path).path
    if path.startswith('/class/api/'):
      self._class_api()
      return
    self.send_error(404)

  def _class_api(self):
    parsed = urlparse(self.path)
    try:
      length = int(self.headers.get('Content-Length') or '0')
    except ValueError:
      length = 0
    if length < 0 or length > 8 * 1024 * 1024:
      self.send_error(413)
      return
    raw = self.rfile.read(length) if length else b''
    status, content_type, body, extra = class_api.handle(
        self.command, parsed.path, parse_qs(parsed.query), raw)
    self.send_response(status)
    self.send_header('Content-Type', content_type)
    self.send_header('Content-Length', str(len(body)))
    for key, value in extra:
      self.send_header(key, value)
    self.end_headers()
    self.wfile.write(body)

  def _race_info(self):
    port = self.server.server_address[1]
    body = json.dumps(HUB.info(port)).encode('utf-8')
    self.send_response(200)
    self.send_header('Content-Type', 'application/json; charset=utf-8')
    self.send_header('Content-Length', str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def _race_ws(self):
    key = self.headers.get('Sec-WebSocket-Key')
    upgrade = (self.headers.get('Upgrade') or '').lower()
    if not key or upgrade != 'websocket':
      self.send_error(400, 'Expected a WebSocket')
      return
    self.send_response(101, 'Switching Protocols')
    self.send_header('Upgrade', 'websocket')
    self.send_header('Connection', 'Upgrade')
    self.send_header('Sec-WebSocket-Accept', accept_value(key.strip()))
    self.end_headers()
    HUB.attach(self.connection)


class DualStackServer(ThreadingHTTPServer):
  address_family = socket.AF_INET6

  def server_bind(self):
    try:
      self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
    except OSError:
      pass
    super().server_bind()


def listeners(port):
  """Process ids listening on this TCP port, excluding this process."""
  try:
    out = subprocess.run(
        ['lsof', '-nP', '-t', '-iTCP:%d' % port, '-sTCP:LISTEN'],
        capture_output=True, text=True, check=False)
  except FileNotFoundError:
    return []
  pids = []
  for line in (out.stdout or '').split():
    if not line.isdigit():
      continue
    pid = int(line)
    if pid != os.getpid():
      pids.append(pid)
  return pids


def free_port(port):
  """Stop whatever is already serving this port so a new server can bind."""
  found = listeners(port)
  if not found:
    return
  print('Replacing server already on port %d (%s)' % (
      port, ', '.join(str(pid) for pid in found)), flush=True)
  for pid in found:
    try:
      os.kill(pid, signal.SIGTERM)
    except OSError:
      pass
  deadline = time.time() + 1.5
  while time.time() < deadline and listeners(port):
    time.sleep(0.05)
  for pid in listeners(port):
    try:
      os.kill(pid, signal.SIGKILL)
    except OSError:
      pass
  deadline = time.time() + 1.0
  while time.time() < deadline and listeners(port):
    time.sleep(0.05)


def web_root():
  """Dev checkout serves appengine/. The offline pack serves game-files/."""
  parent = os.path.dirname(HERE)
  appengine = os.path.join(parent, 'appengine')
  packed = os.path.join(parent, 'game-files')
  if os.path.isdir(appengine):
    return appengine
  if os.path.isdir(packed):
    return packed
  return appengine


def port_is_free(port):
  """True when nothing is already listening on this TCP port."""
  sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
  try:
    sock.bind(('0.0.0.0', port))
  except OSError:
    return False
  finally:
    sock.close()
  return True


def pick_open_port(start, attempts=40):
  """First free port at or after start. Does not stop other programs."""
  port = start
  last = start + attempts
  while port < last:
    if port_is_free(port):
      return port
    port += 1
  return None


def open_browser(url, skip=False):
  if skip or os.environ.get('THINKA_NO_BROWSER') == '1':
    print('Browser not opened.', flush=True)
    return
  try:
    if sys.platform == 'darwin':
      subprocess.Popen(['open', url])
    elif sys.platform == 'win32':
      os.startfile(url)  # noqa: E1101  (Windows only)
    else:
      if not os.environ.get('DISPLAY') and not os.environ.get('WAYLAND_DISPLAY'):
        print('No screen found. Open this address yourself:', flush=True)
        print('    %s' % url, flush=True)
        return
      subprocess.Popen(['xdg-open', url], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL)
  except OSError as err:
    print('Could not open the browser (%s).' % err, flush=True)
    print('Open this address yourself:', flush=True)
    print('    %s' % url, flush=True)


def classroom_banner(port):
  info = HUB.info(port)
  urls = info.get('urls') or []
  teacher = 'http://127.0.0.1:%d/race.html?host=1' % port
  print('', flush=True)
  print('=' * 56, flush=True)
  print('  Thinka class is ready', flush=True)
  print('=' * 56, flush=True)
  print('', flush=True)
  hub = 'http://127.0.0.1:%d/' % port
  if urls:
    hub = urls[0].split('/race.html')[0] + '/'
    print('Students on the same Wi-Fi open the games:', flush=True)
    print('', flush=True)
    print('    %s' % hub, flush=True)
    print('', flush=True)
    print('They tap their class, then their name.', flush=True)
    print('Race join:', flush=True)
    for url in urls:
      print('    %s' % url, flush=True)
    print('', flush=True)
    print('Students join at: %s' % hub, flush=True)
  else:
    print('No Wi-Fi address found on this computer.', flush=True)
    print('Connect to the classroom Wi-Fi and start the class again.', flush=True)
    print('', flush=True)
    print('Students join at: %s' % hub, flush=True)
  print('', flush=True)
  print('Teacher page: %s' % teacher, flush=True)
  print('Class roster file: %s' % class_api.get_store().path, flush=True)
  print('', flush=True)
  print('Close this window to end the class.', flush=True)
  print('=' * 56, flush=True)
  print('', flush=True)
  return teacher


def make_server(bind, port, handler, replace=True):
  ThreadingHTTPServer.allow_reuse_address = True
  if replace:
    free_port(port)
  if bind in ('::', '', '*'):
    try:
      return DualStackServer(('::', port), handler)
    except OSError:
      bind = '0.0.0.0'
  return ThreadingHTTPServer((bind, port), handler)


def main():
  parser = argparse.ArgumentParser(description='Serve Thinka Games')
  parser.add_argument('--port', type=int, default=8088)
  parser.add_argument('--bind', default='::')
  parser.add_argument('--root', default=None,
                      help='Folder of game files. Default: appengine/ or game-files/')
  parser.add_argument('--classroom', action='store_true',
                      help='Pick a free port, show the join address, open the teacher page')
  parser.add_argument('--no-browser', action='store_true',
                      help='Do not open a browser (classroom mode)')
  args = parser.parse_args()
  root = args.root or web_root()
  if not os.path.isdir(root):
    raise SystemExit('Missing the games folder (%s). Keep Start Class in the '
                     'Thinka Coding Games folder.' % root)
  handler = functools.partial(NoCacheHandler, directory=root)
  if args.classroom:
    server = None
    start = args.port
    for _ in range(40):
      port = pick_open_port(start)
      if port is None:
        break
      try:
        server = make_server('0.0.0.0', port, handler, replace=False)
        break
      except OSError:
        start = port + 1
        server = None
    if server is None:
      raise SystemExit('Could not find a free port near %d. Close other '
                       'Thinka class windows and try again.' % args.port)
    port = server.server_address[1]
    teacher = classroom_banner(port)
    open_browser(teacher, skip=args.no_browser)
    print('Serving %s' % root, flush=True)
    server.serve_forever()
    return
  server = make_server(args.bind, args.port, handler)
  port = server.server_address[1]
  print('Thinka hub: http://127.0.0.1:%d/' % port, flush=True)
  print('Also:       http://[::]:%d/' % port, flush=True)
  print('Class roster file: %s' % class_api.get_store().path, flush=True)
  print('Serving %s (no-cache)' % root, flush=True)
  server.serve_forever()


if __name__ == '__main__':
  main()
