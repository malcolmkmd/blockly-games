# Copyright 2026 Thinka
# SPDX-License-Identifier: Apache-2.0
"""JSON HTTP API for the class roster. Standard library only."""

import json
import os
import re
from urllib.parse import parse_qs

from class_store import ANIMALS, ClassStore, default_data_file

_STORE = None

_CLASS = re.compile(r'^/class/api/classes/([A-Za-z0-9_]+)$')
_STUDENTS = re.compile(r'^/class/api/classes/([A-Za-z0-9_]+)/students$')
_IMPORT = re.compile(r'^/class/api/classes/([A-Za-z0-9_]+)/students/import$')
_REPORT = re.compile(r'^/class/api/classes/([A-Za-z0-9_]+)/report$')
_ACTION = re.compile(r'^/class/api/students/([A-Za-z0-9_]+)/(move|remove|reset-secret)$')


def get_store():
  global _STORE
  if _STORE is None:
    _STORE = ClassStore(default_data_file())
  return _STORE


def set_store(store):
  global _STORE
  _STORE = store


def catalog_path():
  here = os.path.dirname(os.path.abspath(__file__))
  parent = os.path.dirname(here)
  candidates = [
      os.path.join(parent, 'appengine', 'common', 'progress_catalog.json'),
      os.path.join(parent, 'game-files', 'common', 'progress_catalog.json'),
  ]
  for path in candidates:
    if os.path.isfile(path):
      return path
  return candidates[0]


def load_catalog():
  with open(catalog_path(), 'r', encoding='utf-8') as handle:
    return json.load(handle)


def _json(status, payload, headers=None):
  body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
  return status, 'application/json; charset=utf-8', body, headers or []


def _error(status, message):
  return _json(status, {'ok': False, 'error': message})


def _read_json(raw):
  if not raw:
    return {}
  if isinstance(raw, bytes):
    text = raw.decode('utf-8')
  else:
    text = str(raw)
  if not text.strip():
    return {}
  data = json.loads(text)
  if not isinstance(data, dict):
    raise ValueError('expected an object')
  return data


def handle(method, path, query, raw, store=None):
  """Return (status, content_type, body, extra_headers)."""
  store = store or get_store()
  query = query or {}
  method = (method or 'GET').upper()
  try:
    if path == '/class/api/ping' and method == 'GET':
      return _json(200, {'ok': True, 'version': 1, 'animals': list(ANIMALS)})
    if path == '/class/api/classes' and method == 'GET':
      return _json(200, {'ok': True, 'classes': store.list_classes()})
    if path == '/class/api/classes' and method == 'POST':
      body = _read_json(raw)
      record, err = store.create_class(
          body.get('name'), body.get('grade'), body.get('pinRequired'))
      if err:
        return _error(400, err)
      return _json(200, {'ok': True, 'class': record})
    matched = _CLASS.match(path or '')
    if matched and method == 'POST':
      body = _read_json(raw)
      record, err = store.update_class(matched.group(1), body)
      if err:
        status = 404 if 'not on this laptop' in err else 400
        return _error(status, err)
      return _json(200, {'ok': True, 'class': record})
    matched = _STUDENTS.match(path or '')
    if matched and method == 'GET':
      rows = store.list_students(matched.group(1))
      if rows is None:
        return _error(404, 'That class is not on this laptop.')
      return _json(200, {'ok': True, 'students': rows})
    if matched and method == 'POST':
      body = _read_json(raw)
      student, err = store.add_student(
          matched.group(1), body.get('firstName'), body.get('surnameInitial'))
      if err:
        status = 404 if 'not on this laptop' in err else 400
        return _error(status, err)
      return _json(200, {'ok': True, 'student': student})
    matched = _IMPORT.match(path or '')
    if matched and method == 'POST':
      body = _read_json(raw)
      result, err = store.import_csv(matched.group(1), body.get('csv') or '')
      if err:
        return _error(404, err[0] if isinstance(err, list) else err)
      return _json(200, {'ok': True, 'added': result['added'], 'errors': result['errors']})
    matched = _REPORT.match(path or '')
    if matched and method == 'GET':
      report = store.report(matched.group(1), load_catalog())
      if report is None:
        return _error(404, 'That class is not on this laptop.')
      return _json(200, report)
    matched = _ACTION.match(path or '')
    if matched and method == 'POST':
      student_id, action = matched.group(1), matched.group(2)
      body = _read_json(raw)
      if action == 'move':
        student, err = store.move_student(student_id, body.get('classId') or '')
      elif action == 'remove':
        student, err = store.remove_student(student_id)
      else:
        student, err = store.reset_secret(student_id)
      if err:
        return _error(404, err)
      return _json(200, {'ok': True, 'student': student})
    if path == '/class/api/signin' and method == 'POST':
      body = _read_json(raw)
      result = store.sign_in(
          body.get('classId') or '',
          body.get('studentId') or '',
          picture=body.get('picture'),
          pin=body.get('pin'))
      status = 200 if result.get('ok') or result.get('needsSecret') or result.get('error') == 'again' else 404
      if result.get('error') == 'missing':
        status = 404
      return _json(status, result)
    if path == '/class/api/signout' and method == 'POST':
      body = _read_json(raw)
      return _json(200, store.sign_out(body.get('token') or ''))
    if path == '/class/api/progress' and method == 'GET':
      token = ''
      got = query.get('token')
      if isinstance(got, list):
        token = got[0] if got else ''
      elif isinstance(got, str):
        token = got
      progress = store.get_progress(token)
      if progress is None:
        return _error(401, 'sign-in')
      return _json(200, {'ok': True, 'progress': progress})
    if path == '/class/api/progress' and method == 'PUT':
      body = _read_json(raw)
      result, err = store.put_progress(body.get('token') or '', body.get('changes') or {})
      if err == 'sign-in':
        return _error(401, err)
      if err:
        return _error(400, err)
      return _json(200, result)
    if path == '/class/api/export.csv' and method == 'GET':
      class_id = ''
      got = query.get('classId')
      if isinstance(got, list):
        class_id = got[0] if got else ''
      elif isinstance(got, str):
        class_id = got
      text = store.export_csv(load_catalog(), class_id or None)
      body = text.encode('utf-8')
      headers = [('Content-Disposition', 'attachment; filename="thinka-progress.csv"')]
      return 200, 'text/csv; charset=utf-8', body, headers
    if path == '/class/api/backup' and method == 'GET':
      body = store.backup_bytes()
      headers = [('Content-Disposition', 'attachment; filename="thinka-class-backup.json"')]
      return 200, 'application/json; charset=utf-8', body, headers
    if path == '/class/api/restore' and method == 'POST':
      result, err = store.restore_bytes(raw or b'')
      if err:
        return _error(400, err)
      return _json(200, result)
  except ValueError:
    return _error(400, 'That was not valid.')
  return _error(404, 'Not found.')


def query_from_path(raw_path):
  if '?' not in (raw_path or ''):
    return {}
  return parse_qs(raw_path.split('?', 1)[1], keep_blank_values=False)
