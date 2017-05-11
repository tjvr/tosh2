
const Editor = require('../editor')
const Mode = require('../editor/mode')
const StringStream = require('codemirror').StringStream ///src/util/StringStream')


describe('highlight', () => {

  const modeCfg = Editor.prototype.cmOptions.mode
  const cfg = {tabSize: 2}
  const mode = Mode(cfg, modeCfg)

  function highlight(state, source) {
    const stream = new StringStream(source, cfg.tabSize)
    const tokens = []
    while (stream.pos < source.length) {
      const index = stream.pos
      const className = mode.token(stream, state)
      const text = source.substring(index, stream.pos)
      tokens.push([text, className])
    }
    return tokens
  }

  // test('can copy state')

  test('one line', () => {
    expect(highlight(mode.startState(), 'stamp')).toEqual([
      ['stamp', 's-pen symbol'],
    ])
  })

  test('strings', () => {
    expect(highlight(mode.startState(), 'say "hello"')).toEqual([
      ['say', 's-looks symbol'],
      [' ', 's-looks WS'],
      ['"hello"', 's-looks string'],
    ])
  })

  test('partial c block', () => {
    expect(highlight(mode.startState(), 'repeat')).toEqual([
      ['repeat', 's-control symbol'],
    ])
  })

  test('c block brace', () => {
    expect(highlight(mode.startState(), 'forever {')).toEqual([
      ['forever', 's-control symbol'],
      [' ', 's-control WS'],
      ['{', 's-control {'],
    ])
  })

  test('two lines', () => {
    const state = mode.startState()
    expect(highlight(state, 'stamp')).toEqual([
      ['stamp', 's-pen symbol'],
    ])
    expect(highlight(state, 'stamp')).toEqual([
      ['stamp', 's-pen symbol'],
    ])
  })

})

