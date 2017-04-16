
const nearley = require('nearley')
const grammar = nearley.Grammar.fromCompiled(require('../editor/grammar'))

function parseFile(source) {
  const parser = new nearley.Parser(grammar)
  parser.feed(source)
  const results = parser.results
  if (results.length > 1) {
    throw new Error("Ambiguous!")
  }
  return results[0]
}

function parseScript(source) {
  const scripts = parseFile(source)
  expect(scripts.length).toBe(1)
  return scripts[0]
}

function parseBlock(source) {
  const blocks = parseScript(source)
  expect(blocks.length).toBe(1)
  return blocks[0]
}


describe('parse', () => {

  test('line', () => {
    expect(parseBlock('stamp')).toEqual(['stampCostume'])
    expect(parseBlock('say "hello!"')).toEqual(['say:', "hello!"])
  })

  test('file padding', () => {
    expect(parseBlock('\n \nstamp\n\n')).toEqual(['stampCostume'])
  })

  test('scripts', () => {
    expect(parseScript('\n\nstamp\nstamp\n\n')).toEqual([
      ['stampCostume'],
      ['stampCostume'],
    ])
    expect(parseScript('\n\nstamp\nstamp\nstamp\n\n')).toEqual([
      ['stampCostume'],
      ['stampCostume'],
      ['stampCostume'],
    ])
  })

  test('blank lines', () => {
    const output = [
      [ ['stampCostume'] ],
      [ ['stampCostume'] ],
    ]
    expect(parseFile('\n\nstamp\n\nstamp\n\n')).toEqual(output)
    expect(parseFile('\n\nstamp\n \t\nstamp\n\n')).toEqual(output)
  })

  test('operator precedence', () => {
    expect(parseBlock('say 2 * 3 + 4')).toEqual(['say:', ['+', ['*', 2, 3], 4]])
    expect(parseBlock('say 2 + 3 * 4')).toEqual(['say:', ['+', 2, ['*', 3, 4]]])
  })

})


describe('generate', () => {

  const generate = require('../editor/reverse.js')

  function checkFile(text, scripts) {
    if (!scripts) scripts = parseFile(text)
    else expect(parseFile(text)).toEqual(scripts)
    expect(generate(scripts)).toBe(text)
  }

  function checkScript(text, script) {
    if (!script) script = parseScript(text)
    checkFile(text, [script])
  }

  function checkBlock(text, block) {
    if (!block) block = parseBlock(text)
    checkScript(text, [block])
  }

  test('block', () => {
    checkBlock('say "hello"', ['say:', 'hello'])
  })

  test('operator precedence', () => {
    checkBlock('say 2 * 3 + 4', ['say:', ['+', ['*', 2, 3], 4]])
    checkBlock('say 2 + 3 * 4', ['say:', ['+', 2, ['*', 3, 4]]])
    checkBlock('say (2 + 3) * 4', ['say:', ['*', ['+', 2, 3], 4]])
    checkBlock('say 2 * (3 + 4)', ['say:', ['*', 2, ['+', 3, 4]]])
  })

  test('script', () => {
    checkScript('show\nhide', [['show'], ['hide']])
  })

  test('scripts', () => {
    checkFile('stamp\n\nstamp')
  })

  test('c-blocks', () => {
    checkBlock('repeat 10 {\n\tstamp\n}', ['doRepeat', 10, [['stampCostume']]])
    checkBlock('if <> then {\n\tstamp\n}', ['doIf', false, [['stampCostume']]])
    checkBlock('if <> then {\n\tshow\n} else {\n\thide\n}', ['doIfElse', false, [['show']], [['hide']]])
    checkBlock('repeat until <> {\n\tif on edge, bounce\n}', ['doUntil', false, [['bounceOffEdge']]])
    checkBlock('forever {\n\thide\n}', ['doForever', [['hide']]])
  })

  test('empty c-blocks', () => {
    checkBlock('repeat 10 {\n}', ['doRepeat', 10, null])
    checkBlock('if <> then {\n}', ['doIf', false, null])
    checkBlock('if <> then {\n} else {\n}', ['doIfElse', false, null, null])
    checkBlock('repeat until <> {\n}', ['doUntil', false, null])
    checkBlock('forever {\n}', ['doForever', null])
  })

  test('test script', () => {
    checkScript('when flag clicked\npen down\nmove 10 steps\nturn cw 9 degrees')
    checkScript(`when flag clicked
go to x: 0 y: 0
pen down
forever {
	move 10 steps
	turn cw 10 degrees
}`)
  })

  test('empty file', () => {
    checkFile('', [])
  })


})

