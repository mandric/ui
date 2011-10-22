
all: submodules prep upopup udrag usort
upopup: prep minify_upopup compress_upopup
udrag: prep minify_udrag compress_udrag
usort: prep minify_usort compress_usort

submodules:
	git submodule update --init --recursive

prep: 
	test -d build/output || mkdir build/output

clean:
	rm -rf build/output/*

minify_upopup:
	echo '/* uPopup: License at http://github.com/browndav/ui */' \
		> 'build/output/ui.upopup.min.js' && \
	node build/tools/minify-upopup.js \
		>> 'build/output/ui.upopup.min.js'

compress_upopup:
	gzip -9 -cf 'build/output/ui.upopup.min.js' \
		> 'build/output/ui.upopup.min.js.gz'

minify_udrag:
	echo '/* uDrag: License at http://github.com/browndav/ui */' \
		> 'build/output/ui.udrag.min.js' && \
	node build/tools/minify-udrag.js \
		>> 'build/output/ui.udrag.min.js'

compress_udrag:
	gzip -9 -cf 'build/output/ui.udrag.min.js' \
		> 'build/output/ui.udrag.min.js.gz'

minify_usort:
	echo '/* uSort: License at http://github.com/browndav/ui */' \
		> 'build/output/ui.usort.min.js' && \
	node build/tools/minify-usort.js \
		>> 'build/output/ui.usort.min.js'

compress_usort:
	gzip -9 -cf 'build/output/ui.usort.min.js' \
		> 'build/output/ui.usort.min.js.gz'
