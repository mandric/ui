/*
 * uDrag:
 *  A space-efficent drag/drop implementation for jQuery.
 *
 * Copyright (c) 2011, David Brown <browndav@spoonguard.org>
 * Copyright (c) 2011, Medic Mobile <david@medicmobile.org>
 * All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL MEDIC MOBILE OR DAVID BROWN BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function ($) {

    $.uDrag = {};
    $.uDrag.impl = {

        /**
         * Initializes one or more new draggable elements, allowing
         * the user to pick up the element and move it somewhere else.
         */
        create: function (_options) {

            var priv = $.uDrag.impl.priv;
            var options = (_options || {});

            this.each(function (i, drag_elt) {

                drag_elt = $(drag_elt);

                /* Draggable elements:
                    Register event handlers to detect drag/move events. */

                drag_elt.bind(
                    'mousedown',
                    priv.handle_drag_mousedown
                );
                $(document).bind(
                    'mousemove',
                    $.proxy(priv.handle_document_mousemove, drag_elt)
                );
                $(document).bind(
                    'mouseup',
                    $.proxy(priv.handle_document_mouseup, drag_elt)
                );

                /* Drop zones:
                    Store drop zone coordinates in a searchable structure. */

                var drop_zones = [];
                var drop_option = (options.drop || []);

                if (!$.isArray(drop_option)) {
                    drop_option = [ drop_option ];
                }

                for (var i = 0, len = drop_option.length; i < len; ++i) {
                    $(drop_option[i]).each(function (j, drop_elt) {

                        drop_elt = $(drop_elt);
                        var offset = drop_elt.offset();

                        var size = {
                            x: drop_elt.outerWidth(),
                            y: drop_elt.outerHeight()
                        }

                        drop_zones.push({
                            elt: drop_elt,
                            x: [ offset.left, offset.left + size.x ],
                            y: [ offset.top, offset.top + size.y ]
                        });
                    });
                }

                drag_elt.data(
                    'udrag', {
                        options: options,
                        drop_zones: drop_zones
                    }
                );
            });

            return this;
        },

        /**
         * Removes the uDrag-managed event handlers from each element
         * in {this}, restoring it to its original pre-drag state.
         */
        destroy: function () {
            return this;
        },

        /**
         * A namespace that contains private functions, each
         * used internally as part of uPopup's implementation.
         * Please don't call these from outside of $.uDrag.impl.
         */
        priv: {

            /**
             * Set/get the uDrag-private storage attached to `_elt`.
             */
            instance_data: function (_elt, _v) {

                var key = 'udrag';
                var elt = $(_elt);
                var data = elt.data(key);

                if (!data) {
                    _v = {};
                }

                if (_v) {
                    elt.data(key, _v);
                }

                return data;
            },

            /**
             * Event handler for document's mouse-up event.
             */
            handle_document_mouseup: function (_ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(this);

                if (data.is_dragging) {
                    priv.stop_dragging($(this), _ev);
                }
                
                return false;
            },

            /**
             * Event handler for document's mouse-move event.
             */
            handle_document_mousemove: function (_ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(this);

                if (data.is_dragging) {
                    priv.update_position($(this), _ev);
                }

                return false;
            },

            /**
             * Event handler for drag element's mouse-down event.
             */
            handle_drag_mousedown: function (_ev) {

                /* Require primary mouse button */
                if (_ev.which != 1) {
                    return false;
                }

                $.uDrag.impl.priv.start_dragging($(this), _ev);
                return false;
            },

            /**
             * Start a drag operation for {_elt}.
             */
            start_dragging: function (_elt, _ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(_elt);
                var offset = _elt.offset();

                data.delta = {
                    x: (_ev.offsetX || _ev.pageX - offset.left),
                    y: (_ev.offsetY || _ev.pageY - offset.top)
                };

                data.is_dragging = true;

                var drag_elt = priv.create_overlay_element(_elt, _ev);

                var margin_sum = {
                    x: drag_elt.outerWidth(true) - drag_elt.outerWidth(),
                    y: drag_elt.outerHeight(true) - drag_elt.outerHeight()
                };

                data.margin = {
                    x: (margin_sum.x > 0 ? margin_sum.x / 2 : 0),
                    y: (margin_sum.y > 0 ? margin_sum.y / 2 : 0)
                };

                data.initial_position = {
                    x: _ev.pageX - data.delta.x,
                    y: _ev.pageY - data.delta.y
                };

                priv.update_position(_elt, _ev);
            },

            /**
             * End a drag operation for {_elt}.
             */
            stop_dragging: function (_elt, _ev) {
                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(_elt);
                var drop_elt = priv.find_drop_element_beneath(_elt, _ev);

                if (drop_elt) {
                    var pos = priv.calculate_relative_drop_offset(
                        _elt, drop_elt, _ev
                    );
                    _elt.css('position', 'relative');
                    _elt.css('top', pos.y + 'px');
                    _elt.css('left', pos.x + 'px');
                    priv.move_element(_elt, drop_elt, _ev);
                }

                data.is_dragging = false;
                priv.return_to_original_position(_elt);
            },
            
            /**
             * Returns the set of drop elements that lie directly
             * underneath the mouse pointer (position specified in _ev).
             */
            element_with_max_zindex: function (_elts) {

                var rv = null, z_rv = null;

                for (var i = 0, len = _elts.length; i < len; ++i) {
                    var elt = $(_elts[i]);
                    var z = parseInt(elt.css('z-index'), 10);

                    if (!rv || z > z_rv) {
                        rv = elt;
                        z_rv = z;
                    }
                }

                return rv;
            },

            /**
             * Returns the set of drop elements that lie directly
             * underneath the mouse pointer (position specified in _ev).
             */
            find_drop_element_beneath: function (_elt, _ev) {
                var rv = [];
                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(_elt);
                var drop_zones = data.drop_zones;

                for (var i = 0, len = drop_zones.length; i < len; ++i) {
                    var drop = drop_zones[i];

                    if (_ev.pageX < drop.x[0] || _ev.pageX > drop.x[1])
                        continue;

                    if (_ev.pageY < drop.y[0] || _ev.pageY > drop.y[1])
                        continue;

                    rv.push(drop.elt);
                }

                return priv.element_with_max_zindex(rv);
            },

            /**
             * Given an event object _ev that contains page coordinates
             * {pageX} and {pageY}, calculate and return a version of
             * the coordinates that is relative to _elt.
             */
            calculate_relative_drop_offset: function (_elt, _drop_elt, _ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(_elt);
                var offset = _drop_elt.offset();

                var scroll = {
                    x: _drop_elt.scrollLeft(),
                    y: _drop_elt.scrollTop()
                };

                var rv = {
                    x: Math.max(
                        (_ev.pageX - offset.left -
                            data.delta.x + scroll.x - data.margin.x), 0
                    ),
                    y: Math.max(
                        (_ev.pageY - offset.top -
                            data.delta.y + scroll.y - data.margin.y), 0
                    )
                };

                return rv;
            },
                        
            /**
             * Update the apparent position of the element being dragged,
             * so that it is appears at the coordinates specified in {_ev}.
             */
            update_position: function (_elt, _ev) {
                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(_elt);

                data.drag_element.offset({
                    top: _ev.pageY - data.delta.y,
                    left: _ev.pageX - data.delta.x
                });
            },
            
            /**
             * Duplicate an element, hide the original, and make the copy
             * a child of the document body. Do this without any visible
             * visual change, flicker, or other display artifacts.
             */
            create_overlay_element: function (_elt, _ev) {
                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(_elt);
                var drag_elt = data.drag_element = _elt.clone(true);

                drag_elt.css('position', 'absolute');
                drag_elt.css('visibility', 'hidden');

                drag_elt.width(_elt.innerWidth());
                drag_elt.height(_elt.innerHeight());

                $('body').prepend(drag_elt);
                priv.update_position(_elt, _ev);

                drag_elt.css('visibility', 'visible');
                _elt.css('visibility', 'hidden');

                return drag_elt;
            },
            
            /**
             */
            move_element: function (_elt, _new_parent_elt, _ev) {
                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(_elt);

                /* Move element */
                _new_parent_elt.prepend(_elt);
                var offset = _elt.offset();

                /* Calculate new "initial" position */
                data.delta.x = data.delta.y = 0;
                data.initial_position = {
                    x: offset.left,
                    y: offset.top
                };


                return _elt;
            },

            /**
             * 
             */
            return_to_original_position: function (_elt, _callback) {
                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data(_elt);
                var drag_elt = data.drag_element;

                drag_elt.animate({
                    top: data.initial_position.y - data.margin.y,
                    left: data.initial_position.x - data.margin.x
                }, {
                    complete: function () {
                        _elt.css('visibility', 'visible');
                        drag_elt.remove();

                        if (_callback) {
                            _callback.call(_elt);
                        }
                    }
                });
            }
        }

    };
 
    $.fn.uDrag = function (/* const */_method /* , ... */) {

        /* Dispatch to appropriate method handler:
            Note that the `method` argument should always be a constant.
            Never allow user-provided input to be used for the argument. */

        if (_method == 'priv') {
            return null;
        }

        return $.uDrag.impl[_method].apply(
            this, Array.prototype.slice.call(arguments, 1)
        );
    };

})(jQuery);


/* 
 * closestChild for jQuery
 * Copyright 2011, Tobias Lindig
 * 
 * Dual licensed under the MIT license and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.opensource.org/licenses/gpl-license.php
 */
(function ($) {
    if (!$.fn.closestChild) {
        $.fn.closestChild = function (selector) {
            /* Breadth-first search for the first matched node */
            if (selector && selector !== '') {
                var queue = [];
                queue.push(this);
                while (queue.length > 0) {
                    var node = queue.shift();
                    var children = node.children();
                    for (var i = 0; i < children.length; ++i) {
                        var child = $(children[i]);
                        if (child.is(selector)) {
                            return child;
                        }
                        queue.push(child);
                    }
                }
            }
            return $(); /* Nothing found */
        };
    }
}(jQuery));

