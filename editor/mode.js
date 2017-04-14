'use strict'
const CodeMirror = require('codemirror')
const nearley = require('nearley')

class Range {
  constructor(start, end, className) {
    if (end <= start) throw new Error('invalid range')
    this.start = start
    this.end = end
    this.className = className
  }

  size() {
    return this.end - this.start
  }

  toString() {
    return `Range(${this.start}, ${this.end}, '${this.className}')`
  }
}


class Highlighter {
  constructor(parser, getClass) {
    this.getClass = getClass
    this.columns = parser.table
  }

  discard(index) {
    // nb. sometimes index > this.ranges.length; this happens when there was an error
    //this.ranges.splice(index)
    // TODO remove
  }

  feed(columns) {
    // TODO remove
  }

  _getRange(item, end, allowPartial) {
    var tag = item.tag
    if (isLR0(tag)) {
      if (!allowPartial) return
      tag = tag.rule.name
    }

    let className = this.getClass(tag)
    if (className === undefined) throw 'class cannot be undefined'
    if (!className) return

    let start = item.start.index
    if (start === end) return
    return new Range(start, end, className)
  }

  _ranges(state, className, emit) {
    if (state.isToken) {
      emit(className, state.token)
    } else if (state.left) {
      var className = this.getClass(state.rule) || className
      this._ranges(state.left, className, emit)
      if (!state.right) console.error(state)
      this._ranges(state.right, className, emit)
    } else {
      return
    }
  }

  highlight(startCol, endCol, emit) {
    const state = endCol.states.find(s => s.reference === startCol.index)
    if (!state) {
      const size = endCol.index - startCol.index
      emit('error', {offset: 0, size: size})
      return
    }
    this._ranges(state, "", emit)
  }
}

class Completer {
  constructor(grammar, options) {
    this.parser = new nearley.Parser(grammar)
    //this.reverseParser = new nearley.Parser(grammar.reverse(), options)
    this.highlighter = new Highlighter(this.parser, options.highlight)
    this.history = []
  }

  feed(line) { this.parser.feed(line) }
  save() { return this.parser.save() }
  restore(col) { return this.parser.restore(col) }

  highlight(start, end, getClass) { return this.highlighter.highlight(start, end, getClass) }

  /*
  rewind(index) { return this.leftParser.rewind(index) }
  feed(tokens) { return this.leftParser.feed(tokens) }
  highlight(start, end, getClass) { return this.leftParser.highlight(start, end, getClass) }
  parse() { return this.leftParser.parse() }
  */
}

CodeMirror.defineMode('tosh', function(cfg, modeCfg) {
  // Use setOption('mode', ...) to change the grammar.
  const completer = new Completer(modeCfg.grammar, {
    highlight: modeCfg.highlight, // getClass
  })
  completer.feed("")
  const startColumn = completer.save()

  class State {
    constructor(column) {
      this.column = column
      this.line = []
    }

    copy() {
      const s = new State(this.column)
      s.highlight('\n')
      return s
    }

    highlight(line) {
      const startCol = this.column
      completer.restore(startCol)

      // TODO handle previous error
      try {
        completer.feed(line)
      } catch (e) {
        //console.error('err', e)
        return [{className: 'error', text: line}]
      }
      const endCol = this.column = completer.save()

      //console.log('=>', JSON.stringify(completer.parser.results[0]))

      const ranges = []
      completer.highlight(startCol, endCol, (className, token) => {
        ranges.push({
          className: className + ' ' + token.type,
          text: line.substr(token.offset, token.size),
        })
      })
      return ranges
    }

    next(stream) {
      // this.indent = stream.indentation()

      if (!this.line.length) {
        let m = stream.match(/.*/, false) // don't consume
        this.line = this.highlight(m[0])
        if (!this.line.length) throw new Error('panic')
      }

      //console.log(JSON.stringify(this.line.map(x => x.text)))

      let range = this.line.shift()
      if (!stream.match(range.text)) { // consume
        console.error(range)
        throw new Error("Does not match stream")
      }
      return range.className
    }
  }


  /* CodeMirror mode */

  return {
    startState: () => new State(startColumn),
    copyState: state => state.copy(),
    token: (stream, state) => state.next(stream),
    blankLine: state => {
      state.highlight('\n')
      return ''
    },

    _completer: completer,

    // TODO auto-indent
    //indent: function(state, textAfter) {
    //  var indent = parseInt(state.indent / cfg.indentUnit)

    //  // TODO

    //  // return number of spaces to indent, taking indentUnit into account
    //  return cfg.indentUnit * indent
    //},

    // TODO electric etc
    // electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
    // blockCommentStart: "/*",
    // blockCommentEnd: "*/",
    // lineComment: "//",
    // fold: "brace",
    // closeBrackets: "()[]{}''\"\"``",

  }
})

