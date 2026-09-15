# Thinka Blockly Games (offline-first)

Thinka’s classroom fork of [Google Blockly Games](https://github.com/google/blockly-games) for [Thinka.org.za](https://thinka.org.za). It teaches programming with Maze, Bird, Turtle, Movie, Music, Pond, and Puzzle.

This product is **offline-first**. After a build, the games run from a local folder or ZIP. There is no App Engine backend, no gallery, and no runtime network.

The shared teacher password (default `thinka`, set in `appengine/src/thinka.config.js`) unlocks sequential level locks. Progress and unlocks stay in the browser’s `localStorage`.

The UI uses the **Thinka.org.za** visual system: green-black surfaces (`#030A03`), orange glow CTAs (`#FF4500`), and playful tile accents. The hub is **static HTML** (`appengine/index.html` + `index/hub.js`) so it looks right without `make games`. In-game Blockly workspaces stay light. Tokens live in `appengine/common/thinka-theme.css`. Fredoka and Nunito are bundled under `appengine/common/fonts/` (no CDN). Rebuild with `make games` after changing a **game** template (`appengine/{maze,bird,...}/src/*.js`).

From the repo root, `python3 -m http.server 8088` opens `http://localhost:8088/` (redirects into `appengine/`). Or serve `appengine/` directly.

## Requirements (build machine only)

`make deps` downloads libraries. You need:

- `make`, `python3`, `java`, `wget`, `git`, `zip`, `node` (for unit tests)

Runtime play needs only a web browser.

## Build

```bash
make deps      # download Blockly, Ace, SoundJS, JS-Interpreter, Closure Compiler
make games     # compile each game into appengine/<game>/generated/compressed.js
make test      # teacher-unlock rules + offline-first + theme guardrails
make offline   # write offline/thinka-blockly-games.zip
```

`make deps` needs internet. Playing the built games does not.

The `appengine/` folder is the static web root (legacy name from upstream). It is not an App Engine app.

## Package and play offline

1. Run `make deps && make games && make offline`.
2. Copy `offline/thinka-blockly-games.zip` to classroom computers.
3. Unzip. Open `thinka.html` (or `blockly-games.html`).

Best experience: serve the unzipped folder so all games share one origin (Chrome isolates `localStorage` per `file://` URL):

```bash
cd path/to/unzipped
python3 -m http.server 8080
# open http://localhost:8080/blockly-games/index.html
```

You can also open `appengine/index.html` the same way after `make games` (debug/uncompressed JS needs `sessionStorage.debug = 1`).

### Verify with no network

1. Unplug ethernet / enable airplane mode (or DevTools → Network → Offline).
2. Open the launcher or `index.html`.
3. Play Maze (and any other game): run a level, confirm the next level unlocks, confirm a locked level asks for the teacher password (`thinka`).
4. Reload; progress and the unlock should still be there.
5. Use **Clear data** on the index page (when served from one origin) to reset progress and unlocks.

## What was removed

These needed a server or the internet at runtime and are gone:

- App Engine deploy (`app.yaml`, `deploy.sh`, cron/index yaml)
- `/storage` cloud save and “share by link”
- Gallery app + `/gallery-api` submit/view/admin + Reddit redirects
- Client POSTs to `/errorReporter` and Google Analytics
- Admin cloud tools page

What stays: gameplay, sequential locks, teacher password, local progress, language packs, local assets after `make deps`.

## Teacher password

Edit `ThinkaConfig.TEACHER_PASSWORD` in `appengine/src/thinka.config.js`, then `make games`. One password unlocks any locked level. This is a classroom soft gate, not authentication.

## License

Apache-2.0. Upstream Blockly Games is Copyright Google LLC. Thinka classroom additions (teacher unlock, offline-first packaging, visual theme) follow the same license header style.
