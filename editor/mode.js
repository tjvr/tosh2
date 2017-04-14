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

  _collect(item, end, seen, out, allowPartial) {
    if (!item) return
    if (seen.has(item)) return
    seen.add(item)

    let range = this._getRange(item, end, allowPartial)
    if (range) out.push(range)

    if (!item.right) return
    let split = item.right.start.index
    this._collect(item.left, split, seen, out)
    this._collect(item.right, end, seen, out, allowPartial)
  }

  _ranges(start, end) {
    let columns = this.columns
    console.log(columns)
    var index = Math.min(end, columns.length - 1)
    var column = columns[index]
    if (!column) return
    // TODO figure out how to make this work without `unique`
    var span = column.unique[start]
    if (!span) return

    let seen = new Set()
    let ranges = []
    for (let item of span.values()) {
      if (!item.rule) continue
      this._collect(item, index, seen, ranges, true)
    }
    return ranges
  }

  highlight(start, end) {
    var start = start.index
    var end = end.index
    if (!this.columns[start]) {
      return [new Range(start, end, 'error')]
    }

    var ranges = this._ranges(start, end)
    let index = end
    while (!ranges && index > 0) {
      ranges = this._ranges(start, --index)
    }

    let pointsSet = new Set()
    ranges.forEach(range => {
      pointsSet.add(range.start)
      pointsSet.add(range.end)
      ranges.push(range)
    })

    // longest ranges first
    ranges.sort((a, b) => {
      return b.size() - a.size()
    })

    // partial parses should not be tagged
    if (index < end) {
      pointsSet.add(index)
      ranges.push(new Range(index, end, ''))
    }

    // otherwise, default to 'error'
    ranges.unshift(new Range(start, end, 'error'))

    // clean up boundaries
    pointsSet.add(start)
    if (pointsSet.has(end)) pointsSet.delete(end)

    // split on each range boundary
    let points = Array.from(pointsSet).sort((a, b) => a - b)
    let classes = {}
    points.forEach(index => {
      classes[index] = ""
    })

    // color between points using ranges. shortest range wins
    ranges.forEach(range => {
      let rangeStart = Math.max(start, range.start)
      let rangeEnd = Math.min(end, range.end)
      for (var index = rangeStart; index < rangeEnd; index++) {
        if (index in classes) {
          classes[index] = range.className
        }
      }
    })

    // put the ranges together
    return points.map((regionStart, index) => {
      let regionEnd = points[index + 1] || end
      return new Range(regionStart, regionEnd, classes[regionStart])
    })
  }
}

class Completer {
  constructor(grammar, options) {
    this.parser = new nearley.Parser(grammar, {
      keepHistory: true,
    })
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
      return new State(this.column)
    }

    highlight(line) {
      let start = this.column
      completer.restore(start)

      // TODO handle previous error

      try {
        completer.feed(line)
      } catch (e) {
        console.error('err', e)
        // oh dear
      }
      console.log(completer.parser.results.length, 'results')
      console.log('=>', JSON.stringify(completer.parser.results[0]))
      let end = this.column = completer.save()
      // if (error) {
      //   console.error(error)
      // }

      return [{className: 'string', text: line}]
      //let ranges = completer.highlight(start, end)

      //return ranges.map(range => {
      //  let className = range.className
      //  let rangeStart = range.start - start
      //  let rangeEnd = range.end - start
      //  let text = line.slice(rangeStart, rangeEnd)
      //  return { className, text }
      //})
    }

    next(stream) {
      // this.indent = stream.indentation()

      if (!this.line.length) {
        if (this.column.index > 0) {
          this.highlight('\n')
        }
        let m = stream.match(/.*/, false) // don't consume
        this.line = this.highlight(m[0])
      }

      let token = this.line.shift()
      if (!stream.match(token.text)) { // consume
        console.error(token)
        throw new Error("Does not match stream")
      }
      return token.className
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

