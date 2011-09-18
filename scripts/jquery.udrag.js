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
 * uDrag.AreaIndex:
 *  A list of elements, organized to be searchable by physical area
 *  (i.e. offset and dimensions). The {find_beneath} operation returns
 *  the subset of elements that overlap a specific point on the page.
 */

uDrag = {};
uDrag.AreaIndex = function () {};

uDrag.AreaIndex.prototype = {

    /**
     * Instance-specific data for uDrag.AreaIndex.
     */
    _zones: [],

    /**
     * Start tracking the area of the page occupied by {_elt}.
     * Optionally, {_zone} is an object containing supplemental
     * data, which will be stored along with {_elt}.
     */
    track: function (_elt, _zone) {

        zone = (_zone || {});
        zone.elt = _elt;

        this._zones.push(zone);
        this.recalculate_one(zone);

        return zone;
    },

    /**
     * Recalculates position and extent information for
     * the {drop_zones} structure. This structure is used to
     * map page coordinates to specific drop zone elements.
     */
    recalculate_all: function (_elt) {

        var zones = this._zones;

        for (var i = 0, len = zones.length; i < len; ++i) {
            this.recalculate_one(zones[i]);
        }

        return _elt;
    },

    /*
     * Recalculates position and extent information for a single
     * member of the {drop_zones} structure, specified in {_zone}.
     * These structures are used to map page coordinates to specific
     * drop zone elements.
     */
    recalculate_one: function (_zone) {

        var size = { x: 0, y: 0 };
        var container_elt = _zone.container_elt;
        var offset = (container_elt.offset() || { left: 0, top: 0 });

        if (container_elt && container_elt[0] == window) {
            size = {
                x: container_elt.width(),
                y: container_elt.height()
            };
        } else {
            size = {
                x: container_elt.outerWidth(),
                y: container_elt.outerHeight()
            };
        }

        _zone.x = [ offset.left, offset.left + size.x ];
        _zone.y = [ offset.top, offset.top + size.y ];

        return _zone;
    },

    /**
     * Returns the set of drop elements that lie directly
     * underneath the mouse pointer (position specified in _ev).
     */
    find_topmost: function (_zones) {

        var rv = null, rvz = null;

        for (var i = 0, len = _zones.length; i < len; ++i) {
            var zone = _zones[i];
            var z = parseInt(zone.elt.css('z-index'), 10);

            if (!rv || z > rvz) {
                rv = zone;
                rvz = z;
            }
        }

        return rv;
    },

    /**
     * Returns the set of drop zones that lie directly beneath
     * the mouse pointer. The position is taken from the pageX
     * and pageY values of the supplied event object {_ev}.
     */
    find_beneath: function (_elt, _ev) {

        var zones = this._zones;
        var overlapping_zones = [];

        var x = _ev.pageX;
        var y = _ev.pageY;

        /* Hit detection:
            If the mouse pointer is currently positioned over one
            or more drop zone containers, save them in an array. */

        for (var i = 0, len = zones.length; i < len; ++i) {
            var zone = zones[i];
            var container_elt = zone.container_elt;

            /* Special case:
                Scrolling container is the browser window. */

            if (container_elt && container_elt[0] == window) {
                x -= container_elt.scrollLeft();
                y -= container_elt.scrollTop();
            }

            /* Require containment along x-xais */
            if (x < zone.x[0] || x > zone.x[1]) {
                continue;
            }

            /* Require containment along y-xais */
            if (y < zone.y[0] || y > zone.y[1]) {
                continue;
            }

            overlapping_zones.push(zone);
        }

        /* No drop zones under pointer?
            Skip the autoscroll calculations, and return nothing. */

        if (overlapping_zones.length <= 0) {
            return null;
        }

        return this.find_topmost(overlapping_zones);
    }
};


/**
 * $.uDrag:
 */

(function ($) {

    $.uDrag = {};
    $.uDrag.impl = {

        /**
         * Initializes one or more new draggable elements, allowing
         * the user to pick up the element and move it somewhere else.
         */
        create: function (_options) {

            var default_options = {
                scrollDelta: 32, /* px */
                scrollDelay: 256, /* ms */
                scrollInterval: 64, /* ms */
                scrollEdgeExtent: 48 /* px, per side */
            };

            var doc = $(document);
            var priv = $.uDrag.impl.priv;
            var options = $.extend(default_options, _options || {});

            this.each(function (i, elt) {

                elt = $(elt);

                /* Draggable elements:
                    Register event handlers to detect drag/move events. */

                doc.bind(
                    'mousemove.udrag',
                    $.proxy(priv.handle_document_mousemove, elt)
                );

                doc.bind(
                    'mouseup.udrag',
                    $.proxy(priv.handle_document_mouseup, elt)
                );

                $(window).bind(
                    'resize.udrag',
                    $.proxy(priv.handle_document_resize, elt)
                );

                elt.bind(
                    'mousedown.udrag', priv.handle_drag_mousedown
                );

                priv.bind_drop_zones(elt, options);
            });

            return this;
        },

        /**
         * Removes the uDrag-managed event handlers from each element
         * in {this}, restoring it to its original pre-drag state.
         */
        destroy: function () {

            $(document).unbind('.udrag');
            $(window).unbind('.udrag');

            this.each(function (i, elt) {
                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(elt);

                elt.unbind('.udrag');
                elt.data('udrag', null);
            });

            return this;
        },

        /**
         * A namespace that contains private functions, each
         * used internally as part of uDrag's implementation.
         * Please don't call these from outside of $.uDrag.impl.
         */
        priv: {

            /**
             * Set/get the uDrag-private storage attached to `_elt`.
             */
            instance_data_for: function (_elt, _v) {

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
             * Start a drag operation for {_elt}.
             */
            start_dragging: function (_elt, _ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);
                var offset = _elt.offset();

                if (data.is_dragging) {
                    return false;
                }

                data.delta = {
                    x: (_ev.offsetX || _ev.pageX - offset.left),
                    y: (_ev.offsetY || _ev.pageY - offset.top)
                };

                data.is_dragging = true;
                var drag_elt = priv.create_overlay(_elt, _ev);

                data.extent = {
                    x: drag_elt.outerWidth(),
                    y: drag_elt.outerHeight()
                };

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

                data.drop_zones.recalculate_all(_elt);
                priv.update_position(_elt, _ev);
            },

            /**
             * End a drag operation for {_elt}.
             */
            stop_dragging: function (_elt, _ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);
                var drop_zone = data.drop_zones.find_beneath(_elt, _ev);

                priv.clear_highlight(null, data);

                if (drop_zone) {

                    var drop_elt = drop_zone.elt;

                    var position_callback = (
                        data.options.positionElement ||
                            priv.default_position_element
                    );

                    position_callback(
                        _elt, priv.relative_drop_offset(_elt, drop_elt, _ev)
                    );

                    priv.move_element(_elt, drop_elt, _ev);
                }

                data.is_dragging = false;
                priv.stop_autoscroll(_elt);
                priv.return_to_original_position(_elt);
            },
           
            /**
             * The default implementation of the positionElement callback.
             * If not overridden, this will use relative positioning to
             * maintain the exact coordinates of the dropped element.
             */
            default_position_element: function (_elt, _offset) {

                _elt.css('position', 'relative');
                _elt.css('top', _offset.y + 'px');
                _elt.css('left', _offset.x + 'px');

                return _elt;
            },

            /**
             * Update the apparent position of the element being dragged,
             * so that it is appears at the coordinates specified in {_ev}.
             */
            update_position: function (_elt, _ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);
                var drop_zone = data.drop_zones.find_beneath(_elt, _ev);

                var recent = data.recent_drop_zone_containers = [
                    data.recent_drop_zone_containers[1], drop_zone
                ];

                /* Move element */
                data.drag_element.offset({
                    top: _ev.pageY - data.delta.y,
                    left: _ev.pageX - data.delta.x
                });

                priv.clear_highlight(drop_zone, data);
                priv.calculate_autoscroll_direction(_elt, _ev, drop_zone);

                if (drop_zone) {

                    /* Special autoscrolling case:
                        The pointer moved from one drop zone to another,
                        directly and without any events in-between the two.
                        Switch out the autoscroll element directly, and
                        recalculate the scroll direction. We can't stop
                        and then start scrolling here, because the timeout
                        handler won't get a chance to run between the
                        two calls, and thus autoscrolling won't restart. */

                    if (recent[0] && recent[0] != recent[1]) {
                        data.autoscroll_elt = drop_zone.container_elt[0];
                        priv.calculate_autoscroll_direction(
                            _elt, _ev, drop_zone
                        );
                    }

                    priv.set_highlight(drop_zone, data);
                    priv.start_autoscroll(_elt, drop_zone);

                } else {
                    priv.stop_autoscroll(_elt);
                }

                return _elt;
            },

            /**
             * Start scrolling the container element in {_drop_zone},
             * using the scroll-axis information found in {_elt}. This
             * information is calculated in find_drop_zone_beneath, which
             * is called every time the draggable element is repositioned.
             */
            start_autoscroll: function (_elt, _drop_zone) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);
                var scroll_axes = data.autoscroll_axes;
                var options = data.options;

                if (data.is_autoscrolling) {
                    return false;
                }

                if (!scroll_axes.x && !scroll_axes.y) {
                    data.has_scrolled_recently = false;
                    return false;
                }

                data.is_autoscrolling = true;
                data.autoscroll_elt = _drop_zone.container_elt[0];
                priv.handle_autoscroll_timeout(_elt, _drop_zone);
            },

            /**
             * Stop scrolling the container element found in {_drop_zone}.
             * This merely modifies {_elt}'s private storage, which causes
             * {_handle_autoscroll_timeout} to clean up and stop running.
             */
            stop_autoscroll: function (_elt) {
                
                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);

                if (!data.is_autoscrolling) {
                    return false;
                }

                /* The timeout function is still scheduled:
                    Clear the auto-scroll element; the timeout function
                    will set is_autoscrolling to false when it's invoked. */

                data.autoscroll_elt = null;
            },

            /**
             * Represents a single 'frame' of the auto-scrolling feature.
             * If the {autoscroll_elt} private storage field is set,
             * this function reschedules itself to run again.
             */
            handle_autoscroll_timeout: function (_elt, _drop_zone) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);

                var options = data.options;
                var scroll_axes = data.autoscroll_axes;
                var autoscroll_elt = $(data.autoscroll_elt);

                /* Stop scrolling?
                    Stop if neither axis is active, or if we're
                    currently hovering over a non-droppable target. */

                if (!data.autoscroll_elt) {
                    data.is_autoscrolling = false;
                    data.has_scrolled_recently = false;
                    return false;
                }

                /* Scroll window:
                    Move each actively-scrolling axis by one step,
                    provided that this isn't the first frame in a scrolling
                    operation. The values in scroll_axes are -1, 0, or 1. */

                if (data.has_scrolled_recently) {

                    /* Requested distance to scroll, in pixels */
                    var dx = scroll_axes.x * options.scrollDelta;
                    var dy = scroll_axes.y * options.scrollDelta;

                    var scroll = {
                        x: autoscroll_elt.scrollLeft(),
                        y: autoscroll_elt.scrollTop()
                    }

                    autoscroll_elt.scrollLeft(scroll.x + dx);
                    autoscroll_elt.scrollTop(scroll.y + dy);

                    /* Actual distance scrolled, in pixels */
                    dx = autoscroll_elt.scrollLeft() - scroll.x;
                    dy = autoscroll_elt.scrollTop() - scroll.y;

                    /* Special case:
                        Autoscrolling element is the browser window; adjust
                        {drag_elt} by {scrollDelta} to keep it stationary. */

                    if (autoscroll_elt && autoscroll_elt[0] == window) {

                        var drag_elt = data.drag_element;
                        var drag_offset = drag_elt.offset();

                        drag_elt.offset({
                            top: drag_offset.top + dy,
                            left: drag_offset.left + dx
                        });
                    }
                }

                /* Re-invoke:
                    Schedule this function to execute again, after
                    the scrolling interval has passed. Use a longer timeout
                    if this is the first frame of the scrolling process;
                    this avoids accidental scrolling during a drag/drop. */

                var callback_fn = function () {
                    priv.handle_autoscroll_timeout(_elt, _drop_zone);
                };

                var timeout = (
                    data.has_scrolled_recently ?
                        options.scrollInterval : options.scrollDelay
                );

                data.has_scrolled_recently = (
                    scroll_axes.y || scroll_axes.x
                );

                setTimeout(callback_fn, timeout);
            },

            /**
             * Highlight the current drop zone, provided that the current
             * draggable element is on top of a drop zone. If the current
             * draggable element is not over a drop zone, do nothing.
             */
            set_highlight: function (_zone, _data) {

                if (_zone && _zone != _data.previous_highlight_zone) {
                    _zone.container_elt.addClass('hover');
                    _data.previous_highlight_zone = _zone;
                }
            },

            /**
             * Remove the highlighting from the previous drop zone,
             * provided there was one. Otherwise, take no action.
             */
            clear_highlight: function (_zone, _data) {

                var prev_zone = _data.previous_highlight_zone;

                if (prev_zone) {
                    if (!_zone || _zone != prev_zone) {
                        prev_zone.container_elt.removeClass('hover');
                        _data.previous_highlight_zone = null;
                    }
                }
            },

            /**
             * Initialize private storage on the element _elt, setting
             * all private fields to their original default values. This
             * must be called before any drop zones can be modified.
             */
            create_instance_data: function (_elt, _options) {
                _elt.data(
                    'udrag', {
                        options: _options,
                        previous_highlight_zone: null,
                        is_autoscrolling: false,
                        autoscroll_elt: null,
                        has_scrolled_recently: false,
                        autoscroll_axes: { x: 0, y: 0 },
                        recent_drop_zone_containers: [],
                        drop_zones: new uDrag.AreaIndex()
                    }
                );

                return _elt.data('udrag');
            },

            /**
             * Locate the elements described by the {drop} option, and
             * store them -- along with offsets and extents -- in a
             * searchable data structure.
             */
            bind_drop_zones: function (_elt, _options) {

                var priv = $.uDrag.impl.priv;
                var drop_option = (_options.drop || []);
                var data = priv.create_instance_data(_elt, _options);

                var container_option = (_options.container || false);
                var container_callback = null;

                /* Array-ize a non-array argument */
                if (!$.isArray(drop_option)) {
                    drop_option = [ drop_option ];
                }
                
                /* Base implementation of container locator function:
                    This function treats container_option as a jQuery selector
                    if possible, and selects the closest matching ancestor.
                    If that fails, {drop_elt} is used as the container. */

                var locate_container_element = (
                    function (_drop_elt, _container) {
                        switch (typeof(_container)) {
                            case 'string':
                                return _drop_elt.parents(_container).first();
                            case 'object':
                                return $(_container);
                            default:
                                return _drop_elt;
                        }
                    }
                );

                /* Container locator callback:
                    The container element is a special ancestor of the drop
                    element, and is used for auto-scrolling features. If a
                    callback is provided, we use it to locate the container
                    element for each drop element. If not, apply the default
                    callback to the option (or the appropriate array item). */

                if ($.isFunction(container_option)) {
                    container_callback = container_option;
                } else {
                    container_callback = function (_drop_elt, _i) {
                        return locate_container_element(
                            _drop_elt,
                            ($.isArray(container_option) ?
                                container_option[_i] : container_option)
                        )
                    }
                }

                /* Traverse array of jQuery collection objects */
                for (var i = 0, len = drop_option.length; i < len; ++i) {
                    $(drop_option[i]).each(function (j, drop_elt) {

                        /* Find drop zone element's container:
                            This is used for auto-scrolling. The container is a
                            parent that matches the supplied container selector,
                            or the same as the drop zone element otherwise. */

                        drop_elt = $(drop_elt);
                        var container_elt = container_callback(drop_elt, i);

                        if (!container_elt || !container_elt[0]) {
                            container_elt = drop_elt;
                        }

                        /* Find ancestors of drop zone:
                            We bind to the scroll event for these elements;
                            this ultimately invokes recalculate_drop_zones to
                            recalculate the position of drop targets inside. */

                        var ancestors = [ container_elt[0] ].concat(
                            container_elt.parentsUntil('body').toArray()
                        );

                        for (var k = 0, l = ancestors.length; k < l; ++k) {
                            $(ancestors[k]).bind(
                                'scroll.udrag',
                                $.proxy(priv.handle_ancestor_scroll, _elt)
                            );
                        }

                        /* Cache a single drop zone:
                            This fills in details about the drop zone,
                            and prepares it for fast indexed retrieval. */

                        data.drop_zones.track(drop_elt, {
                            container_elt: container_elt,
                            ancestor_elts: ancestors
                        });
                    });
                }

                return _elt;
            },

            /**
             * Fill the {autoscroll_axes} member of {_elt}'s private data
             * with directional information for the autoscrolling code.
             */
             calculate_autoscroll_direction: function (_elt, _ev, _zone) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);
                var container_elt = _zone.container_elt;

                /* Support for auto-scrolling:
                    Determine if we're hovering over one or more edges
                    of the drop zone's container. If so, set the sign bit
                    of the appropriate member of zone.autoscroll_axes. */

                var x = _ev.pageX;
                var y = _ev.pageY;

                var scroll_axes = { x: 0, y: 0 };
                var scroll_edge = data.options.scrollEdgeExtent;

                /* Special case:
                    Scrolling container is the browser window. */

                if (container_elt && container_elt[0] == window) {
                    x -= container_elt.scrollLeft();
                    y -= container_elt.scrollTop();
                }

                /* Auto-scroll: x-axis */
                if (x > _zone.x[0] && x < _zone.x[0] + scroll_edge) {
                    scroll_axes.x = -1;
                } else if (x < _zone.x[1] && x > _zone.x[1] - scroll_edge) {
                    scroll_axes.x = 1;
                }

                /* Auto-scroll: y-axis */
                if (y > _zone.y[0] && y < _zone.y[0] + scroll_edge) {
                    scroll_axes.y = -1;
                } else if (y < _zone.y[1] && y > _zone.y[1] - scroll_edge) {
                    scroll_axes.y = 1;
                }

                data.autoscroll_axes = scroll_axes;
                return _zone;
            },

            /**
             * Given an event object _ev that contains page coordinates
             * {pageX} and {pageY}, calculate and return a version of
             * the coordinates that is relative to _elt.
             */
            relative_drop_offset: function (_elt, _drop_elt, _ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);

                var offset = _drop_elt.offset();
                var is_body = (_drop_elt[0] == document.body);

                var scroll = {
                    x: (is_body ? 0 : _drop_elt.scrollLeft()),
                    y: (is_body ? 0 : _drop_elt.scrollTop())
                };

                var drop_extent = {
                    x: _drop_elt.width(),
                    y: _drop_elt.height()
                };

                var rv = {
                    x: Math.min(
                        Math.max(
                            (_ev.pageX - offset.left -
                                data.delta.x + scroll.x - data.margin.x), 0
                        ),
                        (drop_extent.x - data.extent.x - data.margin.x)
                    ),
                    y: Math.min(
                        Math.max(
                            (_ev.pageY - offset.top -
                                data.delta.y + scroll.y - data.margin.y), 0
                        ),
                        (drop_extent.y - data.extent.y - data.margin.y)

                    )
                };

                /* Special case:
                    Subtract one side of the element's padding from the
                    coordinates, if we're dropping on the document body. */

                if (is_body) {
                    var body = $(document.body);
                    rv.x -= (body.outerWidth() - body.width()) / 2;
                    rv.y -= (body.outerHeight() - body.height()) / 2;
                }

                return rv;
            },
            
            /**
             * Duplicate an element, hide the original, and make the copy
             * a child of the document body. Do this without any visible
             * visual change, flicker, or other display artifacts.
             */
            create_overlay: function (_elt, _ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);
                var drag_elt = data.drag_element = _elt.clone(true);

                drag_elt.css('position', 'absolute');
                drag_elt.css('visibility', 'hidden');

                drag_elt.width(_elt.innerWidth());
                drag_elt.height(_elt.innerHeight());

                $('body').append(drag_elt);
                priv.update_position(_elt, _ev);

                drag_elt.css('visibility', 'visible');
                _elt.css('visibility', 'hidden');

                return drag_elt;
            },
            
            /**
             * Sets a new default position for the draggable
             * element. The event {_ev} must contain page coordinates.
             */
            move_element: function (_elt, _new_parent_elt, _ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);

                /* Move element */
                _new_parent_elt.prepend(_elt);
                var offset = _elt.offset();

                /* Set new "initial" position:
                    The return_to_original_position function will use
                    this when it's called, effectively moving the element. */

                data.initial_position = { x: offset.left, y: offset.top };
                data.delta.x = data.delta.y = 0;

                return _elt;
            },

            /**
             * Animate the draggable element back to the position
             * specified in {data.initial_position}.
             */
            return_to_original_position: function (_elt, _callback) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(_elt);
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
            },

            /**
             * Event handler for document's mouse-up event.
             */
            handle_document_mouseup: function (_ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(this);

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
                var data = priv.instance_data_for(this);

                if (data.is_dragging) {
                    priv.update_position($(this), _ev);
                }

                return false;
            },

            /**
             * Event handler for document's mouse-move event.
             */
            handle_document_resize: function (_ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(this);

                data.drop_zones.recalculate_all($(this));
                return false;
            },

            /**
             * Event handler for drag element's mouse-down event.
             */
            handle_drag_mousedown: function (_ev) {

                var priv = $.uDrag.impl.priv;

                /* Require primary mouse button */
                if (_ev.which != 1) {
                    return false;
                }

                priv.start_dragging($(this), _ev);
                return false;
            },

            /**
             * Event handler for scrolling on a drop zone's container,
             * on on one of the container's ancestors.
             */
            handle_ancestor_scroll: function (_ev) {

                var priv = $.uDrag.impl.priv;
                var data = priv.instance_data_for(this);

                data.drop_zones.recalculate_all($(this));
                return false;
            }

        }

    };
 
    $.fn.uDrag = function (/* const */_method /* , ... */) {

        /* Dispatch to appropriate method handler:
            Note that the `method` argument should always be a constant.
            Never allow user-provided input to be used for the argument. */

        if (_method === 'priv') {
            return null;
        }

        return $.uDrag.impl[_method].apply(
            this, Array.prototype.slice.call(arguments, 1)
        );
    };

})(jQuery);
