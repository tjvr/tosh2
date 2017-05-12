'use strict'
const CodeMirror = require('codemirror')
const nearley = require('nearley')


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
      emit(className, state.token)
    } else if (state.left) {
      if (state.right.isToken && state.right.reference < start) {
        return
      }
      var className = this.getClass(state.rule) || className
      this._c(start, state.right, className, emit)
      this._c(start, state.left, className, emit)
    }
  }

  _getRoot(start, endCol) {
    // non-null state
    var state = endCol.states.find(s => s.reference < endCol.index)

    // find root
    const stack = [{state}]
    while (state.reference > 0) {
      if (state.left) {
        state = state.left
      } else {
        state = state.wantedBy[0]
        stack.push({state})
      }
    }
    return stack
  }

  highlight(startCol, endCol, emit) {
    const start = startCol.index
    const stack = this._getRoot(start, endCol)

    // inherit classNames
    var className = null
    for (var i=stack.length; i--; ) {
      const item = stack[i]
      item.className = className = this.getClass(item.state.rule) || className
    }

    // emit tokens in reverse order until we reach start
    var className = ''
    stack.forEach(({state, className}) => {
      this._c(start, state, className, emit)
    })
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
  const lexer = modeCfg.grammar.lexer

  class State {
    constructor(column, indent) {
      this.column = column
      this.line = []
      this.indent = indent || 0
    }

    // TODO does this actually get called after every \n ?
    copy() {
      const s = new State(this.column, this.indent)
      return s
    }

    highlight(line) {
      const startCol = this.column
      completer.restore(startCol)

      // TODO handle previous error
      let errorToken
      let endCol
      try {
        completer.feed(line)

        endCol = completer.save()

      } catch (err) {
        const isPartial = !/\s$/.test(line)
        errorToken = err.token

        endCol = completer.parser.table[completer.parser.current]

        if (!isPartial) {
          // TODO avoid lexing again
          lexer.reset(line, startCol.lexerState)
          const ranges = []
          var token
          while (token = lexer.next()) {
            const text = line.substr(token.offset, token.size)
            ranges.push({className: 'error', text})
          }
          ranges.reverse()
          return ranges
        }
      }
      this.column = endCol

      const ranges = []
      if (errorToken) {
        const text = line.slice(errorToken.offset)
        ranges.push({className: /^["']/.test(text) ? 'string' : null, text})
      }

      if (startCol === endCol) {
        return [{className: null, text: line}]
      }

      // TODO can we avoid running highlighting if CM is using processLine?
      completer.highlight(startCol, endCol, (className, token) => {
        const text = line.substr(token.offset, token.size)
        if (text === '{') { this.indent++ }
        if (text === '}') { this.indent-- }
        ranges.push({
          className: (className && className.trim()) || null,
          text: text,
        })
      })
      return ranges
    }

    token(stream) {
      if (stream.sol()) {
        if (this.column.index > 0) {
          this.highlight('\n')
        }

        let m = stream.match(/.*$/, false) // don't consume
        this.line = this.highlight(m[0])
        if (!this.line.length) throw new Error('oh bother')
      }

      let range = this.line.pop()
      if (range.className === 'error' && /^['"]/.test(range.text)) {
        range.className = 'string'
      }
      if (!stream.match(range.text)) { // consume
        throw new Error("Does not match stream")
      }
      return range.className
    }
  }


  /* CodeMirror mode */

  return {
    name: 'tosh',
    startState: () => new State(startColumn, 0),
    copyState: state => state.copy(),
    token: (stream, state) => state.token(stream),
    blankLine: state => {
      state.highlight('\n')
      return ''
    },

    indent: function(state, textAfter) {
      var indent = state.indent
      if (/^\s*\}\s*$/.test(textAfter)) indent--
      if (isNaN(cfg.indentUnit)) { throw new Error('oh bother') }
      return cfg.indentUnit * indent
    },

    _completer: completer,

    // TODO electric etc
    electricInput: /^\s*[{}]$/,
    // blockCommentStart: "/*",
    // blockCommentEnd: "*/",
    // lineComment: "//",
    // fold: "brace",
    closeBrackets: "()[]<>''\"\"",

  }
})

