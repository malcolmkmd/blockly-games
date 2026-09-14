Thinka Blockly Games — offline classroom pack
=============================================

This ZIP is a complete, offline-first copy of Thinka’s Blockly Games
(https://thinka.org.za). It does not need App Engine, Python, or the
internet after you unzip it.

How to play
-----------

1. Unzip this archive.

2. Either:
   a) Open thinka.html (or blockly-games.html) in a web browser, or
   b) Serve the folder with any static file server, then open index.html.

   Recommended for Chrome (progress is shared across games):

     python3 -m http.server 8080
     # then visit http://localhost:8080/blockly-games/index.html

   Opening files directly (file://) works for playing a single game.
   Chrome isolates localStorage per file:// URL, so the index page
   gauges and “Clear data” may not see progress from maze.html etc.
   A local static server avoids that.

3. Teacher password (default: thinka) unlocks a locked level. Progress
   and unlocks are stored in that browser’s localStorage only.

What is not included
--------------------

- Cloud “share by link” / App Engine storage
- Online gallery (view / submit)
- Error-report POSTs and Google Analytics
- Reddit gallery redirects
- Any runtime CDN or backend

Build this ZIP from source with:  make deps && make games && make offline
See the repository README for details.
