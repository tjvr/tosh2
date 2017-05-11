
const Editor = require('../editor')
const Mode = require('../editor/mode')
const CodeMirror = require('codemirror')

/* based on codemirror/test/mode_test.js */
const testMode = (function() {
  function findSingle(str, pos, ch) {
    for (;;) {
      var found = str.indexOf(ch, pos)
      if (found == -1) return null
      if (str.charAt(found + 1) != ch) return found
      pos = found + 2
    }
  }

  var styleName = /[\w&-_]+/g
  function parseTokens(strs) {
    var tokens = [], plain = ""
    for (var i = 0; i < strs.length; ++i) {
      if (i) plain += "\n"
      var str = strs[i], pos = 0
      while (pos < str.length) {
        var style = null, text
        if (str.charAt(pos) == "[" && str.charAt(pos+1) != "[") {
          styleName.lastIndex = pos + 1
          var m = styleName.exec(str)
          style = m[0].replace(/&/g, " ")
          var textStart = pos + style.length + 2
          var end = findSingle(str, textStart, "]")
          if (end == null) throw new Error("Unterminated token at " + pos + " in '" + str + "'" + style)
          text = str.slice(textStart, end)
          pos = end + 1
        } else {
          var end = findSingle(str, pos, "[")
          if (end == null) end = str.length
          text = str.slice(pos, end)
          pos = end
        }
        text = text.replace(/\[\[|\]\]/g, function(s) {return s.charAt(0);})
        tokens.push({style: style, text: text})
        plain += text
      }
    }
    return {tokens: tokens, plain: plain}
  }

  function highlight(string, mode) {
    var state = mode.startState()

    var lines = string.replace(/\r\n/g,'\n').split('\n')
    var st = [], pos = 0
    for (var i = 0; i < lines.length; ++i) {
      var line = lines[i], newLine = true
      if (mode.indent) {
        var ws = line.match(/^\s*/)[0]
        var indent = mode.indent(state, line.slice(ws.length))
        if (indent != CodeMirror.Pass && indent != ws.length)
          (st.indentFailures || (st.indentFailures = [])).push(
            "Indentation of line " + (i + 1) + " is " + indent + " (expected " + ws.length + ")")
      }
      var stream = new CodeMirror.StringStream(line)
      if (line == "" && mode.blankLine) mode.blankLine(state)
      /* Start copied code from CodeMirror.highlight */
      while (!stream.eol()) {
        for (var j = 0; j < 10 && stream.start >= stream.pos; j++)
          var compare = mode.token(stream, state)
        if (j == 10)
          throw new Failure("Failed to advance the stream." + stream.string + " " + stream.pos)
        var substr = stream.current()
        if (compare && compare.indexOf(" ") > -1) compare = compare.split(' ').sort().join(' ')
        stream.start = stream.pos
        if (pos && st[pos-1].style == compare && !newLine) {
          st[pos-1].text += substr
        } else if (substr) {
          st[pos++] = {style: compare, text: substr}
        }
        // Give up when line is ridiculously long
        if (stream.pos > 5000) {
          st[pos++] = {style: null, text: this.text.slice(stream.pos)}
          break
        }
        newLine = false
      }
    }

    return st
  }

  function compare(text, expected, mode) {
    var expectedOutput = []
    for (var i = 0; i < expected.length; ++i) {
      var sty = expected[i].style
      if (sty && sty.indexOf(" ")) sty = sty.split(' ').sort().join(' ')
      expectedOutput.push({style: sty, text: expected[i].text})
    }

    var observedOutput = highlight(text, mode)

    expect(observedOutput).toEqual(expectedOutput)
  }

  return function testMode(name, mode, tokens, modeName) {
    var data = parseTokens(tokens)
    return test(name, () => {
      return compare(data.plain, data.tokens, mode)
    })
  }

})()

//const mode = CodeMirror.getMode({indentUnit: 2}, 'tosh')
const modeCfg = Editor.prototype.cmOptions.mode
const cfg = {tabSize: 2}
const mode = Mode(cfg, modeCfg)

function MT(name) { testMode(name, mode, Array.prototype.slice.call(arguments, 1)); }

describe('states', () => {

  const grammar = modeCfg.grammar
  const lexer = grammar.lexer

  test('maintain index', () => {
    const state = mode.startState()
    var stream
    expect(state.column.index).toBe(0)
    stream = new CodeMirror.StringStream('stamp')
    expect(mode.token(stream, state)).toBe('s-pen')
    expect(state.column.index).toBe(1)
    expect(state.column.lexerState.line).toBe(1)
    expect(lexer.index).toBe(5)

    mode.blankLine(state)
    expect(state.column.index).toBe(2)
    expect(state.column.lexerState.line).toBe(2)

    stream = new CodeMirror.StringStream('stamp')
    expect(mode.token(stream, state)).toBe('s-pen')
    expect(state.column.index).toBe(4)
    expect(state.column.lexerState.line).toBe(3)
  })

  // test('can be copied')

})

describe('highlight', () => {

  MT('one line',
    '[s-pen stamp]')

  MT('strings',
    '[s-looks say] [string "hello"]')

  MT('partial c block',
    '[s-control forever]')

  MT('c block line',
    '[s-control forever] [s-control {]')

  MT('two lines',
    '[s-pen stamp]',
    '[s-pen stamp]')

  MT('empty c block',
    '[s-control forever] [s-control {]',
    '[s-control }]')

  MT('two different lines',
    '[s-events when] [s-green green] [s-events flag]',
    '[s-pen stamp]')

  MT('full c block',
    '[s-control forever] [s-control {]',
    '[s-pen stamp]',
    '[s-control }]')

})

