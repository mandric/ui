/*
 * uPopup:
 *  A space-efficent pop-up dialog implementation for jQuery.
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

/*
 * Special thanks to Medic Mobile, Inc. for making this project possible. Medic
 * Mobile is a US-based non-profit that works in developing countries to improve
 * health care systems and outcomes, by leveraging SMS and web technologies.
 * If this project has made your life easier in one way or another, and
 * you'd like to give back in some way, please consider donating directly at
 * medicmobile.org. Your donation is likely to be tax deductible if you reside
 * within the United States. Your donation will directly assist our construction
 * of open-source mobile health software.
 */

(function ($) {

    /**
     * uPopup - Markup and CSS Overview:
     *
     *  The uPopup plugin uses CSS for all layout and appearance,
     *  including rounded corners, arrow/pointer placement, and
     *  drop shadows. Markup must follow a fixed structure; by
     *  default, the necessary markup is generated at runtime and
     *  used to wrap the element you provide. The markup format is
     *  (pipe characters denote mutually-exclusive alternatives):
     *
     *    <div class="upopup">
     *      <div class="direction {n|s|e|w|nw|ne|se|sw|wnw|wsw|ene|ese}">
     *        <div class="arrow first-arrow" />
     *        <div class="border">
     *          <div class="inner">
     *              { html | element | function }
     *          </div>
     *        </div>
     *        <div class="arrow last-arrow" />
     *        <div class="clear" />
     *      </div>
     *    </div>
     *
     *  The popup dialog uses a triangular <div> (made with a thick
     *  border, with three transparent sides) to point at the target
     *  element that you provide. Only one arrow may be visible at a
     *  time; the visible arrow can be controlled by using one of the
     *  css classes from the diagram below (pipes again denote "or"):
     *  
     *                    (n | nw)    (ne)
     *                       ^         ^
     *               (wnw) < +---------+ > (ene)
     *                       |         |
     *                       |         |
     *               (wsw) < +---------+ > (ese)
     *                       v         v
     *                    (s | sw)    (se)
     *
     *  To modify the appearance of any uPopup-managed element, use a
     *  custom stylesheet to override properties found in the default
     *  uPopup CSS file.
     */

    $.uPopup = {};
    $.uPopup.impl = {

        /**
         * Initializes one or more new popup dialogs, and inserts each
         * in to the DOM as an immediate successor of a selected element.
         */
        create: function (_target_elts, _options) {

            var priv = $.uPopup.impl.priv;
            var options = (_options || {});
            var target_elts = priv.listify(_target_elts);

            $(this).each(function (i, popup_elt) {

                /* Target element:
                    Use the final element repeatedly if there
                    are not enough target elements provided. */

                var target_elt = (target_elts[i] || target_elts.last);

                /* Target element factory support:
                    Provide a function instead of a target element,
                    and it will be called to create targets at runtime. */

                if ($.isFunction(target_elt)) {
                    target_elt = target_elt.call(target_elt, popup_elt);
                }

                popup_elt = $(popup_elt);
                target_elt = $(target_elt);

                /* Wrap `popup_elt` inside of `wrapper_elt` */
                var wrapper_elt = priv.wrap(popup_elt);

                /* Save instance data */
                popup_elt.data('upopup', {
                    elt: wrapper_elt,
                    options: options
                });


                /* Insert popup */
                priv.insert(wrapper_elt, target_elt, popup_elt, options);

                /* Re-position popup to fit */
                priv.autoposition(wrapper_elt, target_elt);

            });

            return this;
        },

        /**
         * Show the popup currently wrapping the selected element.
         * You can disable animations by setting _options.fx = false
         * in the `create` method, or by disabling jQuery's effects.
         */
        show: function (_callback) {
            return $.uPopup.impl.priv.show_or_hide.call(
                this,
                function (_anim) {
                    if (_anim) { this.fadeIn(); } else { this.show(); }
                },
                _callback
            );
        },

        /**
         * Hide the popup currently wrapping the selected element.
         * You can disable animations by setting _options.fx = false
         * in the `create` method, or by disabling jQuery's effects.
         */
        hide: function (_callback) {
            return $.uPopup.impl.priv.show_or_hide.call(
                this,
                function (_anim) {
                    if (_anim) { this.fadeOut(); } else { this.hide(); }
                },
                _callback
            );
        },

        /**
         *
         */
        destroy: function () {
            $.uPopup.impl.hide.call(this, function (_wrapper_elt) {
                _wrapper_elt.remove();
            });
        },

        /**
         * Given a list of originally-provided elements, this method
         * returns a list of the 'wrapper' elements currently in use.
         */
        elements: function () {

            var priv = $.uPopup.impl.priv;

            return $(
                $(this).map(function (i, elt) {
                    var wrapper_elt = priv.storage_for(elt).elt;
                    return (wrapper_elt ? wrapper_elt[0] : undefined);
                }).filter(function (elt) {
                    return !elt;
                })
            );
        },

        /**
         * A namespace that contains private functions, each
         * used internally as part of uPopup's implementation.
         * Please don't call these from outside of $.uPopup.impl.
         */
        priv: {
            /**
             * Local variables:
             *  We provide a monotonically-increasing z-index for the
             *  popups we create, so as to ensure that newer popups
             *  always appear above older popups. This method imposes an
             *  artificial limit on the number of popups per page load,
             *  but it's far higher than any real-world use case.
             */
            _serial_number: 0,
            _zindex_base: 16384,

            /**
             * Make `_v` an array if it isn't already an array.
             */
            listify: function (_v) {
                return ($.isArray(_v) ? _v : [ _v ]);
            },

            /**
             * Returns the uPopup-private storage attached to `_elt`.
             */
            storage_for: function (_elt) {
                return ($(_elt).data('upopup') || {});
            },

            /**
             * Returns a new DOM element, consisting of _popup_elt wrapped
             * inside of uPopup-specific elements. Values in _options
             * are used to control the appearance and layout of the wrapper.
             */
            wrap: function (_popup_elt, _options) {

                var options = (_options || {});

                var wrap_elt = $(
                    '<div class="upopup">' +
                        '<div class="direction">' +
                            '<div class="arrow first-arrow" />' +
                            '<div class="border">' +
                                '<div class="inner" />' +
                            '</div>' +
                            '<div class="arrow last-arrow" />' +
                            '<div class="clear" />' +
                        '</div>' +
                    '</div>'
                );

                $('.inner', wrap_elt).append(_popup_elt);
                return wrap_elt;
            },

            /**
             * Places a wrapped uPopup element inside of the DOM.
             * Values inside of the _options object are used to
             * control position and placement.
             */
            insert: function (_wrapper_elt, _target_elt, _elt, _options) {

                var options = (_options || {});
                var priv = $.uPopup.impl.priv;

                _wrapper_elt.css(
                    'z-index',
                    (priv._zindex_base + priv._serial_number++)
                );

                _wrapper_elt.hide();
                _wrapper_elt.prependTo('body');

                $.uPopup.impl.show.call(_elt, _options.onShow)
            },

            /**
             * Shows or hides a currently-visible popup instance. To remove
             * an instance altogether, and discard the element, see the
             * destroy function. To create a new instance, use `create`.
             * This is the backend for impl.show and impl.hide.
             */
            show_or_hide: function (_fn, _callback) {

                var priv = $.uPopup.impl.priv;

                /* Multiple elements are allowed */
                $(this).each(function (i, popup_elt) {

                    /* Retrieve instance data */
                    var data = priv.storage_for(popup_elt);
                    var options = (data.options || {});
                    var wrapper_elt = data.elt;

                    /* Hide wrapper element:
                        This contains the originally-provided element. */

                    if (options.fx == undefined || options.fx === true) {
                        _fn.call(wrapper_elt, true);
                    } else {
                        _fn.call(wrapper_elt, false);
                    }

                    if ($.isFunction(_callback)) {
                        _callback.call(popup_elt, wrapper_elt);
                    }
                });

                return this;
            },

            /**
             * The popup dialog automatic repositioning algorithm. Places
             * `wrapper_elt` on the side of `target_elt` that has the most
             * available screen space, in each of two dimensions.
             */
            autoposition: function (_wrapper_elt, _target_elt) {

                var container_elt = $(document);
                var target_offset = _target_elt.offset();

                /* Precompute sizes:
                    These figures are used in the placement algorithm. */
                    
                var target_size = {
                    width: _target_elt.outerWidth(true),
                    height: _target_elt.outerHeight(true)
                };
                
                /* Available space on each side of target:
                    { x: [ left, right ], y: [ top, bottom ] } */
                    
                var avail = {
                    x: [
                        target_offset.left,
                        container_elt.width()
                            - (target_offset.left + target_size.width)
                    ],
                    y: [
                        target_offset.top,
                        container_elt.height()
                            - (target_offset.top + target_size.height)
                    ]
                };
                
                /* Indices:
                    Each value is an index for `avail` and `offsets`. */

                var indices = {
                    x: (avail.x[0] > avail.x[1] ? 0 : 1),
                    y: (avail.y[0] > avail.y[1] ? 0 : 1)
                };

                return $.uPopup.impl.priv.reposition(
                    _wrapper_elt, _target_elt, indices.x, indices.y
                );
            },

            /**
             * This is the core repositioning function. This is used as the
             * back-end of auto_position, and can also be used if you want
             * force a popup to appear facing a certain direction. The
             * _target_elt is the element that the popup should point
             * to; _wrapper_elt is the return value obtained from calling
             * priv.wrap; _x and _y are boolean values denoting left/right
             * and top/bottom (each zero/one or true/false, respectively).
             */
            reposition: function (_wrapper_elt, _target_elt, _x, _y) {

                var target_offset = _target_elt.offset();
                var inner_elt = _wrapper_elt.closestChild('.direction');
                var arrow_elt = inner_elt.closestChild('.arrow');

                /* Precompute sizes:
                    These figures are used in the placement algorithm. */
                    
                var target_size = {
                    width: _target_elt.outerWidth(true),
                    height: _target_elt.outerHeight(true)
                };
                var wrapper_size = {
                    width: _wrapper_elt.outerWidth(true),
                    height: _wrapper_elt.outerHeight(true)
                };
                var padding_size = {
                    width: (wrapper_size.width - inner_elt.width()) / 2,
                    height: (wrapper_size.height - inner_elt.height()) / 2
                };
                var arrow_size = {
                    height: arrow_elt.outerHeight(true)
                };

                /* Possible placement offsets:
                    Each candidate matches a value in `avail`, below. */
                    
                var offsets = {
                    x: [
                        target_offset.left - wrapper_size.width
                            + padding_size.width,
                        target_offset.left + target_size.width
                            - padding_size.width
                    ],
                    y: [
                        target_offset.top - wrapper_size.height +
                            padding_size.height + 1.5 * arrow_size.height,
                        target_offset.top + target_size.height -
                            1.5 * arrow_size.height - padding_size.height
                    ]
                };

                /* Position arrow:
                    We place the arrow on the corner of the popup that
                    is closest to the near corner of the target element. */

                if (_x) {
                    if (_y) {
                        inner_elt.addClass('w');
                    } else {
                        inner_elt.addClass('wsw');
                    }
                } else {
                    if (_y) {
                        inner_elt.addClass('e');
                    } else {
                        inner_elt.addClass('ese');
                    }
                }

                /* Finally, reposition:
                    Write the actual style change to the DOM element. */

                return _wrapper_elt.offset({
                    top: offsets.y[_y],
                    left: offsets.x[_x]
                });
            }

        }
    };

    $.fn.uPopup = function (/* const */_method /* , ... */) {

        /* Dispatch to appropriate method handler:
            Note that the `method` argument should always be a constant.
            Never allow user-provided input to be used for the argument. */

        return $.uPopup.impl[_method].apply(
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

