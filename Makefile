BUILDDIR = build/output

$(shell if [ ! -d $(BUILDDIR) ]; then mkdir -p $(BUILDDIR); fi)

all: submodules minify

minify:
	node build/tools/minify.js > 'build/output/jquery.upopup-1.0.0.min.js'

submodules:
	git submodule update --init --recursive

clean:
	rm -rf build/output/*

