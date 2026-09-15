#!/usr/bin/env python3
# Copyright 2026 Thinka
# SPDX-License-Identifier: Apache-2.0
"""Serve appengine/ so http://localhost:8088/ is the Thinka hub.

Works on macOS (Homebrew Python) and Linux. Falls back to IPv4 if
binding [::] fails.
"""

import argparse
import functools
import os
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    'appengine')


class NoCacheHandler(SimpleHTTPRequestHandler):
  def end_headers(self):
    self.send_header('Cache-Control', 'no-store, max-age=0')
    self.send_header('Pragma', 'no-cache')
    super().end_headers()


class DualStackServer(ThreadingHTTPServer):
  address_family = socket.AF_INET6

  def server_bind(self):
    try:
      self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
    except OSError:
      pass
    super().server_bind()


def make_server(bind, port, handler):
  if bind in ('::', '', '*'):
    try:
      return DualStackServer(('::', port), handler)
    except OSError:
      bind = '0.0.0.0'
  return ThreadingHTTPServer((bind, port), handler)


def main():
  parser = argparse.ArgumentParser(description='Serve Thinka Games (appengine/)')
  parser.add_argument('--port', type=int, default=8088)
  parser.add_argument('--bind', default='::')
  args = parser.parse_args()
  if not os.path.isdir(ROOT):
    raise SystemExit('Missing %s — run this from the Thinka repo after '
                     'checking out the visual-theme branch.' % ROOT)
  handler = functools.partial(NoCacheHandler, directory=ROOT)
  server = make_server(args.bind, args.port, handler)
  print('Thinka hub: http://127.0.0.1:%d/' % args.port, flush=True)
  print('Also:       http://[::]:%d/' % args.port, flush=True)
  print('Serving %s (no-cache)' % ROOT, flush=True)
  server.serve_forever()


if __name__ == '__main__':
  main()
