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
    var _dayNames = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"],
        _defaults = {
            initialDate: moment(),
            valueFormat: null,
            endDate: null,
            onChange: null,
            showWeekNumber: false
        };

    // UTILS

    function _clearTime(date) {
        return date.startOf('day');
    }

    function _buildMonth(start, week, month, dweek) {
        var weeks = [];
        var
            done = false,
            date = start.clone(),
            monthIndex = date.month(),
            count = 0;

        while (!done) {
            weeks.push({
                number: date.week(),
                days: _buildWeek(date.clone(), month),
                current: date.week() === week,
                //disabled: (dweek ? date.unix() >= dweek : false)
            });

            date.add(1, "week");
            done = count++ > 2 && monthIndex !== date.month();
            monthIndex = date.month();
        }

        return weeks;
    }

    function _buildWeek(date, month) {
        var days = [],
            today = new Date();

        for (var i = 0; i < 7; i++) {
            days.push({
                number: date.date(),
                prevMonth: date.month() < month,
                nextMonth: date.month() > month,
                isToday: date.isSame(today, "day"),
                date: date
            });

            date = date.clone().add(1, "day");
        }

        return days;
    }


    // CLASS

    function WeekPicker(el, options) {
        this.$el = $(el);
        this.$el.data('weekpicker', this);

        this.options = $.extend({}, _defaults, options);
        this._rendered = false;

        this._init();
    }

    WeekPicker.prototype = {

        _init: function() {
            this
                .proxy('show')
                .proxy('hide')
                .proxy('_prev')
                .proxy('_next');

            this._initialDate = _clearTime(this.options.initialDate || moment());
            this._currentWeek = this._initialDate.week();
            this._currentYear = this._initialDate.year();
            this._monthDate = this._initialDate.clone();
            this._endDate = this.options.endDate ? this.options.endDate.isoWeek() : null;
            this._setDate(this._initialDate);

            if(this.options.endDate) {
                this._endDate = this.options.endDate.startOf('isoWeek');
                this._endDate = this._endDate.unix();
            }

            this._renderFrame();
            this._attachEvents();
        },

        _setDate: function(date) {
            date = _clearTime(date.clone());
            this._currentDate = date;
            this._currentMonth = this._monthDate.month();
        },

        _renderFrame: function() {
            var prev = $('<div>').addClass('prev').text('‹'),
                next = $('<div>').addClass('next').text('›'),
                title = $('<span>').addClass('title');

            var controls = $('<div>').addClass('controls').append(prev, title, next);

            var days = $('<div>').addClass('weekpicker-days');

            this.$picker = $('<div>').addClass('weekpicker dropdown-menu')
                .append(controls, days)
                .insertAfter(this.$el);

            this.$title = title;
            this.$days = days;
        },

        _attachEvents: function() {
            var me = this;

            me.$el
                .on('focus', $.proxy(me.show, me))
                .on('click', $.proxy(me.show, me))
                .on('change', $.proxy(me.selectWeek, me));

            me.$picker
                .on('click', function(e) { e.stopPropagation(); })
                .on('mousedown', function(e) { e.stopPropagation(); })
                .on('click', '.controls .prev', me._prev)
                .on('click', '.controls .next', me._next)
                .on('click', '.weekpicker-days tr', function() {
                    me._select($(this));
                });
        },

        _renderMonth: function() {
            var weeks = _buildMonth(this._currentDate, this._currentWeek, this._currentMonth, this._endDate),
                table = $('<table>').addClass('table-condensed'),
                week, days, day, tr, td;

            tr = $('<tr>');
            if(this.options.showWeekNumber) {
                tr.append($('<th>').addClass('weekpicker-week').text('S'));
            }
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

                if(week.current) {
                    tr.addClass('selected');
                }

                tr.data('days', days);

                if(this.options.showWeekNumber) {
                    tr.append($('<td>').addClass('weekpicker-week').text(week.number));
                }

                for(var j = 0, sj = days.length; j < sj; j++) {
                    day = days[j];

                    td = $('<td>').text(day.number);

                    if(day.prevMonth) {
                        td.addClass('prev');
                    }

                    if(day.nextMonth) {
                        td.addClass('next');
                    }

                    if(day.isToday) {
                        td.addClass('today');
                    }

                    tr.append(td);
                }

                table.append(tr);
            }

            this.$days.html(table);
            this.$title.text(this._monthDate.format("MMMM YYYY"));

            this._rendered = true;
        },

        _prev: function() {
            var previous = this._monthDate.clone();
            this._monthDate.month(this._monthDate.month() - 1);
            this._setDate(previous.month(previous.month() - 1));

            this._renderMonth();
        },

        _next: function() {
            var next = this._monthDate.clone();
            this._monthDate.month(this._monthDate.month() + 1);
            this._setDate(next.month(next.month() + 1));

            this._renderMonth();
        },

        _select: function($el) {
            var days = $el.data('days'),
                start, end;

            if($el.hasClass('disabled') || !days) return;

            start = days[0].date;
            end = days[6].date;

            this._currentDate = start;
            this._currentWeek = start.week();
            this._currentYear = start.year();
            this._renderMonth();

            if(this.$el.is('input')) {
                if (this.options.valueFormat instanceof Function) {
                    this.$el.val(this.options.valueFormat.apply(this, [start, end]));
                } else {
                    this.$el.val(start.format("DD/MM/YYYY") + " - " + end.format("DD/MM/YYYY"));
                }
            }

            if(this.options.onChange instanceof Function) {
                this.options.onChange({
                    start: start,
                    end: end
                });
            }
            
            this.$el.trigger('change', [start, end, this]);

            this.hide();
        },

        proxy: function(method) {
            this[method] = $.proxy(this[method], this);

            return this;
        },

        show: function(e) {
            e && e.stopPropagation();

            this._renderMonth();

            var position = this.$el.position();

            this
                .$picker
                .css({
                    top: position.top + this.$el.outerHeight() + 2,
                    left: position.left
                })
                .show();

            $('body').one('click', this.hide);
        },

        hide: function() {
            this.$picker.hide();
        },

        date: function() {
            console.log(this._currentDate.clone());
            return this._currentDate.clone();
        },

        week: function() {
            return this._currentWeek;
        },

        year: function() {
            return this._currentYear;
        }
    };

    $.fn.weekpicker = function (options) {
        return this.each(function () {
            new WeekPicker(this, options);
        });
    };

    return WeekPicker;

}));
