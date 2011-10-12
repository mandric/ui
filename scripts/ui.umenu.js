/*
 * uMenu:
 *  A space-efficent pop-up menu implementation for jQuery.
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
 * $.uMenu:
 */

(function ($) {

    $.uMenu = {};
    $.uMenu.key = 'umenu';

    $.uMenu.impl = {

        /**
         * Initializes one or more new menu elements, providing
         * a hierarchical pop-up menu (with optional drag/drop).
         */
        create: function (_target_elt, _options) {

            var default_options = {};

            var priv = $.uMenu.priv;
            var options = $.extend(default_options, _options || {});
            var data = priv.create_instance_data(this, options);

            var css_classes = 'no-padding';
            var items = (options.items || '.item');

            if (options.cssClasses) {
                css_classes += (' ' + options.cssClasses);
            }

            switch (typeof(items)) {
                case 'function':
                    items = $(items.apply(this));
                    break;
                case 'string':
                    items = this.find(items);
                    break;
                default:
                case 'object':
                    items = $(items);
                    break;
            };

            priv.bind_menu_items(this, items);
            data.items = items;

            this.uPopup('create', _target_elt, {
                cssClasses: css_classes,
                onReorient: priv._handle_drag_reorient,
                useMutation: false, hidden: true, center: true
            });

            if (!options.hidden) {
                this.uMenu('show');
            }

            if (options.sortable) {
                this.uSort('create', {
                    animate: true,
                    items: items, scroll: 'body'
                });
            }

            return this;
        },

        /**
         * Show the hierarchical pop-up menu(s) rooted at {this}.
         */
        show: function () {

            this.uPopup('show');
        },

        /**
         * Hide the hierarchical pop-up menu(s) rooted at {this}.
         */
        hide: function () {

            this.uPopup('hide');
        },

        /**
         * Removes the uMenu-managed event handlers from each element
         * in {this}, restoring it to its pre-instansiation state.
         */
        destroy: function () {

            return this;
        }

    };

    /**
     * This namespace contains private functions, each used
     * privately as part of uMenu's underlying implementation.
     * Please don't call these from outside of $.uMenu.impl.
     */
    $.uMenu.priv = {

        /**
         * Set/get the uMenu-private storage attached to `_elt`.
         */
        instance_data_for: function (_elt, _v) {

            var elt = $(_elt);
            var key = $.uMenu.key;
            var rv = elt.data(key);

            if (!rv) {
                rv = {};
                $(_elt).data(key, rv);
            }

            return rv;
        },

        /**
         * Initialize private storage on the element _elt, setting
         * all private fields to their original default values. This
         * must be called before any sortables can be modified.
         */
        create_instance_data: function (_menu_elt, _options) {

            _menu_elt.data(
                $.uMenu.key, {
                    /* items: null, */
                    options: _options
                }
            );

            return _menu_elt.data($.uMenu.key);
        },

       /**
        * 
        */
        bind_menu_items: function (_menu_elt, _item_elts) {

            /* Hide submenus for all items:
                These will be shown on mouse-over, by instansiating
                another instance of uMenu on the sub-menu element. */

            $('.umenu', _item_elts).each(function (i, _elt) {
                $(_elt).hide();
            });

            /* Bind each item:
                For every item selected via the {items} option,
                bind the appropriate mouse-based event handlers. */

            _item_elts.each(function (i, _item_elt) {

                var item_elt = $(_item_elt);
            });
        },

        /**
         * Event handler for uPopup's {reorient} event. This is called
         * by uPopup when the popup window changes position in response
         * to a change in the available space on any side.
         */
        _handle_drag_reorient: function (_menu_elt, _wrapper_elt) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);

            if (data.options.sortable) {
                $(_menu_elt).uSort('recalculate');
            }
        }
    };
 
    $.fn.uMenu = function (/* const */_method /* , ... */) {

        /* Dispatch to appropriate method handler:
            Note that the `method` argument should always be a constant;
            never allow user-provided input to be used for the argument. */

        return $.uMenu.impl[_method].apply(
            this, Array.prototype.slice.call(arguments, 1)
        );
    };

})(jQuery);

