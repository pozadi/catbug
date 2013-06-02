/*! catbug 0.1.2
 *  2013-06-02 22:41:18 +0400
 *  http://github.com/pozadi/catbug
 */


/***  src/catbug  ***/

window.catbug = function() {
  return catbug.core.module.apply(catbug, arguments);
};

catbug.ns = function(path, cb) {
  var node, part, _i, _len, _ref;

  node = this;
  _ref = path.split('.');
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    part = _ref[_i];
    if (part) {
      node = (node[part] || (node[part] = {}));
    }
  }
  return cb(node, this);
};


/***  src/tree-parser  ***/

catbug.ns('treeParser', function(ns) {
  ns.nonEmpty = /\S+/;
  ns.indentation = /^\s+/;
  ns.selectorAndAttrs = /^([^\{]+)(?:\{(.*?)\})?$/;
  ns.attribute = /([a-z_-]+)(?:=(?:"(.*?)"|'(.*?)'|(\S+)))?/;
  ns.attributes = new RegExp(ns.attribute.source, 'g');
  ns.comments = /\/\*[\s\S]*?\*\/|\/\/.*/g;
  ns.parseToRaw = function(treeString) {
    var getLevel, getRoots, lines, nonEmpty, normalize;

    nonEmpty = function(str) {
      return ns.nonEmpty.test(str);
    };
    getLevel = function(line) {
      var _ref;

      return {
        level: ((_ref = ns.indentation.exec(line)) != null ? _ref[0].length : void 0) || 0,
        data: $.trim(line)
      };
    };
    normalize = function(objects, prop) {
      var minLevel, object, _i, _len, _results;

      if (prop == null) {
        prop = 'level';
      }
      minLevel = _.min(_.pluck(objects, 'level'));
      _results = [];
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        object = objects[_i];
        _results.push(object[prop] = object.level - minLevel);
      }
      return _results;
    };
    getRoots = function(objects, parent) {
      var addCurrent, current, object, rest, result, _i, _len;

      normalize(objects, 'normLevel');
      result = [];
      current = null;
      addCurrent = function() {
        var node;

        if (current) {
          node = {
            data: current.data,
            level: current.level,
            parent: parent
          };
          node.children = getRoots(rest, node);
          return result.push(node);
        }
      };
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        object = objects[_i];
        if (object.normLevel > 0) {
          if (current) {
            rest.push(object);
          } else {
            throw new Error('unexpected indent');
          }
        } else {
          addCurrent();
          current = object;
          rest = [];
        }
      }
      addCurrent();
      return result;
    };
    treeString = treeString.replace(ns.comments, '');
    lines = _.chain(treeString.split('\n')).filter(nonEmpty).map(getLevel).value();
    normalize(lines);
    return getRoots(lines, null);
  };
  ns.flat = function(roots) {
    var add, result;

    result = [];
    add = function(nodes) {
      var node, _i, _len, _results;

      _results = [];
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        node = nodes[_i];
        result.push(node);
        _results.push(add(node.children));
      }
      return _results;
    };
    add(roots);
    return result;
  };
  ns.parseAttributes = function(attributes) {
    var attr, name, result, tmp, value, _i, _len, _ref;

    result = {};
    if (attributes) {
      _ref = attributes.match(ns.attributes);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        attr = _ref[_i];
        tmp = ns.attribute.exec(attr);
        name = tmp[1];
        value = tmp[4] || tmp[3] || tmp[2];
        result[name] = value;
      }
    }
    return result;
  };
  ns.parseLine = function(line) {
    var parts;

    parts = ns.selectorAndAttrs.exec(line);
    if (!parts) {
      throw new Error('wrong syntax');
    }
    return {
      selector: $.trim(parts[1]),
      attributes: ns.parseAttributes(parts[2])
    };
  };
  ns.selectorToName = function(selector) {
    return $.camelCase(selector.replace(/[^a-z0-9]+/ig, '-').replace(/^-/, '').replace(/-$/, '').replace(/^js-/, ''));
  };
  ns.genName = function(element) {
    if (element.attributes.name) {
      return element.name = element.attributes.name;
    } else {
      return element.name = ns.selectorToName(element.selector);
    }
  };
  return ns.parse = function(treeString) {
    var element, elements, raw, _i, _len, _ref;

    raw = ns.parseToRaw(treeString);
    if (raw.length !== 1) {
      throw new Error('more than one root');
    }
    elements = ns.flat(raw);
    for (_i = 0, _len = elements.length; _i < _len; _i++) {
      element = elements[_i];
      _.extend(element, ns.parseLine(element.data));
      element.selector = element.selector.replace('&', (_ref = element.parent) != null ? _ref.selector : void 0);
    }
    _.each(elements, ns.genName);
    return {
      root: _.findWhere(elements, {
        level: 0
      }),
      elements: _.filter(elements, function(e) {
        return e.level > 0;
      })
    };
  };
});


/***  src/jquery-plugin  ***/

catbug.ns('core', function(ns) {
  return jQuery.prototype.catbug = function(name) {
    var el;

    el = this.get(0);
    if (el) {
      return ns.instances[name].init(el);
    }
  };
});


/***  src/core  ***/

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

catbug.ns('core', function(ns, top) {
  var domEl;

  domEl = function(el) {
    if (el.jquery) {
      return el.get(0);
    } else {
      return el;
    }
  };
  ns.instances = {};
  ns.elementMixin = {
    update: function() {
      var el, _i, _len, _ref;

      this.splice(0, this.length);
      _ref = $(this.selector, this.context);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        el = _ref[_i];
        this.push(el);
      }
      return this;
    },
    byChild: function(child) {
      child = domEl(child);
      return this.filter(function() {
        return $.contains(this, child);
      });
    },
    byParent: function(parent) {
      parent = domEl(parent);
      return this.filter(function() {
        return $.contains(parent, this);
      });
    },
    live: function(types, data, fn) {
      $(this.context).on(types, this.selector, data, fn);
      return this;
    },
    die: function(types, fn) {
      $(this.context).off(types, this.selector, fn);
      return this;
    }
  };
  ns.builderContextMixin = {
    update: function(names) {
      var name, _i, _len, _ref, _results;

      _ref = names.split(' ');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        name = _ref[_i];
        _results.push(this[name].update());
      }
      return _results;
    },
    updateAll: function() {
      var info, _i, _len, _ref, _results;

      _ref = this.__elements;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        info = _ref[_i];
        _results.push(this[info.name].update());
      }
      return _results;
    }
  };
  ns.copyMethods = ['find', 'on', 'off', 'data', 'addClass', 'removeClass', 'toggleClass', 'hasClass', 'hide', 'show', 'toggle'];
  ns.Module = (function() {
    function Module(name, rootSelector, elements, builder) {
      this.name = name;
      this.rootSelector = rootSelector;
      this.elements = elements;
      this.builder = builder;
      this.initAll = __bind(this.initAll, this);
    }

    Module.prototype.buildElement = function(selector, context) {
      return _.extend($(selector, context), {
        selector: selector
      }, ns.elementMixin);
    };

    Module.prototype.buildElements = function(context) {
      var info, result, _i, _len, _ref;

      result = {};
      _ref = this.elements;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        info = _ref[_i];
        result[info.name] = this.buildElement(info.selector, context);
      }
      return result;
    };

    Module.prototype.builderContext = function(rootEl) {
      var method, result, _i, _len, _ref;

      result = {};
      _ref = ns.copyMethods;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        method = _ref[_i];
        result[method] = _.bind(rootEl[method], rootEl);
      }
      return _.extend(result, {
        root: rootEl,
        __elements: this.elements
      }, ns.builderContextMixin, this.buildElements(rootEl));
    };

    Module.prototype.init = function(el) {
      var context, dataKey;

      el = $(el);
      dataKey = "catbug-" + this.name;
      if (!el.data(dataKey)) {
        context = this.builderContext(el);
        el.data(dataKey, this.builder.call(context, context));
      }
      return el.data(dataKey);
    };

    Module.prototype.initAll = function() {
      var el, _i, _len, _ref, _results;

      _ref = $(this.rootSelector);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        el = _ref[_i];
        _results.push(this.init(el));
      }
      return _results;
    };

    return Module;

  })();
  ns.module = function(tree, name, builder) {
    var module;

    if (builder == null) {
      builder = name;
      name = _.uniqueId('lambda-');
    }
    tree = top.treeParser.parse(tree);
    ns.instances[name] = module = new ns.Module(name, tree.root.selector, tree.elements, builder);
    return $(module.initAll);
  };
  top.init = function(names) {
    var name, result, _i, _len, _ref;

    result = {};
    _ref = names.split(' ');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      name = _ref[_i];
      result[name] = ns.instances[name].initAll();
    }
    return result;
  };
  return top.initAll = function() {
    var module, name, result, _ref;

    result = {};
    _ref = ns.instances;
    for (name in _ref) {
      module = _ref[name];
      result[name] = module.initAll();
    }
    return result;
  };
});
