# Thinka Blockly Games (offline-first)

Thinka’s classroom fork of [Google Blockly Games](https://github.com/google/blockly-games) for [Thinka.org.za](https://thinka.org.za). It teaches programming with Maze, Bird, Turtle, Movie, Music, Pond, Puzzle, the Keys typing game (lessons, race, and code words), and the Arcade skills game (mouse and keyboard practice with class high scores).

This product is **offline-first**. After a build, the games run from a local folder or ZIP. There is no App Engine backend, no gallery, and no runtime network.

The shared teacher password (built-in default `thinka`) unlocks sequential level locks. A teacher can change or remove it from the **Teacher** link on the hub (`appengine/teacher.html`). That choice is stored in this browser’s `localStorage` on this computer. With the password removed, locked levels open with no password prompt.

**Start Class** also keeps a class roster on the teacher laptop. Students on the classroom Wi-Fi open the games address, tap their class, then tap their name. Grades 1–3 choose two animal pictures, in order. Grades 4–9 can be set to use a 4-digit PIN. Progress for the signed-in student is stored in `data/thinka-class.json` next to the Start Class launcher and follows that child to another laptop. Solo play from **START HERE** does not ask for a name and keeps progress in that browser only. The class roster page is `appengine/class.html`, behind the teacher password.

The hub **Lessons** tile opens `appengine/lessons.html`. Week 1 is Sequencing: a short explainer, then Maze. Foundation (Gr 1–3) plays Maze level 1 in pairs, Intermediate (Gr 4–6) plays levels 1–2, and Senior (Gr 7–9) plays levels 1–3. Weeks 2–10 are listed as coming soon. Lesson text lives in `appengine/lessons/outline.js`.

The UI uses the **Thinka.org.za** visual system: green-black surfaces (`#030A03`), orange glow CTAs (`#FF4500`), and playful tile accents. The hub is **static HTML** (`appengine/index.html` + `index/hub.js`) so it looks right without `make games`. In-game Blockly workspaces stay light. Tokens live in `appengine/common/thinka-theme.css`. Fredoka and Nunito are bundled under `appengine/common/fonts/` (no CDN). Rebuild with `make games` after changing a **game** template (`appengine/{maze,bird,...}/src/*.js`).

Serve the hub at `http://127.0.0.1:8088/` (same page as `http://[::]:8088/`):

```bash
python3 serve.py --port 8088
```

That serves `appengine/` with no-cache headers so a leftover `index/generated/compressed.js` cannot paint the old Blockly path. This also works:

```bash
cd appengine
python3 -m http.server 8088
```

## Requirements (build machine only)

`make deps` downloads libraries. You need:

- `make`, `python3`, `java`, `wget`, `git`, `zip`, `node` (for unit tests)

Solo play needs only a web browser. Hosting a class Race also needs Python 3 on the teacher laptop (the standard library only — no extra packages).

## Build

```bash
make deps      # download Blockly, Ace, SoundJS, JS-Interpreter, Closure Compiler
make games     # compile each game into appengine/<game>/generated/compressed.js
make test      # teacher-unlock rules + offline-first + theme guardrails
make offline   # write offline/Thinka-Coding-Games-offline.zip
```

`make deps` needs internet. Playing the built games does not.

### Try Race (classroom WiFi)

Race is a 30 second typing race for the class. The teacher laptop is the host. A plain file server can show the page, but students cannot join.

Teachers do not use a terminal. In the offline pack they double-click **Start Class (Mac)** or **Start Class (Windows)**. That starts this server, opens the teacher page, and shows the address students type. From a checkout, the same server is:

```bash
python3 serve.py --classroom --port 8088
```

1. The teacher page opens on this laptop and hosts the class.
2. Read the address on that screen aloud, or let students scan the code. Students on the same Wi-Fi open it and join with a name.
3. Pick a computer speed and press **Start**. The sentence changes on its own during the 30 seconds, and everyone gets the new line at the same time. The track stays on screen while everyone types. If fewer than four students join, computer racers fill the rest. They share a difficulty, and each one is a different speed. Correct letters move the car. Five in a row counts double. Ten in a row earns a shield. Three wrong letters in a row knock the car back.
4. At 30 seconds the teacher screen shows the top 3. **New race** starts fresh.

### Try Keys (typing game)

After `make games` (or just `make keys` once `common` has been built):

1. Open `http://127.0.0.1:8088/` and click the **Keys** tile.
2. **Lessons** — 8 levels, home row → words → a short sentence. Locked levels use the teacher password `thinka`.
3. **Race** — 5 short tracks. The car moves on every correct key.
4. **Code** — 6 levels typing `if`, `else`, `while`, `function`, `print`, and `{ }`.

Progress is stored as `keys_lessonsN`, `keys_raceN`, and `keys_codeN` in `localStorage`.

### Try Arcade (mouse and keyboard skills)

Levels and zones unlock in order. A locked level or zone asks for the teacher password (`thinka`, unless a teacher changed it on this computer). With the password removed, they open straight away. Skipping a level does not mark it complete.

1. Open `http://127.0.0.1:8088/` and click the **Arcade** tile.
2. Tap **Playing as** and type a name. Scores are filed under that name.
3. Five zones, six levels each (two more than the first Arcade release). Pop, Drag, Zap, and Combo open slower than they used to, and their last level is longer — more bubbles or keys, or a longer drag clock — while staying slower than the old finales. Catch uses the original fall speed and basket width across six levels, and its last level is a little longer than the old 16-drop finale. The first visit to a zone shows a how-to card (the controls, and the goal in one line). **Let's go**, Enter, or Space starts the round. **How to play** brings the card back. The games are **Pop** (click or tap the bubbles, dodge the bombs), **Drag** (drop shapes on their outlines), **Catch** (arrow keys only, catch the stars), **Zap** (press the key that lights up), and **Combo** (click the target, then press its letter).
4. **Champions** in the header shows the top five per level plus the overall ranking.

Scoring is the same everywhere: a hit is 100 points plus a streak bonus, a miss costs 25, and finishing early pays a time bonus. Two stars at the level's par score, three at its target. Speed, size, timers, and Catch's basket width live as named arrays in `appengine/arcade/src/levels.js`.

Progress is stored as `arcade_popN`, `arcade_dragN`, `arcade_catchN`, `arcade_zapN`, and `arcade_comboN`. The leaderboard lives in `arcade_scores` and the current player in `arcade_player`; the hub's **Clear data** button removes all of them.

### Reboot

Reboot is a story game in two parts, about 50 minutes end to end. The player is the computer helper sent to switch off PATCH, a chatty 1990s building computer that would rather stay awake.

**Part 1 (acts 1-4, about 20 minutes)** escalates from friendly clicking to a keyboard-only emergency: mouse precision, dragging, typing, and the special keys `Tab`, `Shift+Tab`, `Esc`, `Space`, the arrow keys and `Ctrl+Enter`. It ends on a choice — erase PATCH, or copy it to a safe drive first — followed by a celebration and a report card.

**Part 2 (acts 5-10, about 30 minutes)** unlocks at the bottom of that celebration, when a second machine wakes up in the basement. NANA has been asleep since 1984 and wants to know where PATCH is; what it hears back depends on the choice upstairs, and a few lines change accordingly. The six acts drill the next layer of skills:

1. **Who turned this on?** double-click into folders, breadcrumbs, `Shift+click` ranges, `Ctrl+click` extras, renaming.
2. **Make a backup** `Ctrl+A`, `Ctrl+C`, `Ctrl+V`, `Ctrl+Z` and `Ctrl+S`, with a visible clipboard tray.
3. **The old manual** scrolling by wheel, scrollbar and `Page Down` / `End`, then a find box.
4. **The keypad** serial numbers, dates, times and a symbol password (`Shift` for symbols).
5. **Fix the message** repairing text in place with `Home`, `End`, the arrows, `Backspace` and `Delete`.
6. **Both machines** everything at once, finishing on a three-key combo.

**Easy or hard** is the first question the game asks, before anything starts. On **easy** a student can retry forever, each attempt comes with a tip and a slightly longer timer, and nothing is ever lost. On **hard** they get **three lives**, shown as hearts in the top bar, and timers stay fixed. Every failed job costs a life; lose all three and the whole act restarts from its title card with the lives refilled. The replayed dialogue runs at speed, since they have already read it.

**Finishing all ten acts earns a certificate.** The game asks for the player's name and prints an award — "completed PROJECT REBOOT" with their time, typing accuracy and the difficulty they played — styled for paper, so **Print it** produces a clean black-on-white certificate for the classroom wall. The name is kept in `reboot_name` for reprints.

Key chips adapt to the machine: Windows and Chromebooks are told `CTRL`, Apple hardware `CMD`. Both modifiers are accepted either way.

Unlike the other games, `appengine/reboot.html` is one self-contained file — markup, styles, logic and synthesised audio — with no build step and no Closure pass. Edit it directly; `make games` does not touch it, and `node build/test_reboot.js` guards its structure.

A procedural soundtrack plays under the story: pad, pulsing bass, arpeggio, lead, and a soft kick and hat, with delay and reverb. It is generated in the browser, so there is no audio file to fetch. The **♪ MUSIC** button in the top-right corner turns it off and remembers that choice in `reboot_music`. Music starts on the first click or keypress, and it fades out when the tab is hidden or when the player leaves for the hub.

Each finished act writes `reboot1` through `reboot10`, so the hub card fills up gradually and a student who stops halfway keeps their place. Once acts 1-4 are recorded the title screen offers **Continue Part 2**, which is how a second lesson picks up where the first left off. The chosen ending lives in `reboot_ending`, the furthest part in `reboot_part`, the certificate name in `reboot_name`, and the music choice in `reboot_music`; **Clear data** removes all of them, so the next student on a shared computer hears the theme again.

The `appengine/` folder is the static web root (legacy name from upstream). It is not an App Engine app.

## Package and play offline

1. Run `make deps && make games && make offline`.
2. Copy `offline/Thinka-Coding-Games-offline.zip` to classroom computers.
3. Unzip. The folder inside is `Thinka Coding Games/`.
4. Solo play: double-click `START HERE - Thinka Games.html`.
5. Class Race: double-click `Start Class (Mac).command` or `Start Class (Windows).bat`. Leave that window open. Students on the same Wi-Fi open the address it shows.

The ZIP contains the games under `game-files/`, the two launchers, `README.txt`, and the Python server those launchers run (`server/`). It does not contain source trees, tests, build tools, uncompressed JS, or `.git`.

Hosting the race needs Python 3. A no-Python double-click app (for example a PyInstaller binary) is not in the pack: those binaries have to be built on a Mac and on a Windows PC, and this checkout cannot produce both. Solo games do not need Python.

You can also open `appengine/index.html` the same way after `make games` (debug/uncompressed JS needs `sessionStorage.debug = 1`).

### Verify with no network

1. Unplug ethernet / enable airplane mode (or DevTools → Network → Offline).
2. Open the launcher or `index.html`.
3. Play Maze (and any other game): run a level, confirm the next level unlocks, confirm a locked level asks for the teacher password (built-in default `thinka`, unless a teacher changed it on this computer).
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

Open the games hub and use the small **Teacher** link in the footer (not a game tile). That page is `teacher.html`.

- **Fresh browser:** the password is the built-in one, `thinka` (`ThinkaConfig.TEACHER_PASSWORD` in `appengine/src/thinka.config.js`). You do not need to edit that file or rebuild to change it for one computer.
- **Change it:** enter the current password, then type the new one twice. It is saved as a salted SHA-256 hash in `localStorage` (`thinkaTeacherPassword`). The page uses `crypto.subtle` when the browser provides it, including under `file://` when that API is there, and a small JavaScript SHA-256 otherwise. The password text is not stored.
- **Reset to default:** enter the current password, then **Reset to default (thinka)**. That clears the saved choice. The built-in password `thinka` works again, and locked levels ask for it.
- **Remove it:** enter the current password, then **Remove password**. The page stores an explicit `off` flag. Locked levels, locked Maze topics, and locked Arcade levels and zones then open straight away — the password dialog does not appear. In Reboot, Part 2 is offered from the title screen as well. Race is a live class race and does not use this password.
- **Turn it back on:** with the password off, the settings page opens directly. Set a new password there.
- **This computer only:** the note on the page says the setting applies to this browser on this computer. The password stays on that computer, in that browser. Solo play progress stays there too. A class hosted with Start Class keeps each child's progress in `data/thinka-class.json` on the teacher laptop.
- **Class roster:** the same page links to the roster. Create a class (name and grade), add students, import a CSV (`First name, surname initial`), move or remove a student, and reset a picture password or PIN. The progress table is per student, by game and lesson. Download a CSV or a backup of the whole data file, and restore that file from a USB stick.
- **Reset progress:** the same page can clear student solutions, stars, scores, and unlocks on this computer. The password setting stays. The hub **Clear data** button also leaves the password alone.
- Forgetting a custom password: use **Reset to default (thinka)** on that page, or clear this site’s data for Thinka Games in the browser. The built-in password `thinka` comes back. This is a classroom soft gate, not authentication.

## License

Apache-2.0. Upstream Blockly Games is Copyright Google LLC. Thinka classroom additions (teacher unlock, offline-first packaging, visual theme) follow the same license header style.
