
all: bundle.js content.json
clean:
	rm -f bundle-raw.js
cleanall: clean
	rm -f bundle.js
prepare:
	sudo npm install -g js-yaml json-minify requirejs babel-cli

bundle-raw.js: $(wildcard src/**.js)
	r.js -o baseUrl=src/ name=init out=$@ optimize=none

%.json: src/%.yaml
	js-yaml < $< | json-minify > $@
%.js: %-raw.js
	babel --minified --no-comments < $< > $@

