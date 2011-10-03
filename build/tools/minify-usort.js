
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
        _data.replace(/impl/g, 'z')
             .replace(/priv/g, 'y')
             .replace(/jQuery/g, '$')
             .replace(/\s*\/>/g, '/>')
             .replace(/handle_drag_hover/g, 'y')
             .replace(/handle_drag_recalculate/g, 'z')
             .replace(/stop_other_animations/g, 'w')
             .replace(/slide_elements_fixed/g, 'v')
             .replace(/slide_elements_variable/g, 'u')
             .replace(/find_elements_between/g, 't')
             .replace(/animation_count/g, 's')
             .replace(/animations/g, 'r')
             .replace(/_is_running/g, 'q')
             .replace(/_grow_elt/g, 'p')
             .replace(/_shrink_elt/g, 'o')
             .replace(/_step/g, 'n')
             .replace(/_frame_duration/g, 'm')
             .replace(/is_vertical/g, 'l')
             .replace(/insert_element/g, 'k')
    );
};


/**
 * Program entry point
 */
exports.compress(
    'scripts/jquery.usort.js', function (rv) {
        console.log(exports.squeeze(rv));
    }
);

