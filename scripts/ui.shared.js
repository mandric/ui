/*
 * uI:
 *  A space-efficent user-interface component library for jQuery.
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
 * Special thanks to Medic Mobile, Inc. for making this project possible.
 * Medic Mobile is a US-based non-profit organization that works in
 * developing countries to improve health care outcomes, using SMS and web
 * technologies. If this project has made your life easier in one way or
 * another, and you'd like to give back in some way, please consider
 * donating directly at medicmobile.org. Your donation is likely to be tax
 * deductible if you reside within the United States, and will directly
 * assist our design and construction of open-source mobile health software.
 */

/**
 * $.uI:
 */

(function ($) {

    $.uI = {

        /**
         * Trigger an event, using either a callback, a
         * dynamic jQuery-based event, or both.
         */
        trigger_event: function (_name, _key, _default_callback,
                                 _elt, _options, _arguments) {
            var rv = null;

            if (_elt) {
                $(_elt).trigger(_key + ':' + _name);
            }

            if (_options) {
                var handler = _options[
                    'on' + _name.replace(
                        /(?:^|_)(\w)/g, function (s, x) {
                            return x.toUpperCase();
                        }
                    )
                ];
                if (handler !== undefined) {
                    if (handler) {  /* Skip on false or null */
                        rv = handler.apply(null, _arguments);
                    }
                } else {
                    if (_default_callback) {
                        rv = _default_callback.apply(null, _arguments);
                    }
                }
            }

            return rv;
        },

        /**
         * Make `_v` an array if it isn't already an array.
         */
        listify: function (_v) {

            return ($.isArray(_v) ? _v : [ _v ]);
        },

        /**
         * Returns the array offset (i.e. index) that contains the
         * largest value in the array.
         */
        index_of_max: function (a) {

            var rv, max;

            for (var i = 0, len = a.length; i < len; ++i) {
                if (!max || a[i] > max) {
                    max = a[i]; rv = i;
                }
            }

            return rv;
        },

        /**
         * Return an array containing {_start_elt}, {_end_elt},
         * and all of the sibling elements located between the two.
         */
        find_elements_between: function (_start_elt, _end_elt) {

            var rv = [];
            var p = $(_start_elt);

            while (p[0]) {
                rv.push(p[0]);
                if (p[0] === _end_elt[0]) {
                    break;
                }
                p = p.next();
            }

            return rv;
        }
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

