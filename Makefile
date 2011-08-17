
all: minify compress

minify:
	echo '/* uPopup: License at http://github.com/browndav/upopup */' \
		> 'build/output/jquery.upopup.min.js' && \
	node build/tools/minify.js \
		>> 'build/output/jquery.upopup.min.js'

compress: minify
	gzip -9 -cf 'build/output/jquery.upopup.min.js' \
		> 'build/output/jquery.upopup.min.js.gz'

clean:
	rm -rf build/output/*

