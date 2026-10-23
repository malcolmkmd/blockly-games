# Copyright 2026 Thinka
# SPDX-License-Identifier: Apache-2.0
"""Classroom roster and per-student progress on the teacher laptop.

The file lives in a data folder next to the Start Class launcher
(Thinka Coding Games/data/thinka-class.json). It survives restarts.
Python standard library only.
"""

import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time

ANIMALS = (
    'lion', 'elephant', 'zebra', 'giraffe', 'hippo', 'monkey',
    'penguin', 'frog', 'owl', 'butterfly', 'fish', 'bee',
)

PRIVATE_KEYS = (
    'thinkaTeacherPassword',
    'thinkaStudentSession',
    'thinkaSyncQueue',
)

_KEY_RE = re.compile(r'^[A-Za-z0-9_.:-]{1,80}$')
_MAX_VALUE = 200000
_MAX_KEYS = 4000
_MAX_STUDENTS = 80
_MAX_NAME = 24


def default_data_file():
  """Path of the roster file. THINKA_DATA_DIR overrides the folder."""
  env = os.environ.get('THINKA_DATA_DIR')
  if env:
    root = env
  else:
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.join(os.path.dirname(here), 'data')
  return os.path.join(root, 'thinka-class.json')


def empty_data():
  return {'version': 1, 'classes': {}, 'students': {}, 'tokens': {}}


def required_kind(record):
  """picture for Grades 1–3, pin when the teacher asks, else none."""
  grade = int(record.get('grade') or 0)
  if grade <= 3:
    return 'picture'
  if record.get('pinRequired'):
    return 'pin'
  return ''


def band_for_grade(grade):
  grade = int(grade or 0)
  if grade <= 3:
    return 'foundation'
  if grade <= 6:
    return 'intermediate'
  return 'senior'


def display_name(student):
  first = student.get('firstName') or ''
  initial = student.get('surnameInitial') or ''
  if initial:
    return first + ' ' + initial[:1].upper()
  return first


def _hash_secret(secret, salt):
  digest = hashlib.sha256((salt + '\n' + secret).encode('utf-8')).hexdigest()
  return digest


def canonical_picture(value):
  if not isinstance(value, list) or len(value) != 2:
    return None
  out = []
  for item in value:
    if not isinstance(item, str) or item not in ANIMALS:
      return None
    out.append(item)
  return '.'.join(out)


def canonical_pin(value):
  if isinstance(value, int):
    value = str(value)
  if not isinstance(value, str) or len(value) != 4 or not value.isdigit():
    return None
  return value


def clean_name(value):
  if not isinstance(value, str):
    return None
  text = ' '.join(value.replace('\u00a0', ' ').split())
  if not text or len(text) > _MAX_NAME:
    return None
  for ch in text:
    if ch.isalpha() or ch in " '-":
      continue
    return None
  return text


def clean_initial(value):
  if value is None:
    return ''
  if not isinstance(value, str):
    return None
  text = value.strip()
  if not text:
    return ''
  letter = text[0]
  if not letter.isalpha():
    return None
  return letter.upper()


def clean_grade(value):
  try:
    grade = int(value)
  except (TypeError, ValueError):
    return None
  if grade < 1 or grade > 9:
    return None
  return grade


def clean_class_name(value):
  if not isinstance(value, str):
    return None
  text = ' '.join(value.split())
  if not text or len(text) > 40:
    return None
  if any(ord(ch) < 32 for ch in text):
    return None
  return text


def parse_csv(text):
  """Small CSV reader. Returns a list of rows of strings."""
  if text is None:
    return []
  if isinstance(text, bytes):
    text = text.decode('utf-8', 'replace')
  src = str(text).replace('\r\n', '\n').replace('\r', '\n')
  rows = []
  row = []
  cell = []
  quoted = False
  i = 0
  while i < len(src):
    ch = src[i]
    if quoted:
      if ch == '"':
        if i + 1 < len(src) and src[i + 1] == '"':
          cell.append('"')
          i += 2
          continue
        quoted = False
        i += 1
        continue
      cell.append(ch)
      i += 1
      continue
    if ch == '"':
      quoted = True
      i += 1
      continue
    if ch == ',':
      row.append(''.join(cell).strip())
      cell = []
      i += 1
      continue
    if ch == '\n':
      row.append(''.join(cell).strip())
      cell = []
      if any(part.strip() for part in row):
        rows.append(row)
      row = []
      i += 1
      continue
    cell.append(ch)
    i += 1
  if cell or row:
    row.append(''.join(cell).strip())
    if any(part.strip() for part in row):
      rows.append(row)
  return rows


def _looks_like_header(row):
  if not row:
    return False
  first = row[0].strip().lower().replace(' ', '')
  return first in ('firstname', 'first', 'name', 'learner', 'student')


def progress_key_ok(key):
  return isinstance(key, str) and bool(_KEY_RE.match(key)) and key not in PRIVATE_KEYS


def game_done(progress, game):
  done = 0
  total = 0
  progress = progress or {}
  for track in game.get('tracks') or []:
    levels = int(track.get('levels') or 0)
    name = track.get('name') or ''
    total += levels
    for level in range(1, levels + 1):
      if progress.get(name + str(level)):
        done += 1
  return done, total


def lesson_flags(progress, lesson, grade):
  """Explainer flag, and exercise flag or the band's Maze levels."""
  progress = progress or {}
  parts = {}
  for part in lesson.get('parts') or []:
    parts[part['id']] = bool(progress.get(part.get('key')))
  if not parts.get('exercise'):
    band = band_for_grade(grade)
    need = int((lesson.get('exerciseLevels') or {}).get(band) or 0)
    track = lesson.get('exerciseTrack') or ''
    if need and track:
      finished = True
      for level in range(1, need + 1):
        if not progress.get(track + str(level)):
          finished = False
          break
      if finished:
        parts['exercise'] = True
  return parts


def csv_cell(value):
  text = '' if value is None else str(value)
  if text[:1] in ('=', '+', '-', '@'):
    text = "'" + text
  if any(ch in text for ch in ',"\n'):
    return '"' + text.replace('"', '""') + '"'
  return text


class ClassStore(object):
  def __init__(self, path):
    self.path = path
    self.lock = threading.Lock()
    self._ensure()

  def _ensure(self):
    folder = os.path.dirname(self.path)
    if folder:
      os.makedirs(folder, exist_ok=True)
    if not os.path.exists(self.path):
      self._write(empty_data())

  def _read(self):
    with open(self.path, 'r', encoding='utf-8') as handle:
      data = json.load(handle)
    if not isinstance(data, dict) or data.get('version') != 1:
      raise ValueError('roster file is not a Thinka class file')
    data.setdefault('classes', {})
    data.setdefault('students', {})
    data.setdefault('tokens', {})
    return data

  def _write(self, data):
    folder = os.path.dirname(self.path)
    if folder:
      os.makedirs(folder, exist_ok=True)
    tmp = self.path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as handle:
      json.dump(data, handle, ensure_ascii=False, indent=1, sort_keys=True)
      handle.write('\n')
    os.replace(tmp, self.path)

  def _mutate(self, fn):
    with self.lock:
      data = self._read()
      result = fn(data)
      self._write(data)
      return result

  def _view(self, fn):
    with self.lock:
      data = self._read()
      return fn(data)

  def list_classes(self):
    def read(data):
      rows = []
      for record in data['classes'].values():
        count = sum(1 for student in data['students'].values()
                    if student.get('classId') == record['id'])
        rows.append({
            'id': record['id'],
            'name': record['name'],
            'grade': record['grade'],
            'pinRequired': bool(record.get('pinRequired')),
            'secretKind': required_kind(record),
            'studentCount': count,
        })
      rows.sort(key=lambda row: (row['name'].lower(), row['id']))
      return rows
    return self._view(read)

  def create_class(self, name, grade, pin_required=False):
    cleaned = clean_class_name(name)
    grade = clean_grade(grade)
    if not cleaned or grade is None:
      return None, 'Type a class name and a grade from 1 to 9.'
    pin_required = bool(pin_required)

    def add(data):
      cid = 'c_' + secrets.token_hex(4)
      while cid in data['classes']:
        cid = 'c_' + secrets.token_hex(4)
      data['classes'][cid] = {
          'id': cid,
          'name': cleaned,
          'grade': grade,
          'pinRequired': pin_required,
          'created': int(time.time()),
      }
      return data['classes'][cid]
    record = self._mutate(add)
    return self._public_class(record, 0), None

  def update_class(self, class_id, fields):
    def change(data):
      record = data['classes'].get(class_id)
      if not record:
        return None, 'That class is not on this laptop.'
      if 'name' in fields:
        cleaned = clean_class_name(fields.get('name'))
        if not cleaned:
          return None, 'Type a class name.'
        record['name'] = cleaned
      if 'grade' in fields:
        grade = clean_grade(fields.get('grade'))
        if grade is None:
          return None, 'Grade must be from 1 to 9.'
        record['grade'] = grade
      if 'pinRequired' in fields:
        record['pinRequired'] = bool(fields.get('pinRequired'))
      return dict(record), None
    return self._mutate(change)

  def list_students(self, class_id):
    def read(data):
      record = data['classes'].get(class_id)
      if not record:
        return None
      rows = []
      for student in data['students'].values():
        if student.get('classId') != class_id:
          continue
        rows.append(self._public_student(student, record))
      rows.sort(key=lambda row: (row['firstName'].lower(), row['id']))
      return rows
    return self._view(read)

  def _public_class(self, record, count):
    return {
        'id': record['id'],
        'name': record['name'],
        'grade': record['grade'],
        'pinRequired': bool(record.get('pinRequired')),
        'secretKind': required_kind(record),
        'studentCount': count,
    }

  def _public_student(self, student, record):
    kind = required_kind(record)
    has_secret = bool(student.get('secretHash')) and student.get('secretKind') == kind
    return {
        'id': student['id'],
        'firstName': student['firstName'],
        'surnameInitial': student.get('surnameInitial') or '',
        'displayName': display_name(student),
        'secretKind': kind,
        'hasSecret': has_secret,
    }

  def add_student(self, class_id, first_name, surname_initial=''):
    first = clean_name(first_name)
    initial = clean_initial(surname_initial)
    if not first or initial is None:
      return None, 'Type a first name. The surname initial is one letter.'

    def add(data):
      record = data['classes'].get(class_id)
      if not record:
        return None, 'That class is not on this laptop.'
      count = sum(1 for student in data['students'].values()
                  if student.get('classId') == class_id)
      if count >= _MAX_STUDENTS:
        return None, 'This class already has %d students.' % _MAX_STUDENTS
      sid = 's_' + secrets.token_hex(4)
      while sid in data['students']:
        sid = 's_' + secrets.token_hex(4)
      student = {
          'id': sid,
          'classId': class_id,
          'firstName': first,
          'surnameInitial': initial,
          'secretKind': '',
          'secretSalt': '',
          'secretHash': '',
          'progress': {},
          'created': int(time.time()),
      }
      data['students'][sid] = student
      return self._public_student(student, record), None
    return self._mutate(add)

  def import_csv(self, class_id, text):
    rows = parse_csv(text)
    if rows and _looks_like_header(rows[0]):
      rows = rows[1:]

    def add(data):
      record = data['classes'].get(class_id)
      if not record:
        return None, ['That class is not on this laptop.']
      added = []
      errors = []
      count = sum(1 for student in data['students'].values()
                  if student.get('classId') == class_id)
      for index, row in enumerate(rows, start=1):
        if count >= _MAX_STUDENTS:
          errors.append('Stopped at %d students.' % _MAX_STUDENTS)
          break
        first = clean_name(row[0] if row else '')
        initial_raw = row[1] if len(row) > 1 else ''
        initial = clean_initial(initial_raw)
        if not first or initial is None:
          errors.append('Line %d skipped.' % index)
          continue
        sid = 's_' + secrets.token_hex(4)
        while sid in data['students']:
          sid = 's_' + secrets.token_hex(4)
        student = {
            'id': sid,
            'classId': class_id,
            'firstName': first,
            'surnameInitial': initial,
            'secretKind': '',
            'secretSalt': '',
            'secretHash': '',
            'progress': {},
            'created': int(time.time()),
        }
        data['students'][sid] = student
        added.append(self._public_student(student, record))
        count += 1
      return {'added': added, 'errors': errors}, None
    return self._mutate(add)

  def move_student(self, student_id, class_id):
    def move(data):
      student = data['students'].get(student_id)
      record = data['classes'].get(class_id)
      if not student or not record:
        return None, 'Choose a student and a class on this laptop.'
      count = sum(1 for other in data['students'].values()
                  if other.get('classId') == class_id and other['id'] != student_id)
      if count >= _MAX_STUDENTS:
        return None, 'That class is full.'
      student['classId'] = class_id
      return self._public_student(student, record), None
    return self._mutate(move)

  def remove_student(self, student_id):
    def remove(data):
      student = data['students'].pop(student_id, None)
      if not student:
        return None, 'That student is not on this laptop.'
      stale = [token for token, info in data['tokens'].items()
               if info.get('studentId') == student_id]
      for token in stale:
        data['tokens'].pop(token, None)
      return {'id': student_id}, None
    return self._mutate(remove)

  def reset_secret(self, student_id):
    def reset(data):
      student = data['students'].get(student_id)
      if not student:
        return None, 'That student is not on this laptop.'
      student['secretKind'] = ''
      student['secretSalt'] = ''
      student['secretHash'] = ''
      record = data['classes'].get(student['classId']) or {'grade': 1}
      return self._public_student(student, record), None
    return self._mutate(reset)

  def _set_secret(self, student, kind, secret):
    salt = secrets.token_hex(16)
    student['secretKind'] = kind
    student['secretSalt'] = salt
    student['secretHash'] = _hash_secret(secret, salt)

  def _check_secret(self, student, secret):
    salt = student.get('secretSalt') or ''
    digest = student.get('secretHash') or ''
    if not salt or not digest:
      return False
    got = _hash_secret(secret, salt)
    return hmac.compare_digest(got, digest)

  def _issue(self, data, student, record):
    token = secrets.token_urlsafe(24)
    data['tokens'][token] = {
        'studentId': student['id'],
        'issued': int(time.time()),
    }
    return {
        'ok': True,
        'token': token,
        'student': {
            'id': student['id'],
            'classId': record['id'],
            'className': record['name'],
            'grade': record['grade'],
            'displayName': display_name(student),
            'firstName': student['firstName'],
            'surnameInitial': student.get('surnameInitial') or '',
        },
        'progress': dict(student.get('progress') or {}),
    }

  def sign_in(self, class_id, student_id, picture=None, pin=None):
    def attempt(data):
      record = data['classes'].get(class_id)
      student = data['students'].get(student_id)
      if not record or not student or student.get('classId') != class_id:
        return {'ok': False, 'error': 'missing'}, None
      kind = required_kind(record)
      if kind == '':
        return self._issue(data, student, record), None
      provided = canonical_picture(picture) if kind == 'picture' else canonical_pin(pin if pin is not None else '')
      has = bool(student.get('secretHash')) and student.get('secretKind') == kind
      if not has:
        if not provided:
          return {
              'ok': False,
              'needsSecret': True,
              'secretKind': kind,
          }, None
        self._set_secret(student, kind, provided)
        return self._issue(data, student, record), None
      if not provided or not self._check_secret(student, provided):
        return {'ok': False, 'error': 'again', 'secretKind': kind}, None
      return self._issue(data, student, record), None
    result, _err = self._mutate(attempt)
    return result

  def sign_out(self, token):
    def drop(data):
      data['tokens'].pop(token, None)
      return {'ok': True}
    if not token:
      return {'ok': True}
    return self._mutate(drop)

  def _student_for_token(self, data, token):
    info = data['tokens'].get(token or '')
    if not info:
      return None
    return data['students'].get(info.get('studentId'))

  def get_progress(self, token):
    def read(data):
      student = self._student_for_token(data, token)
      if not student:
        return None
      return dict(student.get('progress') or {})
    return self._view(read)

  def put_progress(self, token, changes):
    if not isinstance(changes, dict):
      return None, 'Progress needs a list of keys.'

    def write(data):
      student = self._student_for_token(data, token)
      if not student:
        return None, 'sign-in'
      progress = student.setdefault('progress', {})
      saved = 0
      for key, value in changes.items():
        if not progress_key_ok(key):
          continue
        if value is None:
          if key in progress:
            progress.pop(key, None)
            saved += 1
          continue
        if not isinstance(value, str):
          value = str(value)
        if len(value) > _MAX_VALUE:
          return None, 'One save is too big.'
        progress[key] = value
        saved += 1
        if len(progress) > _MAX_KEYS:
          return None, 'Too many saved keys.'
      student['updated'] = int(time.time())
      return {'ok': True, 'saved': saved}, None
    return self._mutate(write)

  def report(self, class_id, catalog):
    def read(data):
      record = data['classes'].get(class_id)
      if not record:
        return None
      games = []
      for game in catalog.get('games') or []:
        _done, total = game_done({}, game)
        games.append({'id': game['id'], 'label': game['label'], 'total': total})
      lessons = []
      for lesson in catalog.get('lessons') or []:
        lessons.append({
            'id': lesson['id'],
            'label': lesson['label'],
            'parts': [part['id'] for part in lesson.get('parts') or []],
        })
      students = []
      for student in data['students'].values():
        if student.get('classId') != class_id:
          continue
        progress = student.get('progress') or {}
        game_cells = {}
        for game in catalog.get('games') or []:
          done, _total = game_done(progress, game)
          game_cells[game['id']] = done
        lesson_cells = {}
        for lesson in catalog.get('lessons') or []:
          flags = lesson_flags(progress, lesson, record['grade'])
          for part_id, flag in flags.items():
            lesson_cells[lesson['id'] + '_' + part_id] = bool(flag)
        students.append({
            'id': student['id'],
            'firstName': student['firstName'],
            'surnameInitial': student.get('surnameInitial') or '',
            'displayName': display_name(student),
            'games': game_cells,
            'lessons': lesson_cells,
        })
      students.sort(key=lambda row: (row['firstName'].lower(), row['id']))
      return {
          'class': self._public_class(record, len(students)),
          'games': games,
          'lessons': lessons,
          'students': students,
      }
    return self._view(read)

  def export_csv(self, catalog, class_id=None):
    def read(data):
      classes = []
      for record in data['classes'].values():
        if class_id and record['id'] != class_id:
          continue
        classes.append(record)
      classes.sort(key=lambda record: record['name'].lower())
      games = catalog.get('games') or []
      lessons = catalog.get('lessons') or []
      header = ['class', 'grade', 'firstName', 'surnameInitial']
      for game in games:
        header.append(game['id'])
      for lesson in lessons:
        for part in lesson.get('parts') or []:
          header.append(lesson['id'] + '_' + part['id'])
      lines = [','.join(header)]
      for record in classes:
        students = [student for student in data['students'].values()
                    if student.get('classId') == record['id']]
        students.sort(key=lambda student: student['firstName'].lower())
        for student in students:
          progress = student.get('progress') or {}
          cells = [
              record['name'],
              record['grade'],
              student['firstName'],
              student.get('surnameInitial') or '',
          ]
          for game in games:
            done, total = game_done(progress, game)
            cells.append('%d/%d' % (done, total))
          flags = {}
          for lesson in lessons:
            got = lesson_flags(progress, lesson, record['grade'])
            for part_id, flag in got.items():
              flags[lesson['id'] + '_' + part_id] = 'yes' if flag else ''
          for lesson in lessons:
            for part in lesson.get('parts') or []:
              cells.append(flags.get(lesson['id'] + '_' + part['id'], ''))
          lines.append(','.join(csv_cell(cell) for cell in cells))
      return '\ufeff' + '\n'.join(lines) + '\n'
    return self._view(read)

  def backup_bytes(self):
    def read(data):
      copy = {
          'version': 1,
          'classes': data.get('classes') or {},
          'students': data.get('students') or {},
      }
      return json.dumps(copy, ensure_ascii=False, indent=1, sort_keys=True).encode('utf-8') + b'\n'
    return self._view(read)

  def restore_bytes(self, raw):
    try:
      if isinstance(raw, bytes):
        incoming = json.loads(raw.decode('utf-8'))
      else:
        incoming = json.loads(raw)
    except (ValueError, UnicodeError):
      return None, 'That file is not a Thinka backup.'
    if not isinstance(incoming, dict) or incoming.get('version') != 1:
      return None, 'That file is not a Thinka backup.'
    classes = incoming.get('classes')
    students = incoming.get('students')
    if not isinstance(classes, dict) or not isinstance(students, dict):
      return None, 'That file is not a Thinka backup.'
    for record in classes.values():
      if not isinstance(record, dict) or not record.get('id') or not record.get('name'):
        return None, 'A class in that file is missing a name.'
    for student in students.values():
      if not isinstance(student, dict) or not student.get('id'):
        return None, 'A student in that file could not be read.'
      if not isinstance(student.get('progress') or {}, dict):
        return None, 'Saved progress in that file could not be read.'
      progress = {}
      for key, value in (student.get('progress') or {}).items():
        if progress_key_ok(key) and isinstance(value, str) and len(value) <= _MAX_VALUE:
          progress[key] = value
      student['progress'] = progress
    cleaned = {
        'version': 1,
        'classes': classes,
        'students': students,
        'tokens': {},
    }

    def replace(_data):
      _data.clear()
      _data.update(cleaned)
      return {
          'ok': True,
          'classes': len(classes),
          'students': len(students),
      }, None
    return self._mutate(replace)
