// Generated by IcedCoffeeScript 108.0.12
(function() {
  var Cycle, Model, Schema, fn, helpers, log, mongoose, _, _i, _len, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  log = function(x) {
    try {
      return console.log(x);
    } catch (_error) {}
  };

  _ = require('lodash');

  mongoose = require('mongoose');

  helpers = require('./lib/helpers');

  Schema = new mongoose.Schema({
    cycle_seconds: {
      type: Number,
      required: true
    },
    trial_seconds: {
      type: Number,
      required: true,
      "default": 0
    },
    initial_amount_cents: {
      type: Number,
      required: true,
      "default": 0
    },
    initial_auth_amount_cents: {
      type: Number,
      required: true,
      "default": 0
    },
    initial_charge_amount_cents: {
      type: Number,
      required: true,
      "default": 0
    },
    initial_method: {
      type: String,
      "enum": ['none', 'authorize_void', 'charge', 'authorize_void_charge'],
      required: true,
      "default": 'none'
    },
    after_trial_method: {
      type: String,
      "enum": ['none', 'charge'],
      required: true,
      "default": 'none'
    },
    after_trial_amount_cents: {
      type: Number,
      required: true,
      "default": 0
    },
    cycle_amount_cents: {
      type: Number,
      required: true
    },
    max_cycles: {
      type: Number,
      required: true,
      "default": 0
    }
  });

  Schema.methods.humanize = function() {
    var check, clone, k, v;
    clone = this.toJSON();
    for (k in clone) {
      v = clone[k];
      if (k.indexOf('_seconds') > -1) {
        if (v) {
          check = (clone[k + '_human'] = helpers.to_human(v));
          if (helpers.type(check) === 'error') {
            return check;
          }
        }
      }
      if (k.indexOf('_cents') > -1) {
        if (v) {
          check = (clone[k.replace('_cents', '_dollars')] = helpers.to_dollars(v));
          if (helpers.type(check) === 'error') {
            return check;
          }
        }
      }
    }
    return clone;
  };

  Schema.methods.next = function(num_items, ctime, last_success, options) {
    var actions, after_trial, clone, cursor, cursor_cycle, cycle_charge, initial, max_time, range, skip_action, skip_cycles, skip_ranges, template, val, x, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref10, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
    if (num_items == null) {
      num_items = 1;
    }
    if (ctime == null) {
      ctime = null;
    }
    if (last_success == null) {
      last_success = null;
    }
    if (options == null) {
      options = {};
    }
    if (ctime && helpers.type(ctime) === 'object') {
      clone = _.clone(ctime);
      last_success = (_ref = clone.last_success) != null ? _ref : null;
      ctime = (_ref1 = clone.ctime) != null ? _ref1 : null;
      options.max_time = (_ref2 = clone.max_time) != null ? _ref2 : false;
      options.skip_ranges = (_ref3 = clone.skip_ranges) != null ? _ref3 : null;
      options.skip_cycles = (_ref4 = clone.skip_cycles) != null ? _ref4 : null;
      options.cycles_only = (_ref5 = clone.cycles_only) != null ? _ref5 : null;
    }
    if (options.skip_cycles && helpers.type(options.skip_cycles) !== 'array') {
      options.skip_cycles = [options.skip_cycles];
    }
    if (last_success) {
      last_success = +last_success;
    }
    skip_ranges = [];
    skip_cycles = [];
    if (options.skip_ranges) {
      _ref6 = options.skip_ranges;
      for (_i = 0, _len = _ref6.length; _i < _len; _i++) {
        x = _ref6[_i];
        skip_ranges.push(x);
      }
    }
    if (options.skip_cycles) {
      _ref7 = options.skip_cycles;
      for (_j = 0, _len1 = _ref7.length; _j < _len1; _j++) {
        x = _ref7[_j];
        skip_cycles.push(+x);
      }
    }
    if (options.max_time && ((_ref8 = helpers.type(options.max_time)) === 'string' || _ref8 === 'number')) {
      max_time = +options.max_time;
    } else {
      max_time = false;
    }
    if (ctime) {
      ctime = +ctime;
    } else {
      ctime = helpers.time();
    }
    template = {
      time: null,
      date: null,
      action: null,
      reason: null,
      amount_cents: null,
      amount_dollars: null
    };
    actions = [];
    if ((this.initial_method !== 'none' && !last_success) && !options.cycles_only) {
      if ((_ref9 = this.initial_method) === 'authorize_void' || _ref9 === 'authorize_void_charge') {
        initial = _.clone(template);
        val = this.initial_auth_amount_cents;
        initial.amount_cents = this.initial_auth_amount_cents || this.initial_amount_cents;
        initial.action = 'authorize_void';
        initial.reason = 'initial_method';
        initial.time = ctime;
        actions.push(initial);
      }
      if ((_ref10 = this.initial_method) === 'charge' || _ref10 === 'authorize_void_charge') {
        initial = _.clone(template);
        initial.amount_cents = this.initial_charge_amount_cents || this.initial_amount_cents;
        initial.action = 'charge';
        initial.reason = 'initial_method';
        initial.time = ctime;
        actions.push(initial);
      }
    }
    cursor = ctime;
    cursor_cycle = 0;
    if (this.trial_seconds) {
      cursor += this.trial_seconds;
      if ((!last_success || last_success < cursor) && !options.cycles_only) {
        if (this.after_trial_method !== 'none') {
          after_trial = _.clone(template);
          after_trial.amount_cents = this.after_trial_amount_cents;
          after_trial.action = 'charge';
          after_trial.reason = 'after_trial';
          after_trial.time = cursor;
          actions.push(after_trial);
        }
      }
    }
    if (last_success && last_success >= cursor) {
      while (cursor <= last_success) {
        cursor += this.cycle_seconds;
        cursor_cycle += 1;
      }
    }
    while (actions.length < num_items) {
      cycle_charge = _.clone(template);
      cycle_charge.amount_cents = this.cycle_amount_cents;
      cycle_charge.action = 'charge';
      cycle_charge.reason = 'cycle_' + cursor_cycle;
      cycle_charge.cycle_int = cursor_cycle;
      cycle_charge.time = cursor;
      skip_action = false;
      if (skip_ranges.length) {
        for (_k = 0, _len2 = skip_ranges.length; _k < _len2; _k++) {
          range = skip_ranges[_k];
          if (cursor >= range[0] && cursor <= range[1]) {
            skip_action = true;
            break;
          }
        }
      }
      if (skip_cycles.length) {
        if (__indexOf.call(skip_cycles, cursor_cycle) >= 0) {
          skip_action = true;
        }
      }
      if (max_time && cursor > max_time) {
        break;
      }
      if (!skip_action) {
        actions.push(cycle_charge);
      }
      cursor += this.cycle_seconds;
      cursor_cycle += 1;
    }
    actions = _.map(actions, function(item) {
      item.date = new Date(item.time * 1000);
      item.amount_dollars = helpers.to_dollars(item.amount_cents);
      return item;
    });
    return actions;
  };

  _ref = _.functions(helpers);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    fn = _ref[_i];
    Schema.statics[fn] = helpers[fn];
  }

  Model = mongoose.model('Cycle', Schema);

  module.exports = Cycle = function(opt) {
    var cents_key, check, err, k, model, v;
    for (k in opt) {
      v = opt[k];
      if (k.indexOf('_seconds_human') > -1) {
        check = (opt[k.replace('_seconds_human', '_seconds')] = helpers.to_seconds(v));
        if (helpers.type(check) === 'error') {
          return check;
        }
      }
    }
    for (k in opt) {
      v = opt[k];
      if (k.indexOf('_dollars') && !opt[(cents_key = k.replace('_dollars', '_cents'))]) {
        check = (opt[cents_key] = helpers.to_cents(v));
        if (helpers.type(check) === 'error') {
          return check;
        }
      }
    }
    model = new Model(opt);
    err = model.validateSync();
    if (err != null ? err.errors : void 0) {
      return new Error(_.values(err.errors).toString());
    }
    return model;
  };


  /*
  cycle = new Cycle {
    cycle_seconds_human: '30 days'
    trial_seconds_human: '7 days'
    cycle_amount_dollars: '9.99'
    initial_amount_dollars: '12.00'
    initial_method: 'charge'
    after_trial_method: 'charge'
    after_trial_amount_dollars: '100'
    max_cycles: 0
  }
  
  log cycle.next 10
   */

}).call(this);
