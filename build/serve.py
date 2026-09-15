#!/usr/bin/env python3
# Copyright 2026 Thinka
# SPDX-License-Identifier: Apache-2.0
"""Serve appengine/ so http://[::]:8088/ is the Thinka hub.

Python's default http.server from the repo root makes / a redirect stub.
This script serves the static web root and disables caching so a leftover
index/generated/compressed.js cannot keep painting the old Blockly path.
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
    self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
    super().server_bind()


def main():
  parser = argparse.ArgumentParser(description='Serve Thinka Games (appengine/)')
  parser.add_argument('--port', type=int, default=8088)
  parser.add_argument('--bind', default='::')
  args = parser.parse_args()
  handler = functools.partial(NoCacheHandler, directory=ROOT)
  server = DualStackServer((args.bind, args.port), handler)
  host = args.bind if args.bind != '::' else '[::]'
  print('Thinka hub: http://%s:%d/' % (host, args.port), flush=True)
  print('Serving %s (no-cache)' % ROOT, flush=True)
  server.serve_forever()


if __name__ == '__main__':
  main()
