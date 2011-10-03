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
         * Initializes one or more new sortableelements, allowing
         * the user to reorder a set of elements inside of a region.
         */
        create: function (_options) {

            var default_options = {
                direction: 'vertical'
            };

            var priv = $.uSort.priv;
            var options = $.extend(default_options, _options || {});
            var data = priv.create_instance_data(this, options);

            var sortable_elt = this;
            var items = options.items;

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

            data.udrag = items.uDrag('create', {
                drop: sortable_elt,
                container: options.container,
                onInsertElement: function (_elt, _drop_elt) {
                    priv.stop_other_animations(sortable_elt, false);
                },
                onPositionElement: false,
                onHover: $.proxy(priv.handle_drag_hover, this),
                onRecalculate: $.proxy(priv.handle_drag_recalculate, this)
            });

            items.each(function (i, elt) {
                data.area_index.track(elt);
            });

            return this;
        },

        /**
         * Removes the uDrag-managed event handlers from each element
         * in {this}, restoring it to its original pre-drag state.
         */
        destroy: function () {

            $.uDrag('destroy', data.udrag);
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
                _elt.data(key, rv);
            }

            return rv;
        },

        /**
         * Initialize private storage on the element _elt, setting
         * all private fields to their original default values. This
         * must be called before any sortables can be modified.
         */
        create_instance_data: function (_sortable_elt, _options) {
            _sortable_elt.data(
                $.uSort.key, {
                    elt: null,
                    udrag: null,
                    animations: {},
                    animation_count: 0,
                    area_index: new $.uDrag.AreaIndex(),
                    animate: !!(_options.animate),
                    duration: (_options.duration || 250),
                    is_vertical: !(
                        (_options.direction ||
                            _options.orientation || '').match(/^h/)
                    )
                }
            );

            return _sortable_elt.data($.uSort.key);
        },

        /*
         * Insert {_elt} either before or after {_target_elt},
         * depending upon {_elt}'s original position. Recalculate
         * areas for any affected elements. If animation is enabled,
         * this function will be run asynchronously.
         */
        insert_element: function (_sortable_elt, _elt,
                                  _target_elt, _callback) {
            
            var priv = $.uSort.priv;
            var data = priv.instance_data_for(_sortable_elt);

            var areas = data.area_index;
            var index = areas.element_to_index(_target_elt);

            var i_elt = _elt.prevAll(':not(.animation)').length;
            var i_dst = _target_elt.prevAll(':not(.animation)').length;
            var is_backward = (i_dst < i_elt);

            /* Base element insertion function */
            var insert_element_common = function () {
                if (is_backward) {
                    _elt.insertBefore(_target_elt);
                } else {
                    _elt.insertAfter(_target_elt);
                }
            };

            /* Callback invocation function */
            var invoke_callback = function () {
                if (_callback) {
                    _callback.apply(_sortable_elt, arguments);
                }
            }

            /* One animation at a time:
                Acquire lock on animations around {_target_elt}. */

            if (data.animate) {
                if (data.animations[index]) {
                    return true;
                }
                priv.stop_other_animations(_sortable_elt, index);
            }

            /* Determine recalculation range:
                A move operation affects the position of all
                elements between {_elt} and {_target_elt}; store
                these in a list and recalculate their position later. */

            var recalculate_elts = priv.find_elements_between.apply(
                null, (is_backward ?
                    [ _target_elt, _elt ] : [ _elt, _target_elt ])
            );

            if (data.animate) {

                /* Produce two {_elt} clones:
                    These are used as animated placeholders. */

                var shrink_elt = _target_elt.clone(true);
                var grow_elt = _target_elt.clone(true);

                var before_elt = $(_elt.prev(':not(.animation)'));
                var after_elt = $(_elt.next(':not(.animation)'));

                shrink_elt.addClass('animation');
                grow_elt.addClass('animation');

                shrink_elt.css('visibility', 'hidden');
                grow_elt.css('visibility', 'hidden');

                /* Insert placeholder elements:
                    One element will start with a extent of zero and
                    grow to its natural extent, one will start at its
                    natural extent and shrink to an extent of zero. */

                if (is_backward) {
                    shrink_elt.insertBefore(_elt);
                    grow_elt.insertBefore(_target_elt);
                } else {
                    shrink_elt.insertAfter(_elt);
                    grow_elt.insertAfter(_target_elt);
                }

                insert_element_common();
                _elt.css('display', 'none');

                var after_animation = function () {

                    grow_elt.remove();
                    shrink_elt.remove();

                    if ((--data.animation_count) == 0) {
                        _elt.css('display', 'block');
                    }
                    
                    areas.recalculate_element_areas(recalculate_elts);

                    invoke_callback();
                    delete data.animations[index];
                };

                ++data.animation_count;
                data.animations[index] = priv.slide_elements(
                    data, grow_elt, shrink_elt,
                        data.duration, after_animation
                );

            } else {

                insert_element_common();
                areas.recalculate_element_areas(recalculate_elts);
                invoke_callback();
            }

            return true;
        },

        /**
         * A helper for {insert_element}'s animation support: animate
         * {_elt} down to either zero width or zero height, depending
         * upon the uSort {orientation} option -- while simultaneously
         * animating {_elt} up to its original width or height.
         */
        slide_elements: function (_options, _grow_elt,
                                  _shrink_elt, _duration, _callback) {

            var animation = function (_grow_elt, _shrink_elt, _callback) {

                this._is_running = false;
                this._grow_elt = _grow_elt;
                this._shrink_elt = _shrink_elt;
                this._callback = _callback;
                this._frame_duration = 1; /* ms */

                return this;
            };

            /**
             * Fixed-frame animation:
             *  This custom animation implementation uses a fixed number
             *  of frames, rather than a wall-clock duration. When using
             *  a wall-clock duration, jQuery needs to divide the element's
             *  total extent by the elapsed time, leading to non-integer
             *  extents with very large decimal portions. Placement can
             *  vary +/- one pixel between browsers, which causes visual
             *  jitter during the animation. This method is integer-only,
             *  and provides predictable placement in all browsers.
             */

            animation.prototype = {
                initialize: function () {
                    var keys = this.keys = (
                        _options.is_vertical ?
                            [ 'height', 'margin-top', 'margin-bottom',
                                'padding-top', 'padding-bottom' ]
                            : [ 'width', 'margin-left', 'margin-right',
                                'padding-left', 'padding-right' ]
                    );

                    this.current = {}, this.original = {};

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
                            this.current[keys[i]] -= 1;
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
                    ), this._frame_duration);

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

            var a = new animation(
                _grow_elt, _shrink_elt, _callback
            );
            
            return a.initialize().run();
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
                        animations[i].stop();
                    }
                }
            }
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
        },

        /**
         * Event handler for uDrag-initiated {hover} events.
         */
        handle_drag_hover: function (_elt, _drop_elt, _offsets) {

            var priv = $.uSort.priv;
            var data = priv.instance_data_for(this);
            var area = data.area_index.find_beneath(_offsets.absolute);

            if (area && !area.elt.hasClass('placeholder')) {
                priv.insert_element(this, _elt, area.elt);
            }

            return false;
        },

        /**
         * Event handler for uDrag-initiated {recalculate} events.
         */
        handle_drag_recalculate: function (_elt) {

            var priv = $.uSort.priv;
            var data = priv.instance_data_for(this);

            data.area_index.recalculate_all();
            return false;
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

})(jQuery);

