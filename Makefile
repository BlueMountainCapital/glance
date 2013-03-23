all: prod	dev

prod: src/glance.min.js

bin:
	mkdir bin && cd bin && (curl http://closure-compiler.googlecode.com/files/compiler-latest.zip > compiler-latest.zip || wget -c http://closure-compiler.googlecode.com/files/compiler-latest.zip) && unzip compiler-latest.zip

src/glance.min.js: bin src/glance/*.js
	java -jar bin/compiler.jar --js src/glance/*.js --js_output_file src/glance.min.js

src/glance.js: src/glance/*.js
	echo "" > src/glance.js && for file in src/glance/*.js; do echo "// $$file" >> src/glance.js; cat $$file >> src/glance.js; echo "" >> src/glance.js; done

dev: src/glance.js

clean:
	rm -f src/glance.js src/glance.min.js

realclean:	clean
	rm -rf bin/
