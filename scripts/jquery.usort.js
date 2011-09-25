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
    $.uSort.impl = {

        /**
         * Initializes one or more new sortableelements, allowing
         * the user to reorder a set of elements inside of a region.
         */
        create: function (_options) {

            var default_options = {};
            var priv = $.uSort.impl.priv;
            var options = $.extend(default_options, _options || {});
            var data = priv.create_instance_data(this, options);

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
                drop: this,
                onInsertElement: false,
                onPositionElement: false,
                container: options.container,
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
        },

        /**
         * A namespace that contains private functions, each
         * used internally as part of uDrag's implementation.
         * Please don't call these from outside of $.uDrag.impl.
         */
        priv: {

            /**
             * Set/get the uSort-private storage attached to `_elt`.
             */
            instance_data_for: function (_elt, _v) {

                var key = 'usort';
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
             * Initialize private storage on the element _elt, setting
             * all private fields to their original default values. This
             * must be called before any sortables can be modified.
             */
            create_instance_data: function (_sortable_elt, _options) {
                _sortable_elt.data(
                    'usort', {
                        elt: null,
                        udrag: null,
                        active_animations: {},
                        options: _options,
                        area_index: new uDrag.AreaIndex()
                    }
                );

                return _sortable_elt.data('usort');
            },

            /*
             * Insert {_elt} either before or after {_target_elt},
             * depending upon {_elt}'s original position. Recalculate
             * areas for any affected elements. If animation is enabled,
             * this function will be run asynchronously.
             */
            insert_element: function (_sortable_elt, _elt,
                                      _target_elt, _callback) {
                
                var priv = $.uSort.impl.priv;
                var data = priv.instance_data_for(_sortable_elt);
                var options = data.options;
                
                var areas = data.area_index;
                var drag_index = _elt.prevAll().length;
                var drop_index = _target_elt.prevAll().length;
                var in_negative_direction = (drop_index < drag_index);

                var stop_elt = $(
                    _elt.next(':not(.placeholder)')[0] || _elt[0]
                );
                var start_elt = $(
                    _elt.prev(':not(.placeholder)')[0] || _target_elt[0]
                );

                var invoke_insert = function () {
                    if (in_negative_direction) {
                        _elt.insertBefore(_target_elt);
                    } else {
                        _elt.insertAfter(_target_elt);
                    }
                };

                var invoke_recalculate = function () {
                    areas.recalculate_all();
                    if (_callback) {
                        _callback.apply(_sortable_elt, arguments);
                    }
                }

                if (data.options.animate) {
                
                    var index = areas.element_index(_target_elt);
                    var animations = data.active_animations;

                    _elt.slideUp(0);

                    /* One animation at a time:
                        Acquire lock on animations around {_target_elt}. */

                    if (!data.active_animations[index]) {

                        for (var i in animations) {
                            if (i != index) {
                                for (var j in animations[i]) {
                                    animations[i][j].stop().remove();
                                }
                                delete animations[i];
                            }
                        }

                        var top_elt = _target_elt.clone(true);
                        var bottom_elt = _target_elt.clone(true);

                        top_elt.css('visibility', 'hidden');
                        bottom_elt.css('visibility', 'hidden');

                        data.active_animations[index] = [
                            top_elt, bottom_elt
                        ];

                        if (in_negative_direction) {
                            top_elt.insertBefore(_elt);
                            bottom_elt.insertBefore(_target_elt);
                        } else {
                            top_elt.insertAfter(_elt);
                            bottom_elt.insertAfter(_target_elt);
                        }

                        invoke_insert();

                        top_elt.slideDown(0, function () {
                            top_elt.slideUp(
                                options.duration || 200, function () {
                                    if (data.active_animations[index]) {
                                        _elt.slideDown(0);
                                        top_elt.remove();
                                        bottom_elt.remove();
                                        delete data.active_animations[index];
                                        invoke_recalculate();
                                    }
                                }
                            );
                        });

                        bottom_elt.slideUp(0, function () {
                            bottom_elt.slideDown(options.duration || 200);
                        });
                    }

                } else {
                    invoke_insert();
                    invoke_recalculate();
                }

                return true;
            },

            /**
             * Event handler for uDrag-initiated {hover} events.
             */
            handle_drag_hover: function (_elt, _drop_elt, _offsets) {

                var priv = $.uSort.impl.priv;
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
            
                var priv = $.uSort.impl.priv;
                var data = priv.instance_data_for(this);

                data.area_index.recalculate_all();
                return false;
            }

        }

    };
 
    $.fn.uSort = function (/* const */_method /* , ... */) {

        /* Dispatch to appropriate method handler:
            Note that the `method` argument should always be a constant;
            never allow user-provided input to be used for the argument. */

        if (_method === 'priv') {
            return null;
        }

        return $.uSort.impl[_method].apply(
            this, Array.prototype.slice.call(arguments, 1)
        );
    };

})(jQuery);

