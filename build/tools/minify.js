
var fs = require('fs'),
    jsp = require('../../contrib/uglifyjs/lib/parse-js'),
    pro = require('../../contrib/uglifyjs/lib/process');


/**
 * Compress the javascript source in src (a string) using the
 * uglifyjs compression/optimization engine.
 */
exports.minify = function (src) {
    var ast = jsp.parse(src);   // parse code and get the initial AST
    ast = pro.ast_mangle(ast);  // get a new AST with mangled names
    ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    return pro.gen_code(ast);   // compressed code here
};


/**
 * Read the uPopup source from disk and compress it with uglifyjs.
 */
exports.compress = function (_path, _callback) {
    fs.readFile(
        _path, function (err, rv) {
            _callback(
                exports.minify(rv.toString()) + ';'
            )
        }
    );
};


/**
 * Potentially unsafe variable renaming is performed here.
 * These rules are hand-coded and must be tested prior to
 * each release. We start from the end of the alphabet, since
 * the uglifyjs compressor starts from the beginning.
 */
exports.squeeze = function (_data) {
    return (
        _data.replace(/impl/g, '_')
             .replace(/priv/g, '_')
             .replace(/instance_data_for/g, 'z')
             .replace(/toggle/g, 'y')
             .replace(/calculate_arrow_delta/g, 'x')
             .replace(/_serial_number/g, 'w')
             .replace(/_zindex_base/g, 'v')
             .replace(/event_to_point/g, 'u')
             .replace(/listify/g, 't')
             .replace(/index_of_max/g, 's')
             .replace(/ratio/g, 'r')
             .replace(/autoposition/g, 'q')
             .replace(/reposition/g, 'p')
             .replace(/jQuery/g, '$')
             .replace(/\s*\/>/g, '/>')
    );
};


/**
 * Program entry point
 */
exports.compress(
    'scripts/jquery.upopup-1.0.0.js', function (rv) {
        console.log(exports.squeeze(rv));
    }
);

