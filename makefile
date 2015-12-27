
all: content.json
prepare:
	sudo npm install -g js-yaml json-minify

%.json: %.yaml
	js-yaml < $< | json-minify > $@

