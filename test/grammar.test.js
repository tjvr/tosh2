
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

  function check(text, scripts) {
    if (!scripts) scripts = parseFile(text)
    else expect(parseFile(text)).toEqual(scripts)
    expect(generate(scripts)).toBe(text)
  }

  function checkBlock(text, block) {
    const script = [block]
    const scripts = [script]
    check(text, scripts)
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
    check('show\nhide', [[['show'], ['hide']]])
  })

  test('scripts', () => {
    check('stamp\n\nstamp')
  })

})

