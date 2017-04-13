
const nearley = require('nearley')
const grammar = nearley.Grammar.fromCompiled(require('../editor/grammar'))
const reverse = require('nearley-reverse')

function generate(scripts) {
  const tokens = reverse(grammar, scripts)
  return tokens.map(x =>
    typeof x === 'string' ? x :
    x.type === 'NL' ? '\n' :
    x.type === 'WS' ? ' ' :
    x.type === 'string' ? JSON.stringify(x.value) :
    x.value ? x.value :
    JSON.stringify(x)
  ).join("")
}

module.exports = generate
  
