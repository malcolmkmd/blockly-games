##############################
# Definitions
##############################

# appengine/ is the static web root (legacy folder name from Blockly Games).
# There is no App Engine backend. Runtime is offline-first HTML/JS/CSS.
SHELL := /bin/bash
REQUIRED_BINS = git wget java python3

##############################
# Rules
##############################

all: deps games

index:
	@echo "Hub is static HTML (appengine/index.html + index/hub.js)."
	rm -f appengine/index/generated/compressed.js
	rm -f appengine/index/generated/uncompressed.js

serve:
	python3 build/serve.py --port 8088

puzzle: common
	python3 build/compress.py puzzle

maze: common
	python3 build/compress.py maze

bird: common
	python3 build/compress.py bird

turtle: common
	python3 build/compress.py turtle

movie: common
	python3 build/compress.py movie

music: common
	python3 build/compress.py music

pond-tutor: common
	python3 build/compress.py pond/tutor

pond-duck: common
	python3 build/compress.py pond/duck

keys: common
	python3 build/compress.py keys

arcade: common
	python3 build/compress.py arcade

games: index puzzle maze bird turtle movie music pond-tutor pond-duck keys arcade

common:
	@# Remove ignored output left by pre-offline builds of the deleted gallery.
	rm -rf appengine/gallery appengine/gallery_api
	@echo "Converting messages.js to JSON for Translatewiki."
	python3 build/messages_to_json.py
	@echo "Converting JSON from Translatewiki to message files."
	python3 build/json_to_js.py
	@echo

test:
	node build/test_teacher_unlock.js
	node build/test_offline_first.js
	node build/test_thinka_theme.js
	node build/test_maze_levels.js
	node build/test_keys.js
	node build/test_arcade.js
	node build/test_reboot.js
	python3 build/test_race.py
	node build/test_race_qr.js
	python3 build/test_class.py
	node build/test_class_sync.js
	node build/test_class_browser.js
	node build/test_lessons.js
	node build/test_lessons_play.js

deps:
	$(foreach bin,$(REQUIRED_BINS),\
	    $(if $(shell command -v $(bin) 2> /dev/null),$(info Found `$(bin)`),$(error Please install `$(bin)`)))
	mkdir -p build/third-party-downloads
	wget -N https://unpkg.com/google-closure-compiler-java/compiler.jar;
	mv -f compiler.jar build/third-party-downloads/closure-compiler.jar;

	mkdir -p appengine/third-party
	wget -N https://unpkg.com/@babel/standalone@7.14.8/babel.min.js
	mv babel.min.js appengine/third-party/
	@# Build-time clones only. Runtime uses the copied local files.
	rm -rf build/third-party-downloads/ace-builds
	git clone --depth 1 --filter=blob:none --sparse https://github.com/ajaxorg/ace-builds.git build/third-party-downloads/ace-builds
	git -C build/third-party-downloads/ace-builds sparse-checkout set src-min-noconflict
	rm -rf appengine/third-party/ace
	cp -R build/third-party-downloads/ace-builds/src-min-noconflict appengine/third-party/ace

	rm -rf appengine/third-party/blockly
	git clone --depth 1 https://github.com/NeilFraser/blockly-for-BG.git appengine/third-party/blockly

	rm -rf build/third-party-downloads/SoundJS
	git clone --depth 1 --filter=blob:none --sparse https://github.com/CreateJS/SoundJS.git build/third-party-downloads/SoundJS
	git -C build/third-party-downloads/SoundJS sparse-checkout set lib
	rm -rf appengine/third-party/SoundJS
	cp -R build/third-party-downloads/SoundJS/lib appengine/third-party/SoundJS

	cp third-party/base.js appengine/third-party/
	cp -R third-party/soundfonts appengine/third-party/

	rm -rf appengine/third-party/JS-Interpreter
	git clone --depth 1 https://github.com/NeilFraser/JS-Interpreter.git appengine/third-party/JS-Interpreter
	@# Compile JS-Interpreter using SIMPLE_OPTIMIZATIONS because the Music game needs to mess with the stack.
	java -jar build/third-party-downloads/closure-compiler.jar\
	  --language_out ECMASCRIPT5\
	  --language_in ECMASCRIPT5\
	  --js appengine/third-party/JS-Interpreter/acorn.js\
	  --js appengine/third-party/JS-Interpreter/interpreter.js\
	  --js_output_file appengine/third-party/JS-Interpreter/compressed.js

# Facilitator ZIP: Thinka Coding Games/ with Start Class launchers.
# Requires a prior `make games` so compressed.js bundles exist.
offline: clean-offline
	bash build/pack_offline.sh

clean: clean-games clean-offline clean-deps

clean-games:
	rm -rf appengine/{.,index,puzzle,maze,bird,turtle,movie,music,pond,pond/tutor,pond/duck,keys,arcade}/generated

clean-offline:
	rm -rf offline/

clean-deps:
	rm -rf appengine/third-party
	rm -rf build/third-party-downloads

# Prevent non-traditional rules from exiting with no changes.
.PHONY: deps games test offline
