/*global window: false, jQuery: false*/
/*
 * uSort:
 *  A space-efficent sortable implementation for jQuery.
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
 * $.uSort:
 */

(function ($) {

    $.uSort = {};
    $.uSort.key = 'usort';

    $.uSort.impl = {

        /**
         * Initializes one or more new sortable elements, allowing
         * the user to reorder a set of elements inside of a region.
         */
        create: function (_options) {

            var default_options = {
                direction: 'vertical'
            };

            var priv = $.uSort.priv;
            var options = $.extend(default_options, _options || {});
            var data = priv.create_instance_data(this, _options);

            this.addClass($.uSort.key + '-track');
            priv.bind_drag_elements(this, options);

            return this;
        },

        /**
         * Removes the uDrag-managed event handlers from each element
         * in {this}, restoring it to its original pre-drag state.
         */
        destroy: function () {

            var key = $.uSort.key;
            var priv = $.uSort.priv;

            this.each(function (i, sortable_elt) {
                var data = priv.instance_data_for(sortable_elt);

                if (!data.is_created) {
                    return;
                }

                data.items.uDrag('destroy');
                $(sortable_elt).data(key, null);
            });

            return this;
        },

        /**
         * This function allows for the dynamic addition of sortable
         * containers and items, after a sortable element has been
         * created. Given an existing uSort instance in {this}, add
         * items beneath {_elt} to the uSort instance {this}, using
         * the item location instructions given in {_options}.
         */
        add: function (_elt, _options) {
            
            var priv = $.uSort.priv;

            this.each(function () {
                var data = priv.instance_data_for(this);
                var items = priv.parse_items_option(_elt, _options);

                /* Copy data on to new uSort container */
                _elt.data($.uSort.key, data);

                /* Set up sorting within {_elt} */
                priv.bind_drag_elements(_elt, _options);

                /* Allow new items to drop on existing instance */
                items.uDrag('add', $.extend(_options, { drop: this }));

                /* Allow existing items to drop on new instance {_elt} */
                data.items.uDrag('add', $.extend(_options, { drop: _elt }));
            });

            return this;
        },

        /**
         * This function allows for the dynamic deletion of sortable
         * containers/items -- after a sortable element has been
         * created. Given an existing uSort instance in {this}, the
         * {remove} function detaches items beneath {_elt} from the
         * uSort instance {this}, using the item location instructions
         * provied in {_options}.
         */
        remove: function (_elt, _options) {

            var priv = $.uSort.priv;

            this.each(function () {
                var data = priv.instance_data_for(this);
                var items = priv.parse_items_option(_elt, _options);

                items.each(function () {
                    var item_data = $(this).data($.uSort.key + '-item');
                    if (item_data) {
                        data.areas.untrack(this);
                        data.items[item_data.index] = null;
                    }
                });

                data.items.uDrag(
                    'remove', $.extend(_options, { drop: _elt })
                );

                items.uDrag('destroy');
            });

            return this;
        },

        /**
         * Update cached offsets and extents for all of uSort's
         * areas, plus all of the areas managed by its instance
         * of uDrag.
         */
        recalculate: function () {

            var priv = $.uSort.priv;
            var data = priv.instance_data_for(this);

            /* Instance data may not be set yet:
                This might be invoked from an early subtree-modified
                event, firing before the instance data has been created.
                Check for the presence of each member; ignore if missing. */

            if (data.items) {
                data.items.uDrag('recalculate');
            }

            if (data.areas) {
                data.areas.recalculate_all();
            }

            return this;
        }
    };

    /**
     * This namespace contains private functions, each
     * used privately as part of uSort's underlying implementation.
     * Please don't call these from outside of $.uSort.impl.
     */
    $.uSort.priv = {

        /**
         * Set/get the uSort-private storage attached to `_elt`.
         */
        instance_data_for: function (_elt, _v) {

            var elt = $(_elt);
            var key = $.uSort.key;
            var rv = elt.data(key);

            if (!rv) {
                rv = {};
                elt.data(key, rv);
            }

            return rv;
        },

        /**
         */
        bind_drag_elements: function (_sortable_elt, _options) {
    
            var key = $.uSort.key;
            var priv = $.uSort.priv;
            var data = priv.instance_data_for(_sortable_elt);

            var sortable_elt = $(_sortable_elt);
            var items = priv.parse_items_option(sortable_elt, _options);

            items.uDrag('create', {
                drop: sortable_elt,
                scroll: _options.scroll,
                container: _options.container,
                cssClasses: _options.cssClasses,
                onInsertElement: function (_drop_elt) {
                    priv.stop_other_animations(_drop_elt, false);
                    $.uI.trigger_event(
                        'insert', key, null,
                            sortable_elt, _options, [ _drop_elt ]
                    );
                },
                onDrop: function (_drop_elt) {
                    sortable_elt.css('display', 'block');
                    $.uI.trigger_event(
                        'drop', key, null,
                            sortable_elt, _options, [ _drop_elt ]
                    );
                },
                onPositionElement: false,
                onHover: priv._handle_drag_hover,
                onRecalculate: $.proxy(
                    priv._handle_drag_recalculate, sortable_elt
                )
            });

            /* Compact items array:
                This array might be sparse if we've removed drop areas
                previously. Clean out the empty entries before calling
                {add}, as jQuery requires that all entries be defined. */

            data.items = priv.compact_sortable_items(data.items).add(
                priv.bind_sort_items(sortable_elt, items)
            );

            return data;
        },

        /**
         * Initialize private storage on the element _elt, setting
         * all private fields to their original default values. This
         * must be called before any sortables can be modified.
         */
        create_instance_data: function (_sortable_elt, _options) {

            _sortable_elt.data(
                $.uSort.key, {
                 /* elt: null,
                    items: null, */
                    animations: {},
                    is_created: true,
                    animation_count: 0,
                    animate: !!(_options.animate),
                    areas: new $.uDrag.AreaIndex(),
                    fixed_speed_animation: !(
                        (_options.animate || '').toString().match(/^v/)
                    ),
                    step: (_options.step || 2), /* pixel(s) */
                    interval: (_options.interval || 8), /* ms */
                    duration: (_options.duration || 250), /* ms */
                    is_vertical: !(
                        (_options.direction ||
                            _options.orientation || '').match(/^h/)
                    )
                }
            );

            return _sortable_elt.data($.uSort.key);
        },

        /**
         */
        bind_sort_items: function (_sortable_elt, _item_elts) {

            var key = $.uSort.key;
            var priv = $.uSort.priv;
            var data = priv.instance_data_for(_sortable_elt);

            var item_elts = $(_item_elts);
            var base_index = (data.items || []).length;

            item_elts.each(function (_i) {
                var item_elt = $(this);
                var item_key = key + '-item';

                item_elt.addClass(item_key);
                item_elt.data(item_key, { index: _i + base_index });

                data.areas.track(item_elt, {
                    sortable_elt: (
                        item_elt.parents('.' + key + '-track').first()
                    )
                });
            });

            return item_elts;
        },

        /**
         */
        parse_items_option: function (_sortable_elt, _options) {

            var rv = _options.items;

            switch (typeof(rv)) {
                case 'function':
                    rv = $(rv.apply(_sortable_elt));
                    break;
                case 'string':
                    rv = _sortable_elt.find(rv);
                    break;
                default:
                case 'object':
                    rv = $(rv);
                    break;
            }

            return rv;
        },

        /*
         * Insert {_elt} either before or after {_target_area},
         * depending upon {_elt}'s original position. Recalculate
         * areas for any affected elements. If animation is enabled,
         * this function will be run asynchronously.
         */
        insert_element: function (_sortable_elt, _src_area,
                                  _target_area, _callback) {

            var priv = $.uSort.priv;
            var data = priv.instance_data_for(_sortable_elt);

            var areas = data.areas;
            var src_elt = _src_area.elt;
            var target_elt = _target_area.elt;
            var target_index = areas.element_to_index(target_elt);
            var item_selector = '.usort-item:not(.animation)';

            var between_elts = $.uI.directional_find(
                src_elt, target_elt, item_selector, false
            );

            var different_parent = false;
            var is_backward = ((between_elts.last())[0] === target_elt[0]);

            /* Change of parent?
                If the {src_elt} is being dropped on a different parent
                element, force the {target_elt} to move downward. Update
                the parent element to reflect the fact that it's moving. */

            if (_src_area.sortable_elt[0] !== _target_area.sortable_elt[0]) {
                is_backward = different_parent = true;
                _src_area.sortable_elt = _target_area.sortable_elt;
            }

            /* Base element insertion function */
            var insert_element_common = function () {
                if (is_backward) {
                    src_elt.insertBefore(target_elt);
                } else {
                    src_elt.insertAfter(target_elt);
                }
            };

            /* Callback invocation function */
            var invoke_callback = function () {
                if (_callback) {
                    _callback.apply(_sortable_elt, arguments);
                }
            };

            /* One animation at a time:
                Acquire lock on animations around {target_elt}. */

            if (data.animate) {
                if (data.animations[target_index]) {
                    return true;
                }
                priv.stop_other_animations(_sortable_elt, target_index);
            }

            /* Determine recalculation range:
                A move operation affects the position of all
                elements between {src_elt} and {target_elt}; store
                these in a list and recalculate their position later. */

            var recalc_elts;

            if (different_parent) {
                var next_elt = src_elt.next();
                recalc_elts = [ src_elt, next_elt, target_elt ].concat(
                    next_elt.nextAll().add(target_elt.nextAll()).toArray()
                );
            } else {
                recalc_elts = $.uI.directional_find(
                   target_elt, src_elt, item_selector, is_backward
                );
            }

            if (data.animate) {

                /* Produce two {_elt} clones:
                    These are used as animated placeholders. */

                var grow_elt = target_elt.clone(true);
                var shrink_elt = src_elt.clone(true).show();

                var before_elt = $(src_elt.prev(':not(.animation)'));
                var after_elt = $(src_elt.next(':not(.animation)'));

                shrink_elt.addClass('animation');
                grow_elt.addClass('animation');

                shrink_elt.css('visibility', 'hidden');
                grow_elt.css('visibility', 'hidden');

                /* Insert placeholder elements:
                    One element will start with a extent of zero and
                    grow to its natural extent, one will start at its
                    natural extent and shrink to an extent of zero. */

                if (is_backward) {
                    shrink_elt.insertBefore(src_elt);
                    grow_elt.insertBefore(target_elt);
                } else {
                    shrink_elt.insertAfter(src_elt);
                    grow_elt.insertAfter(target_elt);
                }

                insert_element_common();
                src_elt.css('display', 'none');

                var after_animation = function () {

                    grow_elt.remove();
                    shrink_elt.remove();

                    if ((--data.animation_count) === 0) {
                        src_elt.css('display', 'block');
                    }
                    
                    areas.recalculate_element_areas(recalc_elts);

                    invoke_callback();
                    delete data.animations[target_index];
                };

                var slide_function = (
                    data.fixed_speed_animation ?
                        priv.slide_elements_fixed
                            : priv.slide_elements_variable
                );
                
                ++data.animation_count;

                data.animations[target_index] = slide_function(
                    data, grow_elt, shrink_elt, after_animation
                );

            } else {

                insert_element_common();
                areas.recalculate_element_areas(recalc_elts);
                invoke_callback();
            }

            return true;
        },

        /**
         * A helper for {insert_element}'s animation support: animate {_elt}
         * down to either zero width or zero height, depending upon the
         * uSort {orientation} option -- while simultaneously animating
         * {_elt} up to its original width or height. This implementation
         * uses a wall-clock duration, and will likely produce non-integer
         * extents with many digits after the decimal point.
         */
        slide_elements_variable: function (_data, _grow_elt,
                                           _shrink_elt, _callback) {
            var keys = (
                _data.is_vertical ?
                    { extent: 'height', minimal: 'Top', maximal: 'Bottom' }
                    : { extent: 'width', minimal: 'Left', maximal: 'Right' }
            );

            var rules = {};

            rules[keys.extent] =
                rules['margin' + keys.minimal] = rules['margin' + keys.maximal] =
                rules['padding' + keys.minimal] =
                rules['padding' + keys.maximal] = 'hide';
           
            _grow_elt.css(
                (_data.is_vertical ? 'height' : 'width'), 0
            );

            _shrink_elt.animate(rules, {
                complete: _callback,
                duration: _data.duration,
                step: function (now, fx) {
                    _grow_elt.css(fx.prop, fx.start - now);
                }
            });

            return { grow: _grow_elt[0], shrink: _shrink_elt[0] };
        },

        /**
         * A helper for {insert_element}'s animation support: animate
         * {_elt} down to either zero width or zero height, depending
         * upon the uSort {orientation} option -- while simultaneously
         * animating {_elt} up to its original width or height. This
         * implementation animates a fixed number of frames proportional
         * to the elements' extent, rather than a duration in seconds.
         */
        slide_elements_fixed: function (_data, _grow_elt,
                                        _shrink_elt, _callback) {

            var Animation = function (_grow_elt, _shrink_elt, _callback) {

                this._is_running = false;
                this._grow_elt = _grow_elt;
                this._shrink_elt = _shrink_elt;
                this._callback = _callback;
                this._data = _data;

                return this;
            };

            /**
             * Fixed-frame animation:
             *  This custom animation implementation uses a fixed number
             *  of frames, rather than a wall-clock duration. When using
             *  a wall-clock duration, jQuery needs to divide the element's
             *  total extent by the elapsed time, leading to non-integer
             *  extents with very large decimal portions. Placement can
             *  vary +/- one pixel in some browsers, which causes visual
             *  jitter during the animation. This method is integer-only,
             *  and provides predictable placement in all browsers.
             */

            Animation.prototype = {
                initialize: function () {
                    var keys = this.keys = (
                        this._data.is_vertical ?
                            [ 'height', 'margin-top', 'margin-bottom',
                                'padding-top', 'padding-bottom' ]
                            : [ 'width', 'margin-left', 'margin-right',
                                'padding-left', 'padding-right' ]
                    );

                    this.current = {};
                    this.original = {};

                    for (var i = 0, len = keys.length; i < len; ++i) {
                        var value = parseInt(
                            this._shrink_elt.css(keys[i]), 10
                        );
                        this.original[keys[i]] = value;
                        this.current[keys[i]] = value;
                    }
                    
                    return this;
                },

                frame: function () {
                    var keys = this.keys;
                    var should_continue = false;

                    for (var i = 0, len = keys.length; i < len; ++i) {
                        var value = this.current[keys[i]];
                        if (value > 0) {
                            if (value > this._data.step) {
                                this.current[keys[i]] -= this._data.step;
                            } else {
                                this.current[keys[i]] = 0;
                            }
                            this._shrink_elt.css(
                                keys[i], value + 'px'
                            );
                            this._grow_elt.css(
                                keys[i],
                                (this.original[keys[i]] - value) + 'px'
                            );
                            should_continue = true;
                        }
                    }

                    return should_continue;
                },

                complete: function () {
                    this._is_running = false;
                    return this._callback();
                },

                run: function () {
                    this.frame();
                    this._is_running = true;

                    var timer_id = setInterval($.proxy(
                        function () {
                            if (!this._is_running || !this.frame()) {
                                this.complete();
                                clearInterval(timer_id);
                            }
                        }, this
                    ), this._data.interval);

                    return this;
                },

                stop: function () {

                    /* Prevent flicker on some browsers:
                        Remove animation elements synchronously,
                        rather than from inside of the interval handler. */

                    this._grow_elt.remove();
                    this._shrink_elt.remove();

                    this._is_running = false;
                    return this;
                }
            };

            var a = new Animation(
                _grow_elt, _shrink_elt, _callback
            );
            
            return a.initialize().run();
        },

        /**
         * Stops a currently-running animation, using the method
         * denoted by the {animate} option. One method is a custom
         * implementation of fixed-frame animation; the other is
         * based upon jQuery's wall-clock animation implementation.
         */
        stop_animation: function (_data, _animation) {

            if (_data.fixed_speed_animation) {
                _animation.stop();
            } else {
                for (var i in _animation) {
                    if (_animation[i]) {
                        $(_animation[i]).stop(false, true).remove();
                    }
                }
            }
        },

        /**
         * Stop all in-progress animations, except for those 
         * with a {$.uDrag.AreaIndex} ordinal offset of {_index}.
         * If {_index} is non-numeric, calcel all animations.
         */
        stop_other_animations: function (_sortable_elt, _index)
        {
            var priv = $.uSort.priv;
            var data = priv.instance_data_for(_sortable_elt);

            var animations = data.animations;

            for (var i in animations) {
                if (i !== _index) {
                    if (animations[i]) {
                        priv.stop_animation(data, animations[i]);
                    }
                }
            }
        },
        /**
         * For purposes of efficiency, the uSort {remove} method only
         * blanksout  values in the {items} array, rather than filtering
         * the array every time. This function removes free space, 
         * ensuring that the list of sortable items can be safely used
         * with functions that don't skip nulls. After compaction, we
         * renumber 
         */
        compact_sortable_items: function (_item_elts) {

            var index = 0;

            return (_item_elts || $([])).filter(function (_i, _elt) {

                if (_elt !== null && _elt !== undefined) {
                    /* Renumber */
                    var item_data = $(this).data($.uSort.key + '-item');
                    item_data.index = index++;
                    return true;

                } else {
                    /* Filter */
                    return false;
                }
            });
        },

        /**
         * Event handler for uDrag-initiated {hover} events.
         */
        _handle_drag_hover: function (_drop_elt, _offsets) {

            var priv = $.uSort.priv;
            var data = priv.instance_data_for(_drop_elt);
            var src_area = data.areas.element_to_area(this);

            var target_area = data.areas.find_beneath(
                _offsets.absolute
            );

            if (target_area && !target_area.elt.hasClass('placeholder')) {
                priv.insert_element(_drop_elt, src_area, target_area);
            }

            $.uI.trigger_event(
                'hover', $.uSort.key, null,
                    this, data.options, [ _drop_elt, _offsets ]
            );

            return true; /* Allow drop operation */
        },

        /**
         * Event handler for uDrag-initiated {recalculate} events.
         */
        _handle_drag_recalculate: function () {

            var priv = $.uSort.priv;
            var data = priv.instance_data_for(this);

            $.uI.trigger_event(
                'recalculate',
                    $.uSort.key, null, this, data.options
            );

            data.areas.recalculate_all();
            return true;
        }
    };
 
    $.fn.uSort = function (/* const */_method /* , ... */) {

        /* Dispatch to appropriate method handler:
            Note that the `method` argument should always be a constant;
            never allow user-provided input to be used for the argument. */

        return $.uSort.impl[_method].apply(
            this, Array.prototype.slice.call(arguments, 1)
        );
    };

}(jQuery));

