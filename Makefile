all: prod	dev

prod: script/glance.min.js

bin:
	mkdir bin && cd bin && (curl http://closure-compiler.googlecode.com/files/compiler-latest.zip > compiler-latest.zip || wget -c http://closure-compiler.googlecode.com/files/compiler-latest.zip) && unzip compiler-latest.zip

script/glance.min.js: bin script/glance/*.js
	java -jar bin/compiler.jar --js script/glance/*.js --js_output_file script/glance.min.js

script/glance.js: script/glance/*.js
	echo "" > script/glance.js && for file in script/glance/*.js; do echo "// $$file" >> script/glance.js; cat $$file >> script/glance.js; echo "" >> script/glance.js; done

dev: script/glance.js

clean:
	rm -f script/glance.js script/glance.min.js

realclean:	clean
	rm -rf bin/
