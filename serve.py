#!/usr/bin/env python3
# Copyright 2026 Thinka
# SPDX-License-Identifier: Apache-2.0
"""Repo-root wrapper: python3 serve.py --port 8088"""

import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).resolve().parent / 'build' / 'serve.py'),
               run_name='__main__')
