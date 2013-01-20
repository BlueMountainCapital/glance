if [ ! -e bin ] 
then
    mkdir bin
fi

if [ ! -e bin/compiler.jar ]
then
    cd bin
    curl http://closure-compiler.googlecode.com/files/compiler-latest.zip > compiler-latest.zip
    unzip compiler-latest.zip
    cd ..
fi

#java -jar bin/compiler.jar --js script/glance/*.js --js_output_file script/glance.min.js

echo "" > script/glance.js
for file in script/glance/*.js
do
    echo "// $file" >> script/glance.js
    cat $file >> script/glance.js
    echo "" >> script/glance.js
done
