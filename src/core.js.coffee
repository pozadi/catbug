catbug.ns 'core', (ns, top) ->

  ns.instances = {}

  ns.builderContextMixin =
    update: (names) ->
      @[name].update() for name in names.split ' '
    updateAll: ->
      @[info.name].update() for info in @__elements

  ns.copyMethods = [
    'find',
    'on', 'off',
    'data',
    'addClass', 'removeClass', 'toggleClass', 'hasClass',
    'hide', 'show', 'toggle'
  ]

  class ns.Module

    constructor: (@name, @rootSelector, @elements, @builder) ->

    buildElements: (context) ->
      result = {}
      for info in @elements
        result[info.name] = top.element.Element(info.selector, context)
      result

    builderContext: (rootEl) ->
      result = {}
      for method in ns.copyMethods
        result[method] = _.bind rootEl[method], rootEl
      _.extend result, {
        root: rootEl
        __elements: @elements
      }, ns.builderContextMixin, @buildElements rootEl

    init: (el) ->
      el = $ el
      dataKey = "catbug-#{@name}"
      unless el.data dataKey
        context = @builderContext(el)
        el.data dataKey, @builder.call(context, context)
      el.data dataKey

    initAll: =>
      for el in $ @rootSelector
        @init el

  ns.module = (tree, name, builder) ->

    unless builder?
      builder = name
      name = _.uniqueId 'lambda-'

    tree = top.treeParser.parse tree

    ns.instances[name] = module = new ns.Module(
      name,
      tree.root.selector,
      tree.elements,
      builder
    )

    $ module.initAll

  top.init = (names) ->
    result = {}
    for name in names.split ' '
      result[name] = ns.instances[name].initAll()
    result

  top.initAll = ->
    result = {}
    for name, module of ns.instances
      result[name] = module.initAll()
    result


