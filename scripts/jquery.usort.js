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
            create_instance_data: function (_elt, _options) {
                _elt.data(
                    'usort', {
                        elt: null,
                        udrag: null,
                        options: _options,
                        area_index: new uDrag.AreaIndex()
                    }
                );

                return _elt.data('usort');
            },

            /**
             * Event handler for uDrag-initiated hover events.
             */
            handle_drag_hover: function (_elt, _drop_elt, _offsets) {

                var priv = $.uSort.impl.priv;
                var data = priv.instance_data_for(this);

                var area_index = data.area_index;
                var area = area_index.find_beneath(_offsets.absolute);

                if (area && !area.elt.hasClass('placeholder')) {
                    var drop_index = area.elt.prevAll().length;
                    var drag_index = _elt.prevAll().length;

                    if (drop_index < drag_index) {
                        var stop_elt = _elt.prev();
                        _elt.insertBefore(area.elt);
                        area_index.recalculate_between(_elt, stop_elt);
                    } else {
                        var start_elt = _elt.next();
                        _elt.insertAfter(area.elt);
                        area_index.recalculate_between(start_elt, _elt);
                    }
                }

                return false;
            },

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

