
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
             .replace(/priv/g, 'z')
             .replace(/jQuery/g, '$')
             .replace(/\s*\/>/g, '/>')
             /* Symbols: uDrag */
             .replace(/recalculate_drop_zones/g, 'z')
             .replace(/recalculate_drop_zone/g, 'y')
             .replace(/stop_autoscroll/g, 'x')
             .replace(/start_autoscroll/g, 'w')
             .replace(/update_position/g, 'v')
             .replace(/find_drop_zone_beneath/g, 'u')
             .replace(/return_to_original_position/g, 't')
             .replace(/handle_autoscroll_timeout/g, 's')
             .replace(/recent_drop_zone_containers/g, 'r')
             .replace(/default_hover_callback/g, 'q')
             .replace(/default_recalculate_callback/g, 'o')
             .replace(/default_insert_callback/g, 'o')
             .replace(/default_drop_callback/g, 'n')
             .replace(/calculate_autoscroll_direction/g, 'm')
             .replace(/handle_document_mouseup/g, 'l')
             .replace(/handle_document_mousemove/g, 'k')
             .replace(/handle_drag_mousedown/g, 'j')
             .replace(/handle_document_resize/g, 'i')
             .replace(/default_position_callback/g, 'h')
             .replace(/set_highlight/g, 'g')
             .replace(/clear_highlight/g, 'f')
             .replace(/start_dragging/g, 'e')
             .replace(/stop_dragging/g, 'd')
             .replace(/relative_drop_offset/g, 'c')
             .replace(/move_element/g, 'b')
             .replace(/create_overlay/g, 'a')
             /* Symbols: uDrag.AreaIndex */
             .replace(/_find_topmost_zone/g, 'z')
             .replace(/_cumulative_scroll/g, 'y')
             .replace(/instance_data_for/g, 'x')
             .replace(/create_instance_data/g, 'w')
             /* Symbols uDrag.priv */
             .replace(/drop_zones/g, 'z')
             .replace(/is_autoscrolling/g, 'y')
             .replace(/previous_highlight_zone/g, 'x')
             .replace(/autoscroll_axes/g, 'w')
             .replace(/container_elt/g, 'v')
             .replace(/autoscroll_elt/g, 'u')
             .replace(/has_scrolled_recently/g, 't')
             .replace(/placeholder_elt/g, 's')
             .replace(/initial_position/g, 'r')
             .replace(/initial_scroll/g, 'q')
             /* Symbols: uDrag.data */
             .replace(/is_dragging/g, 'zy')
             .replace(/_zones/g, 'zz')
    );
};


/**
 * Program entry point
 */
exports.compress(
    'scripts/jquery.udrag.js', function (rv) {
        console.log(exports.squeeze(rv));
    }
);

