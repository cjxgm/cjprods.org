
NODE_MODULES = $(shell npm config get prefix)/lib/node_modules
BABEL_PRESET = $(NODE_MODULES)/babel-preset-es2015/
BABEL_POLYFILL = $(NODE_MODULES)/babel-polyfill/dist/polyfill.min.js

all: bundle.js content.json
clean:
	rm -f bundle-raw.js bundle-min.js
cleanall: clean
	rm -f bundle.js
prepare:
	sudo npm install -g js-yaml json-minify requirejs babel-cli babel-polyfill babel-preset-es2015

bundle-raw.js: $(wildcard src/**.js)
	r.js -o baseUrl=src/ name=init out=$@ optimize=none

%.json: src/%.yaml
	js-yaml < $< | json-minify > $@
%-min.js: %-raw.js
	babel --presets $(BABEL_PRESET) --minified --no-comments < $< > $@
%.js: %-min.js
	cat polyfill/fontloader.js $(BABEL_POLYFILL) $< > $@

