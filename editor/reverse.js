
const nearley = require('nearley')
const grammar = nearley.Grammar.fromCompiled(require('../editor/grammar'))
const reverse = require('nearley-reverse')
const itt = require('itt')

const str = JSON.stringify

function generate(scripts) {
  const tokens = reverse(grammar, scripts)
  var indent = 0
  var out = ''
  var last
  for (let [token, next] of itt(tokens).lookahead()) {
    if (next === '}') {
      indent--
    }
    if (typeof token === 'string') {
      if (token === '{') {
        if (!/ $/.test(out)) out += ' '
        indent++
      }
      out += token
      if (token === '}') {
        if (next && next.type !== 'WS') out += ' '
      }
      continue
    }
    switch (token.type) {
      case 'NL':
        out += '\n'
        for (var i=indent; i--; ) out += '\t'
        continue
      case 'WS': out += ' '; continue
      case 'string': out += str(token.value); continue
      default:
        if (token.value) { out += token.value; continue }
        throw new Error("Can't generate: " + token)
    }
  }
  return out
}

module.exports = generate

