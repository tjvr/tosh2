/* measure: AST -> height in pixels */
const {sum} = require('itt')
const Scratch = require('./scratch')

var measureLog = function(message) {}

function internalHeight(info) {
  var shape = info.shape
  switch (shape) {
    case 'if-block':    return 36
    case 'c-block cap': return 34 // "forever"
    case 'cap':         return 8
    case 'c-block':     return 21
    case 'stack':       return 9
    case 'hat':         return (info.selector === 'whenGreenFlag') ? 25
                             : 18
    case 'predicate':   return 5 // ###
    case 'reporter':    return 4 // ###
  }
  throw "internalHeight can't do " + info.selector
}

function noInputs(info) {
  var shape = info.shape
  switch (shape) {
    case 'stack':       return 16
    case 'cap':
    case 'c-block cap': return 16
    case 'predicate':   return 16
    case 'reporter':    return 16 // # TODO
    case 'hat':         return emptySlot('readonly-menu')
  }
  throw "noInputs can't do " + info.selector
}

function emptySlot(inputShape) {
  /* For arguments which are literals, menu options, or just empty */
  switch (inputShape) {
    case 'list':          return 12
    case 'number':        return 16
    case 'string':        return 16 // ###
    case 'boolean':       return 16 // ###
    case 'readonly-menu': return 16 // ###
    case 'number-menu':   return 16 // ###
    case 'color':         return 16 // ###
  }
  throw "emptySlot can't do " + inputShape
}

function measureList(list, debug) {
  if (debug) measureLog = debug
  return sum(list.map(measureBlock)) - 3 * (list.length - 1)
}

function blockInfo(block) {
  var selector = block[0],
      args = block.slice(1),
      info
  switch (selector) {
    case 'call':
      spec = args.shift()
      info = {
        spec: spec,
        parts: spec.split(Scratch.inputPat),
        shape: 'stack',
        category: 'custom',
        selector: null,
        defaults: [], // not needed
      }
      info.inputs = info.parts.filter(function(p) { return Scratch.inputPat.test(p) })
      return info
    default:
      info = Scratch.blocksBySelector[selector]
      if (!info) throw "unknown selector: " + selector
      return info
  }
}

function measureBlock(block) {
  // be careful not to pass a list here (or a block to measureList!)
  var selector = block[0],
      args = block.slice(1)
  if (selector === 'procDef') {
    var hasInputs = false,
        hasBooleans = false
    var spec = args[0]
    spec.split(Scratch.inputPat).forEach(function(part) {
      if (Scratch.inputPat.test(part)) {
        hasInputs = true
        if (part === '%b') hasBooleans = true
      }
    })
    return hasBooleans ? 65 : hasInputs ? 64 : 60
  }
  var info = blockInfo(block)
  if (selector === 'call') {
    args.shift() // spec
  }

  var internal = internalHeight(info)
  measureLog(internal, "internalHeight", info.selector)
  if (selector === 'stopScripts' &&
      ['all', 'this script'].indexOf(args[0]) === -1) {
    internal += 1
  }

  var argHeight = 0
  var stackHeight = 0

  var hasInputs = (info.inputs.length
                || /c-block|if-block/.test(info.shape))

  if (!hasInputs) {
    argHeight = noInputs(info)
    measureLog(argHeight, "noInputs", info.shape)

  } else { // has inputs
    for (var i=0; i<args.length; i++) {
      var arg = args[i]
      var inputShape = info.inputs[i] ? Scratch.getInputShape(info.inputs[i])
                                      : 'list'
      var nonEmpty = (arg instanceof Array && arg.length)
                      // note this could be a *block*!
      var foo
      if (!nonEmpty) {
        foo = emptySlot(inputShape)
        measureLog(foo, "emptySlot", inputShape)
      }

      if (inputShape === 'list') {
        // c-mouth
        if (nonEmpty) {
          foo = measureList(arg)

          // does it end with a cap block?
          var last = arg.slice().pop()
          if (last) {
            var lastInfo = blockInfo(last)
            if (/cap/.test(lastInfo.shape)) {
              foo += 3
            }
          }
        }
        stackHeight += foo

      } else {
        // arg
        if (nonEmpty) {
          foo = measureBlock(arg)
        }
        argHeight = Math.max(argHeight, foo)
      }
    }
  }
  var total = internal + argHeight + stackHeight
  measureLog(total, block)
  return total
}

module.exports = measureList

