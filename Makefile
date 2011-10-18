
all: submodules prep upopup udrag usort
upopup: prep minify_upopup compress_upopup
udrag: prep minify_udrag compress_udrag
usort: prep minify_usort compress_usort

submodules:
	git submodule update --init --recursive

prep: 
	mkdir -p build/output

clean:
	rm -rf build/output/*

minify_upopup:
	echo '/* uPopup: License at http://github.com/browndav/ui */' \
		> 'build/output/jquery.upopup.min.js' && \
	node build/tools/minify-upopup.js \
		>> 'build/output/jquery.upopup.min.js'

compress_upopup:
	gzip -9 -cf 'build/output/jquery.upopup.min.js' \
		> 'build/output/jquery.upopup.min.js.gz'

minify_udrag:
	echo '/* uDrag: License at http://github.com/browndav/ui */' \
		> 'build/output/jquery.udrag.min.js' && \
	node build/tools/minify-udrag.js \
		>> 'build/output/jquery.udrag.min.js'

compress_udrag:
	gzip -9 -cf 'build/output/jquery.udrag.min.js' \
		> 'build/output/jquery.udrag.min.js.gz'

minify_usort:
	echo '/* uSort: License at http://github.com/browndav/ui */' \
		> 'build/output/jquery.usort.min.js' && \
	node build/tools/minify-usort.js \
		>> 'build/output/jquery.usort.min.js'

compress_usort:
	gzip -9 -cf 'build/output/jquery.usort.min.js' \
		> 'build/output/jquery.usort.min.js.gz'
