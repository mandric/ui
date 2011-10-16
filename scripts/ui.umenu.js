/*global window: false, jQuery: false*/
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
            var css_classes = 'no-padding';
            var options = $.extend(default_options, _options || {});

            if (options.cssClasses) {
                css_classes += (' ' + options.cssClasses);
            }

            if (options.duration) {
                options.duration = 100; /* ms */
            }

            this.each(function (i, menu_elt) {

                menu_elt = $(menu_elt);
                var data = priv.create_instance_data(menu_elt, options);

                /* Item handling:
                    Search for menu items, using one of three strategies. */

                var items = (options.items || '.item');
                switch (typeof(items)) {
                    case 'function':
                        items = $(items.apply(menu_elt));
                        break;
                    default:
                    case 'string':
                        items = menu_elt.children(items);
                        break;
                }
                
                data.items = items;
                data.is_destroying = false;
                priv.bind_menu_items(this, items);

                /* Event handlers:
                    Single-click handlers for menu dismissal. */

                var document_click_fn = function () {
                    priv._handle_document_click.call(menu_elt);
                };
            
                $(document).bind('click.' + $.uMenu.key, document_click_fn);
                data.document_click_fn = document_click_fn;

                menu_elt.bind(
                    'click.' + $.uMenu.key, priv._handle_menu_click
                );

                /* Contained classes:
                    Instansiate the popup window surrounding this menu,
                    and, if requested, a uSort instance for reordering. */

                menu_elt.uPopup('create', _target_elt, {
                    center: true,
                    hidden: true,
                    useMutation: false,
                    direction: { x: 1 },
                    cssClasses: css_classes,
                    duration: options.duration,
                    onReorient: priv._handle_drag_reorient
                });

                if (!options.hidden) {
                    menu_elt.uMenu('show');
                }

                if (options.sortable) {
                    menu_elt.uSort('create', {
                        animate: true,
                        items: items, scroll: 'body',
                        cssClasses: options.cssClasses
                    });
                }
            });

            return this;
        },

        /**
         * Show the hierarchical pop-up menu(s) rooted at {this}.
         */
        show: function (_callback) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(this);

            if (data.selected_menu_elt) {
                data.selected_menu_elt.uMenu('show');
            }

            return $.uMenu.priv.toggle(this, true, _callback);
        },

        /**
         * Hide the hierarchical pop-up menu(s) rooted at {this}.
         */
        hide: function (_callback) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(this);

            if (data.selected_menu_elt) {
                data.selected_menu_elt.uMenu('hide');
            }

            return $.uMenu.priv.toggle(this, false, _callback);
        },

        /**
         * Removes the uMenu-managed event handlers from each element
         * in {this}, restoring it to its pre-instansiation state.
         */
        destroy: function () {

            var key = $.uMenu.key;
            var priv = $.uMenu.priv;

            $(this).each(function (i, menu_elt) {
                menu_elt = $(menu_elt);

                var data = priv.instance_data_for(menu_elt);
                var submenu_elt = data.selected_menu_elt;

                data.is_destroying = true;

                if (data.options.sortable) {
                    menu_elt.uSort('destroy');
                }

                if (submenu_elt) {
                    var submenu_data = priv.instance_data_for(submenu_elt);
                    if (!submenu_data.is_destroying) {
                        submenu_elt.uMenu('destroy');
                    }
                }
                
                menu_elt.uPopup('destroy', function () {
                    data.items.each(function (j, item_elt) {
                        priv.toggle_item(menu_elt, $(item_elt), false);
                    });

                    if (data.options.submenu) {
                        menu_elt.hide();
                    }
                });
                
                $(document).unbind(
                    'click', data.document_click_fn
                );
            });

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
                 /* items: null,
                    is_visible: false,
                    selected_item_elt: null,
                    selected_menu_elt: null, */
                    options: _options,
                    active_animations: []
                }
            );

            return _menu_elt.data($.uMenu.key);
        },

      /**
        * 
        */
        bind_menu_items: function (_menu_elt, _item_elts) {

            var key = $.uMenu.key;
            var priv = $.uMenu.priv;

            var mouseover_fn = function (_ev) {
                return priv._handle_item_mouseover.call(
                    this, _ev, _menu_elt
                );
                    
            };

            /* Hide submenus for all items:
                These will be shown on mouse-over, by instansiating
                another instance of uMenu on the sub-menu element. */

            $('.' + key, _item_elts).each(function (i, _elt) {
                $(_elt).hide();
            });

            /* Bind each item:
                For every item selected via the {items} option,
                bind the appropriate mouse-based event handlers. */

            $(_item_elts).each(function (_i, _item_elt) {
                var item_elt = $(_item_elt);

                item_elt.data($.uMenu.key, { index: _i });
                item_elt.bind('mouseover.' + key, mouseover_fn);
            });
        },

        
        /**
         * Show or hide the hierarchical pop-up menu(s) rooted at
         * {_menu_elt}. If {_is_show} is true, then the popup
         * menu will be shown; otherwise it will be hidden.
         */
        toggle: function (_menu_elt, _is_show, _callback) {

            var priv = $.uMenu.priv;

            $(_menu_elt).each(function (i, menu_elt) {
                menu_elt = $(menu_elt);

                var op = (_is_show ? 'show' : 'hide');
                var data = priv.instance_data_for(menu_elt);

                menu_elt.uPopup(
                    op, function (_popup_elt) {
                        data.is_visible = _is_show;
                        $.uI.trigger_event(
                            op, $.uMenu.key, null, _menu_elt,
                            data.options, [ _menu_elt, _popup_elt ]
                        );
                        if (_callback) {
                            _callback(_menu_elt, _popup_elt);
                        }
                    }
                );
            });
        },
        /**
         * This function is called whenever the mouse pointer moves
         * inside or outside of a menu item. If {_is_select} is true,
         * this function triggers the 'select' event, which in turn
         * provides visual feedback to the user. If {_is_select} is
         * false, this function triggers the 'unselect' event, and
         * removes the original visual feedback.
         */
        toggle_item: function (_menu_elt, _item_elt, _is_select) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);
            var item_data = _item_elt.data($.uMenu.key);
            var animations = data.active_animations;

            var default_callback = (
                _is_select ?
                    priv._default_select_item : priv._default_unselect_item
            );

            $.uI.trigger_event(
                (_is_select ? 'select' : 'unselect'),
                    $.uMenu.key, default_callback, _menu_elt,
                    data.options, [ _menu_elt, _item_elt ]
            );

            if (item_data) {
                var animate_elt = animations[item_data.index];

                if (animate_elt) {
                    var wrapper_elt = animate_elt.uPopup('elements');
                    wrapper_elt.stop(false, true);
                }
            }

            if (_is_select) {

                var submenu_elt = _item_elt.closestChild('.umenu');
                var subitem_elts = submenu_elt.children('.item');
                var arrow_elt = _item_elt.closestChild('.arrow');

                submenu_elt.show();

                if (submenu_elt[0] && subitem_elts[0]) {
                    data.selected_menu_elt = submenu_elt.uMenu(
                        'create', arrow_elt, {
                            hidden: true,
                            submenu: true,
                            items: data.options.items,
                            sortable: data.options.sortable,
                            cssClasses: data.options.cssClasses
                        }
                    );
                    submenu_elt.uMenu('show', function () {
                        delete animations[item_data.index];
                    });
                    animations[item_data.index] = submenu_elt;
                }

            } else {

                var submenu_elt = data.selected_menu_elt;

                if (submenu_elt) {
                    var submenu_data = priv.instance_data_for(submenu_elt);

                    if (!submenu_data.is_destroying) {
                        data.selected_menu_elt = null;
                        submenu_elt.uMenu('hide', function () {
                            submenu_elt.uMenu('destroy');
                            delete animations[item_data.index];
                        });
                        animations[item_data.index] = submenu_elt;
                    }
                }
            }


        },

        /**
         * Default handler for item selection; uses a CSS class.
         * Override this by handling the 'select' event, or by
         * providing the onSelect callback.
         */
        _default_select_item: function (_menu_elt, _item_elt) {

            $(_item_elt).addClass('selected');
        },

        /**
         * Default handler for unselecting items; uses a CSS class.
         */
        _default_unselect_item: function (_menu_elt, _item_elt) {

            $(_item_elt).removeClass('selected');
        },

        /**
         * Event handler for uPopup's {reorient} event. This is called
         * by uPopup when the popup window changes position, in response
         * to a change in the available space on any side.
         */
        _handle_drag_reorient: function (_menu_elt, _wrapper_elt) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);

            if (data.options.sortable) {
                $(_menu_elt).uSort('recalculate');
            }
        },

        /**
         * Event handler for uMenu's click event. This is invoked
         * when a user selects a menu item, and stops event propogation
         * so that {_handle_window_click} is not invoked after.
         */
        _handle_menu_click: function (_ev) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(this);

            return true;
        },

        /**
         * Event handler for the document's click event. This is
         * invoked whenever the user clicks anywhere outside of
         * a uMenu instance, and responds by closing the menu.
         */
        _handle_document_click: function (_ev) {

            var menu_elt = $(this);
            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(menu_elt);

            if (data.is_visible && !data.is_destroying) {
                menu_elt.uMenu('destroy');
            }

            return false;
        },

        /**
         * Handler for mouse-over events occurring inside of
         * a uMenu item. This changes the active menu item, if
         * the item under the mouse is not currently active.
         */
        _handle_item_mouseover: function (_ev, _menu_elt) {

            var item_elt = $(this);
            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);

            var current_elt = (
                data.selected_item_elt ?
                    data.selected_item_elt[0] : undefined
            );

            if (item_elt[0] !== current_elt) {
                if (data.selected_item_elt) {
                    priv.toggle_item(
                        _menu_elt, data.selected_item_elt, false
                    );
                }

                priv.toggle_item(_menu_elt, item_elt, true);
                data.selected_item_elt = item_elt;
            }

            return false;
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

}(jQuery));

