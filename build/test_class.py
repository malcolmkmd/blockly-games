#!/usr/bin/env python3
# Copyright 2026 Thinka
# SPDX-License-Identifier: Apache-2.0
"""Class roster API. Run: python3 build/test_class.py"""

import json
import os
import shutil
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import class_api
import class_store
from class_store import ANIMALS, ClassStore
import serve as serve_mod


FAILURES = []


def check(name, cond):
  if cond:
    print('ok  ' + name)
  else:
    FAILURES.append(name)
    print('FAIL ' + name)


def api(port, method, path, body=None):
  data = None if body is None else json.dumps(body).encode('utf-8')
  req = urllib.request.Request(
      'http://127.0.0.1:%d%s' % (port, path), data=data, method=method)
  if data is not None:
    req.add_header('Content-Type', 'application/json')
  try:
    with urllib.request.urlopen(req, timeout=5) as resp:
      raw = resp.read()
      kind = resp.headers.get('Content-Type') or ''
      if kind.startswith('application/json'):
        return resp.status, json.loads(raw.decode('utf-8')), raw
      return resp.status, raw.decode('utf-8'), raw
  except urllib.error.HTTPError as err:
    raw = err.read()
    try:
      payload = json.loads(raw.decode('utf-8'))
    except ValueError:
      payload = raw
    return err.code, payload, raw


def test_store(path):
  store = ClassStore(path)
  again = ClassStore(path)
  check('roster file survives a new store', again.list_classes() == [])
  created, err = store.create_class('Tuesday', 2, pin_required=True)
  check('grade 2 is created', created and not err and created['grade'] == 2)
  check('grades 1-3 stay on pictures', created['secretKind'] == 'picture')
  older, err = store.create_class('Friday', 7, True)
  check('older class can require a PIN', older and older['secretKind'] == 'pin')
  bad, err = store.create_class('', 3)
  check('empty class name is refused', bad is None and err)
  grade, err = store.create_class('Nope', 0)
  check('grade 0 is refused', grade is None)
  amahle, err = store.add_student(created['id'], '  Amahle ', 'k')
  check('name is trimmed and initial is a capital',
        amahle and amahle['displayName'] == 'Amahle K' and not err)
  thabo, err = store.add_student(created['id'], 'Thabo', '')
  check('surname initial is optional', thabo and thabo['displayName'] == 'Thabo')
  bad_name, err = store.add_student(created['id'], 'A1', '')
  check('digits in a name are refused', bad_name is None)
  imported, err = store.import_csv(created['id'], 'firstName,surnameInitial\nLerato,M\n"Pieter",\nbad name 9\n')
  check('csv import adds two and skips one',
        imported and len(imported['added']) == 2 and imported['errors'])
  names = [row['firstName'] for row in store.list_students(created['id'])]
  check('students are listed', names == ['Amahle', 'Lerato', 'Pieter', 'Thabo'])
  needs = store.sign_in(created['id'], amahle['id'])
  check('picture password is chosen on first sign-in',
        needs and needs.get('needsSecret') and needs.get('secretKind') == 'picture')
  wrong_shape = store.sign_in(created['id'], amahle['id'], picture=['lion'])
  check('one animal is not enough to set the password', wrong_shape.get('needsSecret'))
  first = store.sign_in(created['id'], amahle['id'], picture=['lion', 'owl'])
  check('two animals sign Amahle in', first.get('ok') and first.get('token') and first['student']['displayName'] == 'Amahle K')
  check('new student progress is empty', first['progress'] == {})
  denied = store.sign_in(created['id'], amahle['id'], picture=['owl', 'lion'])
  check('animal order matters', denied.get('error') == 'again' and not denied.get('ok'))
  put, err = store.put_progress(first['token'], {
      'maze_g1_sequence1': '<xml id="a"/>',
      'maze_g1_sequence1_stars': '2',
      'thinkaTeacherPassword': 'nope',
      'thinkaLesson_w1_explainer': '1',
  })
  check('progress is saved and the teacher password is not',
        put and put['ok'] and err is None)
  saved = store.get_progress(first['token'])
  check('saved keys come back',
        saved.get('maze_g1_sequence1') == '<xml id="a"/>' and
        saved.get('thinkaLesson_w1_explainer') == '1' and
        'thinkaTeacherPassword' not in saved)
  thabo_in = store.sign_in(created['id'], thabo['id'], picture=['frog', 'bee'])
  check('Thabo has his own empty progress',
        thabo_in.get('ok') and thabo_in['progress'] == {})
  store.put_progress(thabo_in['token'], {'maze_g1_sequence1': '<xml id="b"/>'})
  check('Amahle still has her own maze',
        store.get_progress(first['token']).get('maze_g1_sequence1') == '<xml id="a"/>')
  check('Thabo does not see Amahle',
        store.get_progress(thabo_in['token']).get('maze_g1_sequence1') == '<xml id="b"/>')
  store.put_progress(first['token'], {'maze_g1_sequence1': None})
  check('a null change deletes one key',
        'maze_g1_sequence1' not in store.get_progress(first['token']) and
        store.get_progress(first['token']).get('thinkaLesson_w1_explainer') == '1')
  reset, err = store.reset_secret(amahle['id'])
  check('reset clears the picture password', reset and not reset['hasSecret'] and not err)
  changed = store.sign_in(created['id'], amahle['id'], picture=['zebra', 'fish'])
  check('the new animals sign her in', changed.get('ok'))
  check('progress is still there after a new password',
        store.get_progress(changed['token']).get('thinkaLesson_w1_explainer') == '1')
  old = store.sign_in(created['id'], amahle['id'], picture=['lion', 'owl'])
  check('the old animals no longer work', old.get('error') == 'again')
  moved, err = store.move_student(thabo['id'], older['id'])
  check('Thabo can move to the older class', moved and moved['secretKind'] == 'pin' and not err)
  pin_need = store.sign_in(older['id'], thabo['id'])
  check('the new class asks for a PIN', pin_need.get('needsSecret') and pin_need.get('secretKind') == 'pin')
  bad_pin = store.sign_in(older['id'], thabo['id'], pin='12')
  check('a short PIN does not set the secret', bad_pin.get('needsSecret'))
  pin_ok = store.sign_in(older['id'], thabo['id'], pin='2468')
  check('a 4-digit PIN signs him in', pin_ok.get('ok'))
  check('his maze came with him',
        store.get_progress(pin_ok['token']).get('maze_g1_sequence1') == '<xml id="b"/>')
  no_pin = store.sign_in(older['id'], thabo['id'])
  check('PIN is required the next time', no_pin.get('error') == 'again')
  open_class, err = store.create_class('Club', 6, False)
  naledi, err = store.add_student(open_class['id'], 'Naledi', '')
  tap = store.sign_in(open_class['id'], naledi['id'])
  check('grade 6 without a PIN signs in on the name', tap.get('ok') and not tap.get('needsSecret'))
  gone, err = store.remove_student(naledi['id'])
  check('a student can be removed', gone and not err and store.list_students(open_class['id']) == [])
  check('a removed student cannot sign in',
        store.sign_in(open_class['id'], naledi['id']).get('error') == 'missing')
  catalog = class_api.load_catalog()
  report = store.report(created['id'], catalog)
  by_name = {row['displayName']: row for row in report['students']}
  check('report shows the explainer and not Thabo',
        by_name['Amahle K']['lessons'].get('w1_explainer') and
        'Thabo' not in by_name)
  # Maze level 1 counts as the foundation exercise even without the flag.
  store.put_progress(changed['token'], {'maze_g1_sequence1': '<xml id="a"/>'})
  report = store.report(created['id'], catalog)
  by_name = {row['displayName']: row for row in report['students']}
  check('maze level 1 counts as the week 1 exercise for grade 2',
        by_name['Amahle K']['lessons'].get('w1_exercise') and
        by_name['Amahle K']['games']['maze'] >= 1)
  csv_text = store.export_csv(catalog, created['id'])
  check('csv export names Amahle', 'Amahle' in csv_text and 'w1_explainer' in csv_text.split('\n')[0])
  backup = store.backup_bytes()
  check('backup is the data file without live tokens',
        b'"students"' in backup and b'"tokens"' not in backup)
  other = path + '.other.json'
  fresh = ClassStore(other)
  restored, err = fresh.restore_bytes(backup)
  check('restore brings the classes back',
        restored and restored['students'] >= 3 and not err)
  signed = fresh.sign_in(created['id'], amahle['id'], picture=['zebra', 'fish'])
  check('restored picture password still works', signed.get('ok'))
  check('restored progress is hers',
        fresh.get_progress(signed['token']).get('maze_g1_sequence1') == '<xml id="a"/>')
  bad_file, err = fresh.restore_bytes(b'{"version": 2}')
  check('a bad backup is refused', bad_file is None and err)
  check('refused restore leaves the good file',
        len(fresh.list_classes()) >= 2)
  check('animal list is the picture set', 'lion' in ANIMALS and len(ANIMALS) == 12)
  # Re-open from disk.
  disk = ClassStore(path)
  check('disk still has Tuesday after a restart',
        any(row['name'] == 'Tuesday' for row in disk.list_classes()))


def test_http(path):
  class_api.set_store(ClassStore(path))
  handler = serve_mod.NoCacheHandler
  httpd = ThreadingHTTPServer(('127.0.0.1', 0), handler)
  port = httpd.server_address[1]
  thread = threading.Thread(target=httpd.serve_forever, daemon=True)
  thread.start()
  try:
    status, body, _raw = api(port, 'GET', '/class/api/ping')
    check('ping lists animals', status == 200 and body.get('ok') and 'owl' in body.get('animals'))
    status, body, _raw = api(port, 'POST', '/class/api/classes', {'name': 'Monday', 'grade': 3})
    check('http create class', status == 200 and body['class']['name'] == 'Monday')
    class_id = body['class']['id']
    status, body, _raw = api(port, 'POST', '/class/api/classes/%s/students' % class_id,
                             {'firstName': 'Siya', 'surnameInitial': 'D'})
    check('http add student', status == 200 and body['student']['displayName'] == 'Siya D')
    student_id = body['student']['id']
    status, body, _raw = api(port, 'POST', '/class/api/signin', {
        'classId': class_id, 'studentId': student_id, 'picture': ['bee', 'frog']})
    check('http sign-in', status == 200 and body.get('token'))
    token = body['token']
    status, body, _raw = api(port, 'PUT', '/class/api/progress', {
        'token': token, 'changes': {'bird1': 'done'}})
    check('http put progress', status == 200 and body.get('saved') == 1)
    status, body, _raw = api(port, 'GET', '/class/api/progress?token=' + token)
    check('http get progress', status == 200 and body['progress'].get('bird1') == 'done')
    status, body, _raw = api(port, 'GET', '/class/api/progress?token=nope')
    check('bad token is refused', status == 401)
    status, body, _raw = api(port, 'GET', '/class/api/export.csv?classId=' + class_id)
    check('csv download', status == 200 and 'Siya' in body)
    status, body, raw = api(port, 'GET', '/class/api/backup')
    check('backup download', status == 200 and b'"Monday"' in raw)
    status, body, _raw = api(port, 'POST', '/class/api/signout', {'token': token})
    check('sign-out', status == 200 and body.get('ok'))
    status, body, _raw = api(port, 'GET', '/class/api/progress?token=' + token)
    check('signed-out token stops working', status == 401)
  finally:
    httpd.shutdown()


def main():
  tmp = tempfile.mkdtemp(prefix='thinka-class-')
  try:
    test_store(os.path.join(tmp, 'thinka-class.json'))
    test_http(os.path.join(tmp, 'http.json'))
  finally:
    shutil.rmtree(tmp, ignore_errors=True)
    class_api.set_store(None)
  if FAILURES:
    print('\n%d failed' % len(FAILURES))
    sys.exit(1)
  print('\nclass tests passed')


if __name__ == '__main__':
  main()
