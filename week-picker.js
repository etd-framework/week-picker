(function(root, picker) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD is used
        define(['jquery', 'moment'], picker);

    } else {
        // use global variables
        var jquery = root.jQuery,
            moment = root.moment;

        if (!jquery) {
            throw new Error('WeekPicker requires jQuery to be loaded first!');
        }
        if (!moment) {
            throw new Error('WeekPicker requires moment.js to be loaded first!');
        }
        picker(jquery, moment);
    }

}(this, function($, moment) {
    var _dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
        _defaults = {
            date: moment(),
            min: null,
            max: null,
            input: null,
            onChange: null
        };

    var widgetTpl = '<div class="weekpicker dropdown-menu">\
        <div class="controls">\
            <div class="prev">‹</div>\
            <span class="title"></span>\
            <div class="next">›</div>\
        </div>\
        <div class="weekpicker-days"></div>\
    </div>';

    var daysTableTpl = '';

    // UTILS

    function _isCurrentWeek(date, week) {
        return date.year() === week.year() && date.week() === week.week();
    }

    function _isDisabledWeek(timestamp, min, max) {
        return (min && timestamp <= min.unix()) || (max && timestamp >= max.unix());
    }


    // CLASS

    function WeekPicker(el, options) {
        var me = this;

        me.o = $.extend({}, _defaults, options);

        me.x = { // internal properties
            mode: 'isoWeek', // current mode // currently supported only this value
            nr: true, // need render
            m: [] // current month array
            // date - today date
            // week - first day of current week
            // month - first day of current month
            // min - minimal available date
            // max - maximal available date
        };

        me.$ = {
            el: $(el), // bind element
            w: null, // widget container
            t: null, // title
            d: null, // days container
            m: null, // months container
            y: null // years container
        };

        me.$.el.data('weekpicker', me);

        me._init();
    }

    WeekPicker.prototype = {

        _init: function() {
            var me = this;

            me.x.date = me._sof(me.o.date, 'd');
            me.x.week = me._sof(me.x.date.clone());
            me.x.month = me._sof(me.x.date.clone(), 'M');

            me.x.min = me.o.min && me._sof(me.o.min);
            me.x.max = me.o.max && me._sof(me.o.max);

            console.log(me.x);

            me._initProxyFn();
            me._renderWidget();
            me._attachEvents();
        },

        _initProxyFn: function() {
            this
                .proxy('show')
                .proxy('hide')
                .proxy('prevMonth')
                .proxy('nextMonth');
        },

        _renderWidget: function() {
            var me = this;

            me.$.w = $(widgetTpl).insertAfter(me.$.el);
            me.$.t = $('.title', me.$.w);
            me.$.d = $('.weekpicker-days', me.$.w);

            me.x.nr = true;
        },

        _attachEvents: function() {
            var me = this;

            me.$.el
                .on('focus', $.proxy(me.show, me))
                .on('click', $.proxy(me.show, me));

            me.$.w
                .on('click', function(e) { e.stopPropagation(); })
                .on('mousedown', function(e) { e.stopPropagation(); })
                .on('click', '.controls .prev', me.prevMonth)
                .on('click', '.controls .next', me.nextMonth)
                .on('click', '.weekpicker-days tr', function() {
                    me._select($(this));
                });
        },

        // moment date startOf
        _sof: function(date, value) {
            value = value || this.x.mode;

            return date.startOf(value);
        },

        _buildMonth: function() {
            var me = this,
                weeks = [],
                start = me._sof(me.x.month.clone()),
                done = false,
                monthIndex = start.month(),
                count = 0;

            while(!done) {
                weeks.push({
                    number: start.week(),
                    date: start.clone(),
                    current: _isCurrentWeek(start, me.x.week),
                    disabled: _isDisabledWeek(start.unix(), me.x.min, me.x.max),
                    days: me._buildWeek(start, me.x.month)
                });

                done = count++ > 2 && monthIndex !== start.month();
                monthIndex = start.month();
            }

            return me.x.m = weeks;
        },

        _buildWeek: function(date, month) {
            var me = this,
                days = [];

            for (var i = 0; i < 7; i++) {
                days.push({
                    number: date.date(),
                    prevMonth: date.isBefore(month, 'month'),
                    nextMonth: date.isAfter(month, 'month'),
                    today: date.isSame(me.x.date, 'day'),
                    date: date.clone()
                });

                date.add(1, 'd');
            }

            return days;
        },

        _renderMonth: function() {
            console.log('render!');
            var me = this,
                weeks = me._buildMonth(),
                table = $('<table>').addClass('table-condensed'),
                week, days, day, tr, td;

            tr = $('<tr>');
            for(var k = 0; k < 7; k++) {
                tr.append($('<th>').text(_dayNames[k]));
            }
            table.append(tr);

            for(var i = 0, si = weeks.length; i < si; i++) {
                tr = $('<tr>');

                week = weeks[i];
                days = week.days;

                tr.addClass('week-' + week.number)
                  .addClass(week.disabled ? 'disabled' : 'enabled');

                week.current && tr.addClass('selected');

                tr.data('i', i);

                for(var j = 0, sj = days.length; j < sj; j++) {
                    day = days[j];

                    td = $('<td>').text(day.number);

                    day.prevMonth && td.addClass('prev');
                    day.nextMonth && td.addClass('next');
                    day.today && td.addClass('today');

                    tr.append(td);
                }

                table.append(tr);
            }

            me.$.d.html(table);
            me.$.t.text(me.x.month.format("MMMM YYYY"));

            me.x.nr = false;
        },

        prevMonth: function() {
            this.x.month.subtract(1, 'M');
            this._renderMonth();
        },

        nextMonth: function() {
            this.x.month.add(1, 'M');
            this._renderMonth();
        },

        _select: function($el) {
            var me = this,
                index = $el.data('i'),
                week = me.x.m[index],
                start, end;

            console.log(index, week);
            if(!week || week.disabled) return;

            me.x.week = week.date;
            start = week.days[0].date;
            end = week.days[6].date;

            if(me.$.el.is('input')) {
                me.$.el.val(start.format("DD/MM/YYYY") + " - " + end.format("DD/MM/YYYY"));
            }

            if(me.o.onChange instanceof Function) {
                me.o.onChange({
                    start: start,
                    end: end
                });
            }

            me.x.nr = true;
            me.hide();
        },

        proxy: function(method) {
            this[method] = $.proxy(this[method], this);

            return this;
        },

        show: function(e) {
            e && e.stopPropagation();

            var me = this,
                offset = me.$.el.offset();

            if(me.x.nr) me._renderMonth();

            me.$.w
                .css({
                    top: offset.top + me.$.el.outerHeight() + 2,
                    left: offset.left
                })
                .show();

            $('body').one('click', me.hide);
        },

        hide: function() {
            this.$.w.hide();
        }
    };

    $.fn.weekpicker = function (options) {
        return this.each(function () {
            new WeekPicker(this, options);
        });
    };

    return WeekPicker;

}));