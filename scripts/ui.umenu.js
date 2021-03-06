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

            var key = $.uMenu.key;
            var priv = $.uMenu.priv;
            var options = $.extend(default_options, _options || {});
            var css_classes = 'no-padding ' + (options.cssClasses || '');

            if (!options.duration) {
                options.duration = 200; /* ms */
            }

            if (!options.delay) {
                options.delay = 60; /* ms */
            }

            this.each(function () {

                var menu_elt = $(this);
                var data = priv.create_instance_data(menu_elt, options);

                /* Item handling:
                    Search for menu items, using one of two strategies. */

                var items = (options.items || '.' + key + '-item');

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
                priv.bind_menu_items(this, items);

                /* Generator function for directional bias:
                    If a direction option isn't provided, have all menu
                    popups and submenu popups point the same way as
                    this initial root menu, if it's possible to do so. */

                var bias_fn = function () {
                    return priv._determine_popup_bias.call(this, menu_elt);
                };

                data.bias = (options.direction || bias_fn);

                /* Event handlers:
                    Single-click handlers for menu dismissal. */

                var document_click_fn = function () {
                    priv._handle_document_click.call(menu_elt);
                };
            
                $(document).bind('click.' + key, document_click_fn);
                data.document_click_fn = document_click_fn;

                menu_elt.bind(
                    'click.' + key, priv._handle_menu_click
                );

                /* Contained classes:
                    Instansiate the popup window surrounding this menu,
                    and, if requested, a uSort instance for reordering. */

                menu_elt.uPopup('create', _target_elt, {
                    center: true,
                    hidden: true,
                    useMutation: false,
                    direction: data.bias,
                    vertical: options.vertical,
                    style: options.style,
                    cssClasses: css_classes,
                    duration: options.duration,
                    onReorient: priv._handle_drag_reorient
                });

                if (!options.hidden) {
                    priv.toggle(menu_elt, true);
                }

                var style = menu_elt.uPopup('style')[0];

                css_classes += (
                    (style ? ' ' + key + '-style-' + style : '')
                );

                if (options.sortable) {

                    var opts = {
                        items: items, scroll: 'body',
                        animate: true, cssClasses: css_classes
                    };

                    if (options.parentMenu) {
                        menu_elt.uMenu('root').uSort(
                            'add', menu_elt, opts
                        );
                    } else {
                        menu_elt.uSort('create', opts);
                    }
                }
            });

            return this;
        },

        /**
         * Show the hierarchical pop-up menu rooted at {this}.
         */
        show: function (_callback) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(this);
            var submenus = data.active_submenus;

            return priv.toggle(this, true, _callback);
        },

        /**
         * Hide the hierarchical pop-up menu rooted at {this}.
         */
        hide: function (_callback) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(this);

            var submenu_hide_fn = function (submenu_elt) {
                var submenu_data = priv.instance_data_for(submenu_elt);
                var submenus = submenu_data.active_submenus;

                for (var k in submenus) {
                    submenu_hide_fn(submenus[k]);
                    submenus[k].uPopup('wrapper').hide();
                }
            }

            this.each(function () {
                submenu_hide_fn(this);
            });

            return priv.toggle(this, false, _callback);
        },

        /**
         * Stops any in-progress show/hide animations running on
         * behalf of {this}, or any descendent uMenu elements.
         */
        stop: function () {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(this);
            var submenus = data.active_submenus;

            this.uPopup('wrapper').stop(false, true);

            for (var k in submenus) {
                submenus[k].uMenu('stop');
            }
        },

        /**
         * Removes the uMenu-managed event handlers from each element
         * in {this}, restoring it to its pre-instansiation state.
         */
        destroy: function (_callback) {

            var key = $.uMenu.key;
            var priv = $.uMenu.priv;

            this.each(function () {

                var menu_elt = $(this);
                var data = priv.instance_data_for(menu_elt);

                var options = data.options;
                var submenus = data.active_submenus;

                if (options.sortable) {
                    if (options.parentMenu) {
                        menu_elt.uMenu('root').uSort(
                            'remove', menu_elt, {
                                items: menu_elt.children('.umenu-item')
                            }
                        );
                    } else {
                        menu_elt.uSort('destroy');
                    }
                }

                for (var k in submenus) {
                    var submenu_elt = submenus[k];
                    var sub_data = priv.instance_data_for(submenu_elt);

                    submenu_elt.uMenu('destroy');
                }

                menu_elt.uPopup('destroy', function () {

                    priv.unbind_menu_items(menu_elt);

                    if (options.parentMenu) {
                        menu_elt.hide();
                    }

                    menu_elt.unbind('.' + key);
                    $(document).unbind('click', data.document_click_fn);

                    if (_callback) {
                        _callback.call(menu_elt)
                    }
                });
            });

            return this;
        },

        /**
         * Removes the uMenu-managed event handlers from the entire
         * menu hierarchy containing an element in the selection {this}.
         * Elements and objects are restored to their original state.
         */
        destroyAll: function (_callback) {

            this.uMenu('root').uMenu('destroy', _callback);
        },

        /**
         * If {this} is a submenu, follow the sequence of {parentMenu}
         * options options all of the way up to the root menu, then return
         * the root menu. This option is set automatically by uMenu
         * when creating a sub-menu, and is usually not set directly.
         */
        root: function () {

            var parent_elts = this.uMenu('parents');

            if (parent_elts.length) {
                return parent_elts.last();
            }
            
            return this;
        },

        /**
         * If {this} is a submenu, follow the sequence of {parentMenu}
         * options options all of the way up to the root menu, and return
         * every uMenu instance encountered along the way. This option is
         * set automatically by uMenu when creating a sub-menu, and is
         * usually not set directly.
         */
        parents: function () {

            var priv = $.uMenu.priv;

            return $(this.map(function () {

                var elt = $(this);
                var rv = [ ];

                for (;;) {
                    var data = priv.instance_data_for(elt);
                    var parent_elt = (data.options || {}).parentMenu;

                    if (!parent_elt) {
                        break;
                    }

                    elt = parent_elt;
                    rv = rv.concat(parent_elt);
                }

                return rv;
            }));
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

            var key = $.uMenu.key;

            _menu_elt.data(
                key, {
                 /* items: null,
                    is_visible: false,
                    selected_item_elt: null, */
                    options: _options,
                    active_submenus: {}
                }
            );

            return _menu_elt.data(key);
        },

      /**
        * Bind event handlers, and otherwise initialize, all
        * menu items in {_item_elts} rooted at {_menu_elt}.
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

            $('.' + key, _item_elts).each(function () {
                $(this).hide();
            });

            /* Bind each item:
                For every item selected via the {items} option,
                bind the appropriate mouse-based event handlers. */

            $(_item_elts).each(function (_i) {

                var item_elt = $(this);
                var submenu_elt = item_elt.closestChild('.' + key);
                var arrow_elt = item_elt.closestChild('.' + key + '-arrow');

                var click_fn = function (_ev) {
                    return priv._handle_item_click.call(
                        this, _ev, _menu_elt
                    );
                };

                /* Manage arrow element:
                    If we don't have any sub-menus, hide the arrow symbol,
                    and add a CSS class to easily locate empty subtrees. */

                var s = key + '-empty';

                if (submenu_elt[0]) {
                    arrow_elt.show();
                    item_elt.removeClass(s);
                } else {
                    arrow_elt.hide();
                    item_elt.addClass(s);
                }

                item_elt.data(key, { index: _i });
                item_elt.bind('mouseover.' + key, mouseover_fn);
                item_elt.bind('click.' + key, click_fn);
            });
        },

        /**
         */
        unbind_menu_items: function (_menu_elt) {

            var key = $.uMenu.key;
            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);

            data.items.each(function () {
                var item_elt = $(this);
                priv.toggle_item(_menu_elt, item_elt, false);
                item_elt.unbind('.' + key);
            });
        },
        
        /**
         * Show or hide the hierarchical pop-up menu(s) rooted at
         * {_menu_elt}. If {_is_show} is true, then the popup
         * menu will be shown; otherwise it will be hidden.
         */
        toggle: function (_menu_elt, _is_show, _callback) {

            var priv = $.uMenu.priv;

            $(_menu_elt).each(function () {
                var menu_elt = $(this);

                var op = (_is_show ? 'show' : 'hide');
                var data = priv.instance_data_for(menu_elt);

                menu_elt.uPopup(
                    op, function (_popup_elt) {
                        data.is_visible = _is_show;
                        $.uI.trigger_event(
                            op, $.uMenu.key, null, _menu_elt,
                            data.options, [ _popup_elt ]
                        );
                        if (_callback) {
                            _callback.call(_menu_elt, _popup_elt);
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

            var key = $.uMenu.key;
            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);
            
            var item_elt = $(_item_elt);
            var item_data = _item_elt.data(key);

            var default_callback = (
                _is_select ?
                    priv._default_select_item : priv._default_unselect_item
            );

            /* Submenu toggling:
                The creation of submenus is optionally delayed by a small
                span of time; creation of any submenu will be stopped if
                another item is selected before the delay timeout occurs.
                Submenu destruction is immediate, with no delay setting. */

            var select_fn = function () {
                if (item_data.is_delaying) {
                    priv.toggle_item_submenu(
                        _menu_elt, _item_elt, _is_select
                    );
                }
            };

            if (item_data) {
                if (_is_select) {
                    item_data.is_delaying = true;
                    setTimeout(select_fn, data.options.delay);
                } else {
                    item_data.is_delaying = false;
                    priv.toggle_item_submenu(
                        _menu_elt, _item_elt, _is_select
                    );
                }
                $.uI.trigger_event(
                    (_is_select ? 'select' : 'unselect'),
                        key, default_callback, _menu_elt,
                        data.options, [ _item_elt ]
                );
            }
        },

        /**
         * This function is used by {toggle_item} to open or close a
         * submenu rooted at {_item_elt}. This function is fully
         * asynchronous, and can manage multiple overlapping {select}
         * and {unselect} operations.
         */
        toggle_item_submenu: function (_menu_elt, _item_elt, _is_select) {

            var key = $.uMenu.key;
            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);
            var options = data.options;

            var submenus = data.active_submenus;
            var item_data = _item_elt.data(key);

            if (item_data) {
                var animate_elt = submenus[item_data.index];

                if (animate_elt) {
                    animate_elt.uMenu('stop');
                }
            }

            if (_is_select) {

                /* Selection case:
                    Show the submenu rooted at {item_elt}. */

                var submenu_elt = _item_elt.closestChild('.' + key);
                var arrow_elt = _item_elt.closestChild('.' + key + '-arrow');

                if (submenu_elt[0] && data.items.length > 0) {
                    submenus[item_data.index] = submenu_elt.uMenu(
                        'create', arrow_elt, {
                            hidden: true,
                            vertical: false,
                            direction: data.bias,
                            parentMenu: _menu_elt,
                            style: options.style,
                            items: options.items,
                            sortable: options.sortable,
                            cssClasses: options.cssClasses
                        }
                    );
                    submenu_elt.show();
                    priv.toggle(submenu_elt, true);
                }

            } else if (item_data) {

                /* De-selection case:
                    Hide the submenu rooted at {item_elt}. */

                var submenu_elt = submenus[item_data.index];

                if (submenu_elt) {
                    var submenu_data = priv.instance_data_for(submenu_elt);

                    submenu_elt.uMenu('stop');
                    submenus[item_data.index] = submenu_elt;

                    submenu_elt.uMenu('hide', function () {
                        submenu_elt.uMenu('destroy', function () {
                            delete submenus[item_data.index];
                        });
                    });
                }
            }
        },

        /**
         * Modify the CSS classes of {_menu_elt} to conform to the
         * directional bias data stored in {_bias}. For more information
         * on the bias value and its function, see the uPopup documentation.
         */
        set_direction: function (_menu_elt, _bias) {

            var key = $.uMenu.key;
            _menu_elt.removeClass(key + '-right ' + key + '-left');

            if (_bias.x) {
                _menu_elt.addClass(key + '-right');
            } else {
                _menu_elt.addClass(key + '-left');
            }
        },

        /**
         * Query a uPopup instance provided in {_menu_elt} for its
         * current directional bias data. Use that instance's preferred
         * expansion direction to change the apparence of the arrow
         * symbols in the uMenu instance rooted at {this}. Return a
         * set of directional bias data to be used by the uPopup instance
         * rooted at {this}.
         */
        _determine_popup_bias: function (_menu_elt)
        {
            var priv = $.uMenu.priv;
            var bias = (_menu_elt.uPopup('direction') || [])[0];

            if (bias) {
                priv.set_direction(this, bias);
            }

            /* Return bias data:
                uPopup uses this value to determine a preferred
                direction when expanding popups representing submenus. */

            return {
                x: (bias ? bias.x : 1)
            };
        },

        /**
         * Default handler for item selection; uses a CSS class.
         * Override this by handling the 'select' event, or by
         * providing the onSelect callback.
         */
        _default_select_item: function (_item_elt) {

            $(_item_elt).addClass($.uMenu.key + '-selected');
        },

        /**
         * Default handler for unselecting items; uses a CSS class.
         */
        _default_unselect_item: function (_item_elt) {

            $(_item_elt).removeClass($.uMenu.key + '-selected');
        },

        /**
         * Event handler for uPopup's {reorient} event. This is called
         * by uPopup when the popup window changes position, in response
         * to a change in the available space on any side.
         */
        _handle_drag_reorient: function (_wrapper_elt) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(this);

            if (data.options.sortable) {
                $(this).uSort('recalculate');
            }
        },

        /**
         * Event handler for the outermost uMenu element, which
         * contains the uMenu items. This stops event propogation
         * so that {_handle_window_click} is not invoked after.
         */
        _handle_menu_click: function (_ev) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(this);

            _ev.stopPropagation();
            return false;
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

            if (data.is_visible) {
                menu_elt.uMenu('destroy', function () {
                    menu_elt.css('display', null);
                });
            }

            return false;
        },

        /**
         * Handler for mouse click events occurring inside of
         * a uMenu item. This forwards the click event to callbacks
         * and/or event listeners, and then closes the menu.
         */
        _handle_item_click: function (_ev, _menu_elt) {

            var menu_elt = $(_menu_elt);

            var item_elt = $(this);
            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);

            var is_finished = $.uI.trigger_event(
                'click', $.uMenu.key, priv._handle_default_item_click,
                    menu_elt, data.options, [ item_elt ]
            );

            if (is_finished) {
                menu_elt.uMenu('destroyAll');
            }

            return false;
        },

        /**
         * Default handler for mouse click events occuring inside
         * of a uMenu item. This handler closes the menu if and
         * only if it is a leaf node (i.e. has no submenus).
         */
        _handle_default_item_click: function (_item_elt) {

            var priv = $.uMenu.priv;
            var item_elt = $(_item_elt);
            var data = priv.instance_data_for(this);

            return item_elt.hasClass($.uMenu.key + '-empty');
        },

        /**
         * Handler for mouse-over events occurring inside of
         * a uMenu item. This changes the active menu item, if
         * the item under the mouse is not currently active.
         */
        _handle_item_mouseover: function (_ev, _menu_elt) {

            var priv = $.uMenu.priv;
            var data = priv.instance_data_for(_menu_elt);

            var item_elt = $(this);
            var menu_elt = $(_menu_elt);

            if (data.options.sortable && menu_elt.uSort('dragging')) {
                return false;
            }

            var current_elt = (
                data.selected_item_elt ?
                    data.selected_item_elt[0] : undefined
            );

            if (item_elt.hasClass($.uMenu.key + '-disabled')) {
                return false;
            }

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

