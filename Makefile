
all: minify

minify:
	node build/tools/minify.js > 'build/output/jquery.upopup-1.0.0.min.js'

clean:
	rm -rf build/output/*

