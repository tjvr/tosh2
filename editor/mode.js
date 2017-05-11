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

  _c(start, state, className, emit) {
    if (state.isToken) {
      //if (state.reference < start) return
      emit(className, state.token)
    } else if (state.left) {
      var className = this.getClass(state.rule) || className
      this._c(start, state.left, className, emit)
      if (!state.right) console.error(state)
      this._c(start, state.right, className, emit)
    }
  }

  _getRoot(start, endCol) {
    // non-null state
    var state = endCol.states.find(s => s.reference < endCol.index)

    // find root
    const stack = [state]
    while (state.reference > 0) {
      if (state.left) {
        state = state.left
      } else {
        state = state.wantedBy[0]
        stack.push(state)
      }
    }
    stack.reverse()
    return stack
  }

  highlight(startCol, endCol, emit) {
    const start = startCol.index
    const stack = this._getRoot(start, endCol)

    var className = ''
    stack.forEach(state => {
      className = this.getClass(state.rule) || className
      this._c(start, state, className, emit)
    })

    //this._h(startCol.index, state, '', emit)


    /*
    if (!state) {
      const size = endCol.index - startCol.index
      emit('error', {offset: 0, size: size})
      return
    }
    this._ranges(state, "", emit)
    */
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

  highlight(start, end, emit) { return this.highlighter.highlight(start, end, emit) }

  /*
  rewind(index) { return this.leftParser.rewind(index) }
  feed(tokens) { return this.leftParser.feed(tokens) }
  highlight(start, end, getClass) { return this.leftParser.highlight(start, end, getClass) }
  parse() { return this.leftParser.parse() }
  */
}

CodeMirror.defineMode('tosh', module.exports = function(cfg, modeCfg) {
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

    // TODO does this actually get called after every \n ?
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
        if (!this.line.length) throw new Error('oh bother')
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

