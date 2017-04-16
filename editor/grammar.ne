
@{%

const moo = require('moo')

let lexer = moo.compile([
  {name: 'NL',      match: '\n', lineBreaks: true },
  {name: 'WS',      match: /[ \t]+/},
  {name: 'ellips',  match: /\.{3}/},
  {name: 'comment', match: /\/{2}(.*)$/},
  {name: 'false',   match: '<>'},
  {name: 'zero',    match: '()'},
  {name: 'empty',   match: '_'},
  {name: 'number',  match: /([0-9]+(?:\.[0-9]+)?e-?[0-9]+)/}, // 123[.123]e[-]123
  {name: 'number',  match: /((?:0|[1-9][0-9]*)?\.[0-9]+)/},   // [123].123
  {name: 'number',  match: /((?:0|[1-9][0-9]*)\.[0-9]*)/},    // 123.[123]
  {name: 'number',  match: /(0|[1-9][0-9]*)/},              // 123
  {name: 'color',   match: /#([A-Fa-f0-9]{3}(?:[A-Fa-f0-9]{3})?)/},
  {name: 'string',  match: /"((?:\\["\\]|[^\n"\\])*)"/}, // strings are backslash-escaped
  {name: 'string',  match: /'((?:\\['\\]|[^\n'\\])*)'/},
  {name: 'lparen',  match: '('},
  {name: 'rparen',  match: ')'},
  {name: 'langle',  match: '<'},
  {name: 'rangle',  match: '>'},
  {name: 'lsquare', match: '['},
  {name: 'rsquare', match: ']'},
  {name: '{',       match: '{'},
  {name: '}',       match: '}'},
  {name: 'cloud',   match: /[☁]/},
  {name: 'input',   match: /%[a-z](?:\.[a-zA-Z]+)?/},
  {name: 'symbol',  match: /[-%#+*/=^,?]/},                // single character
  {name: 'symbol',  match: /[_A-Za-z][-_A-Za-z0-9:',.]*/}, // word, as in a block
  {name: 'iden',    match: /[^\n \t"'()<>=*\/+-]+/},     // user-defined names
  {name: 'ERROR',   error: true},
])

lexer.has = function(name) {
  return lexer.groups.find(g => g.tokenType === name)
}

%}
@lexer lexer

@{%

function factory(decode, encode) {
  function process(d) {
    return decode.apply(undefined, d);
  }
  process.encode = encode
  return process
}

id.encode = function(x) { return [x] }

function literal(constant) {
  return factory(function decode() {
    return constant
  }, function encode(value) {
    if (value !== constant) { return false }
    return []
  })
}

function select(index) {
  return factory(function decode(...children) {
    return children[index]
  }, function encode(value) {
    var children = []
    children[index] = value
    return children
  })
}

function block(selector, ...rest) {
  const f = factory(function decode(...children) {
    var args = [selector]
    rest.forEach(childIndex => {
      args.push(children[childIndex])
    })
    return args
  }, function encode(array) {
    if (!array || array[0] !== selector) { return false }
    var children = [];
    rest.forEach((childIndex, argIndex) => {
      children[childIndex] = array[argIndex + 1]
    })
    return children
  })
  f.selector = selector
  return f
}

function isNumber(x) {
  return typeof x === 'number' && (''+x) !== 'NaN'
}

var number = factory(function decodeNumber(...d) {
  var s = d[0].value //.join('')
  var n = parseInt(s)
  if (!isNaN(n)) return n
  var f = parseFloat(s)
  if (!isNaN(f)) return f
  return n
}, function encodeNumber(d) {
  if (isNumber(d)) {
    return '' + d
  }
  return false
})

var negateNumber = factory(function (a, _, n) {
  return -n
}, function (d) {
  if (isNumber(d) && d < 0) {
    return [ , , -d]
  }
  return false
})

var string = factory(function decodeString(...d) {
  return d[0].value
}, function encodeString(d) {
  if (typeof d === 'string') {
    return d
  }
  return false
})

var push2 = factory((a, _, c) => {
  a = a.slice()
  a.push(c)
  return a
}, s => {
  if (!s || s.length < 2) return false
  var s = s.slice()
  var last = s.pop()
  return [s, null, last]
})

var box = factory(s => {
  return [s]
}, d => {
  if (!d || d.length !== 1) return false
  return [d[0]]
})

var emptyList = factory(() => [], d => {
  if (Array.isArray(d) && d.length === 0) {
    return []
  }
  return false
})

const empty = []
var ignore = factory(a => null, _ => empty)

%}

file -> padding {% emptyList %}
      | padding scripts padding  {% select(1) %}

padding -> (%WS | %NL):*  {% ignore %}

scripts -> scripts scriptSep script {% push2 %}
         | script                   {% box %}

scriptSep -> %NL _ %NL        {% ignore %}
           | scriptSep _ %NL  {% ignore %}

script -> script %NL line {% push2 %}
        | line            {% box %}

line -> _ thing _ {% select(1) %}

thing -> block {% id %}
       | r_parens {% id %}
       | b_parens {% id %}

n -> n4 {% id %}

sb -> join {% id %}
    | n4 {% id %}
    | s0 {% id %}

b -> b8 {% id %}

c -> r_parens {% id %}
   | c0 {% id %}

r_parens -> "(" _ r_value _ ")" {% select(2) %}

r_value -> join {% id %}
         | n4 {% id %}

b_parens -> "<" _ b8 _ ">" {% select(2) %}

predicate -> simple_predicate {% id %}

join -> "join" __ jpart __ jpart {% block("concatenate:with:", 2, 4) %}

jpart -> s0 {% id %}
       | "_" {% literal("") %}
       | join {% id %}
       | r_parens {% id %}
       | b_parens {% id %}

predicate -> "touching" __ "color" __ c _ "?" {% block("touchingColor:", 4) %}
           | "color" __ c __ "is" __ "touching" __ c _ "?" {% block("color:sees:", 2, 8) %}

b8 -> b_and {% id %}
    | b_or {% id %}
    | b7 {% id %}

b_and -> b_and __ "and" __ b7 {% block("&", 0, 4) %}
       | b7 __ "and" __ b7 {% block("&", 0, 4) %}

b_or -> b_or __ "or" __ b7 {% block("|", 0, 4) %}
      | b7 __ "or" __ b7 {% block("|", 0, 4) %}

b7 -> "not" __ b7 {% block("not", 2) %}
    | b6 {% id %}

b6 -> sb __ "<" __ sb {% block("<", 0, 4) %}
    | sb __ ">" __ sb {% block(">", 0, 4) %}
    | sb __ "=" __ sb {% block("=", 0, 4) %}
    | m_list __ "contains" __ sb _ "?" {% block("list:contains:", 0, 4) %}
    | predicate {% id %}
    | b2 {% id %}

b2 -> b_parens {% id %}
    | b0 {% id %}

n4 -> n4 __ "+" __ n3 {% block("+", 0, 4) %}
    | n4 __ "-" __ n3 {% block("-", 0, 4) %}
    | n3 {% id %}

n3 -> n3 __ "*" __ n2 {% block("*", 0, 4) %}
    | n3 __ "/" __ n2 {% block("/", 0, 4) %}
    | n3 __ "mod" __ n2 {% block("%", 0, 4) %}
    | n2 {% id %}

n2 -> "round" __ n2 {% block("rounded", 2) %}
    | m_mathOp __ "of" __ n2 {% block("computeFunction:of:", 0, 4) %}
    | "pick" __ "random" __ n4 __ "to" __ n2 {% block("randomFrom:to:", 4, 8) %}
    | m_attribute __ "of" __ m_spriteOrStage {% block("getAttribute:of:", 0, 4) %}
    | "distance" __ "to" __ m_spriteOrMouse {% block("distanceTo:", 4) %}
    | "length" __ "of" __ s2 {% block("stringLength:", 4) %}
    | "letter" __ n __ "of" __ s2 {% block("letter:of:", 2, 6) %}
    | n1 {% id %}

n1 -> simple_reporter {% id %}
    | r_parens {% id %}
    | b_parens {% id %}
    | n0 {% id %}

s2 -> s0 {% id %}
    | n1 {% id %}

n0 -> "-" _ number {% negateNumber %}
    | number {% id %}
    | "_" {% literal("") %}

s0 -> string {% id %}

b0 -> "<>" {% literal(false) %}

c0 -> color {% id %}

_greenFlag -> "flag"
            | "green" __ "flag"

_turnLeft -> "ccw"
           | "left"

_turnRight -> "cw"
            | "right"

c0 -> "red" {% id %}
    | "orange" {% id %}
    | "yellow" {% id %}
    | "green" {% id %}
    | "blue" {% id %}
    | "purple" {% id %}
    | "black" {% id %}
    | "white" {% id %}
    | "pink" {% id %}
    | "brown" {% id %}

m_attribute -> "x" __ "position" {% literal("x position") %}
             | "y" __ "position" {% literal("y position") %}
             | "direction" {% id %}
             | "costume" __ "#" {% literal("costume #") %}
             | "costume" __ "name" {% literal("costume name") %}
             | "backdrop" __ "#" {% literal("backdrop #") %}
             | "backdrop" __ "name" {% literal("backdrop name") %}
             | "size" {% id %}
             | "volume" {% id %}
             | "_" {% literal("") %}

m_backdrop -> jpart {% id %}
            | "_" {% literal("") %}

m_broadcast -> jpart {% id %}
             | "_" {% literal("") %}

m_costume -> jpart {% id %}
           | "_" {% literal("") %}

m_effect -> "color" {% id %}
          | "fisheye" {% id %}
          | "whirl" {% id %}
          | "pixelate" {% id %}
          | "mosaic" {% id %}
          | "brightness" {% id %}
          | "ghost" {% id %}
          | "_" {% literal("") %}

m_key -> "space" {% id %}
       | "up" __ "arrow" {% literal("up arrow") %}
       | "down" __ "arrow" {% literal("down arrow") %}
       | "right" __ "arrow" {% literal("right arrow") %}
       | "left" __ "arrow" {% literal("left arrow") %}
       | "any" {% id %}
       | [a-z0-9] {% id %}
       | "_" {% literal("") %}

m_list -> ListName {% id %}
        | "_" {% literal("") %}

m_location -> jpart {% id %}
            | "mouse-pointer" {% literal("_mouse_") %}
            | "random" __ "position" {% literal("_random_") %}
            | "_" {% literal("") %}

m_mathOp -> "abs" {% id %}
          | "floor" {% id %}
          | "ceiling" {% id %}
          | "sqrt" {% id %}
          | "sin" {% id %}
          | "cos" {% id %}
          | "tan" {% id %}
          | "asin" {% id %}
          | "acos" {% id %}
          | "atan" {% id %}
          | "ln" {% id %}
          | "log" {% id %}
          | "e" _ "^" {% literal("e ^") %}
          | "10" _ "^" {% literal("10 ^") %}
          | "_" {% literal("") %}

m_rotationStyle -> "left-right" {% id %}
                 | "don't" __ "rotate" {% literal("don't rotate") %}
                 | "all" __ "around" {% literal("all around") %}
                 | "_" {% literal("") %}

m_scene -> jpart {% id %}
         | "_" {% literal("") %}

m_sound -> jpart {% id %}
         | "_" {% literal("") %}

m_spriteOnly -> jpart {% id %}
              | "myself" {% literal("_myself_") %}
              | "_" {% literal("") %}

m_spriteOrMouse -> jpart {% id %}
                 | "mouse-pointer" {% literal("_mouse_") %}
                 | "_" {% literal("") %}

m_spriteOrStage -> jpart {% id %}
                 | "Stage" {% literal("_stage_") %}
                 | "_" {% literal("") %}

m_stageOrThis -> "Stage" {% literal("_stage_") %}
               | "this" __ "sprite" {% literal("this sprite") %}
               | "_" {% literal("") %}

m_stop -> "all" {% id %}
        | "this" __ "script" {% literal("this script") %}
        | "other" __ "scripts" __ "in" __ "sprite" {% literal("other scripts in sprite") %}
        | "_" {% literal("") %}

m_timeAndDate -> "year" {% id %}
               | "month" {% id %}
               | "date" {% id %}
               | "day" __ "of" __ "week" {% literal("day of week") %}
               | "hour" {% id %}
               | "minute" {% id %}
               | "second" {% id %}
               | "_" {% literal("") %}

m_touching -> jpart {% id %}
            | "mouse-pointer" {% literal("_mouse_") %}
            | "edge" {% literal("_edge_") %}
            | "_" {% literal("") %}

m_triggerSensor -> "loudness" {% id %}
                 | "timer" {% id %}
                 | "video" __ "motion" {% literal("video motion") %}
                 | "_" {% literal("") %}

m_var -> VariableName {% id %}
       | "_" {% literal("") %}

m_varName -> VariableName {% id %}
           | "_" {% literal("") %}

m_videoMotionType -> "motion" {% id %}
                   | "direction" {% id %}
                   | "_" {% literal("") %}

m_videoState -> "off" {% id %}
              | "on" {% id %}
              | "on-flipped" {% id %}
              | "_" {% literal("") %}

d_direction -> n {% id %}

d_drum -> n {% id %}

d_instrument -> n {% id %}

d_listDeleteItem -> "last" {% id %}
                  | "all" {% id %}
                  | n {% id %}

d_listItem -> "last" {% id %}
            | "random" {% id %}
            | n {% id %}

d_note -> n {% id %}

m_attribute -> jpart {% id %}


block -> hat {% id %}
hat   -> "when" __ _greenFlag __ "clicked" {% block("whenGreenFlag") %}
       | "when" __ m_key __ "key" __ "pressed" {% block("whenKeyPressed", 2) %}
       | "when" __ "this" __ "sprite" __ "clicked" {% block("whenClicked") %}
       | "when" __ "backdrop" __ "switches" __ "to" __ m_backdrop {% block("whenSceneStarts", 8) %}
       | "when" __ m_triggerSensor __ ">" __ n {% block("whenSensorGreaterThan", 2, 6) %}
       | "when" __ "I" __ "receive" __ m_broadcast {% block("whenIReceive", 6) %}
       | "when" __ "I" __ "start" __ "as" __ "a" __ "clone" {% block("whenCloned") %}

mouth -> "{" %NL script %NL "}"  {% select(2) %}
       | "{" %NL "}"             {% literal(null) %}

elsemouth -> "{" %NL script %NL "}" else  {% select(2) %}
           | "{" %NL "}" else             {% literal(null) %}

block -> "repeat" __ n _ mouth  {% block("doRepeat", 2, 4) %}
       | "if" __ b __ "then" _ mouth {% block("doIf", 2, 6) %}
       | "if" __ b __ "then" _ elsemouth mouth {% block("doIfElse", 2, 6, 7) %}
       | "forever" _ mouth {% block("doForever", 2) %}
       | "repeat" __ "until" __ b _ mouth {% block("doUntil", 4, 6) %}

block -> "move" __ n __ "steps" {% block("forward:", 2) %}
       | "turn" __ _turnRight __ n __ "degrees" {% block("turnRight:", 4) %}
       | "turn" __ _turnLeft __ n __ "degrees" {% block("turnLeft:", 4) %}
       | "point" __ "in" __ "direction" __ d_direction {% block("heading:", 6) %}
       | "point" __ "towards" __ m_spriteOrMouse {% block("pointTowards:", 4) %}
       | "go" __ "to" __ "x:" __ n __ "y:" __ n {% block("gotoX:y:", 6, 10) %}
       | "go" __ "to" __ m_location {% block("gotoSpriteOrMouse:", 4) %}
       | "glide" __ n __ "secs" __ "to" __ "x:" __ n __ "y:" __ n {% block("glideSecs:toX:y:elapsed:from:", 2, 10, 14) %}
       | "change" __ "x" __ "by" __ n {% block("changeXposBy:", 6) %}
       | "set" __ "x" __ "to" __ n {% block("xpos:", 6) %}
       | "change" __ "y" __ "by" __ n {% block("changeYposBy:", 6) %}
       | "set" __ "y" __ "to" __ n {% block("ypos:", 6) %}
       | "set" __ "rotation" __ "style" __ m_rotationStyle {% block("setRotationStyle", 6) %}
       | "say" __ sb __ "for" __ n __ "secs" {% block("say:duration:elapsed:from:", 2, 6) %}
       | "say" __ sb {% block("say:", 2) %}
       | "think" __ sb __ "for" __ n __ "secs" {% block("think:duration:elapsed:from:", 2, 6) %}
       | "think" __ sb {% block("think:", 2) %}
       | "show" {% block("show") %}
       | "hide" {% block("hide") %}
       | "switch" __ "costume" __ "to" __ m_costume {% block("lookLike:", 6) %}
       | "next" __ "costume" {% block("nextCostume") %}
       | "next" __ "backdrop" {% block("nextScene") %}
       | "switch" __ "backdrop" __ "to" __ m_backdrop {% block("startScene", 6) %}
       | "switch" __ "backdrop" __ "to" __ m_backdrop __ "and" __ "wait" {% block("startSceneAndWait", 6) %}
       | "change" __ m_effect __ "effect" __ "by" __ n {% block("changeGraphicEffect:by:", 2, 8) %}
       | "set" __ m_effect __ "effect" __ "to" __ n {% block("setGraphicEffect:to:", 2, 8) %}
       | "clear" __ "graphic" __ "effects" {% block("filterReset") %}
       | "change" __ "size" __ "by" __ n {% block("changeSizeBy:", 6) %}
       | "set" __ "size" __ "to" __ n __ "%" {% block("setSizeTo:", 6) %}
       | "go" __ "to" __ "front" {% block("comeToFront") %}
       | "go" __ "back" __ n __ "layers" {% block("goBackByLayers:", 4) %}
       | "play" __ "sound" __ m_sound {% block("playSound:", 4) %}
       | "play" __ "sound" __ m_sound __ "until" __ "done" {% block("doPlaySoundAndWait", 4) %}
       | "stop" __ "all" __ "sounds" {% block("stopAllSounds") %}
       | "play" __ "drum" __ d_drum __ "for" __ n __ "beats" {% block("playDrum", 4, 8) %}
       | "rest" __ "for" __ n __ "beats" {% block("rest:elapsed:from:", 4) %}
       | "play" __ "note" __ d_note __ "for" __ n __ "beats" {% block("noteOn:duration:elapsed:from:", 4, 8) %}
       | "set" __ "instrument" __ "to" __ d_instrument {% block("instrument:", 6) %}
       | "change" __ "volume" __ "by" __ n {% block("changeVolumeBy:", 6) %}
       | "set" __ "volume" __ "to" __ n __ "%" {% block("setVolumeTo:", 6) %}
       | "change" __ "tempo" __ "by" __ n {% block("changeTempoBy:", 6) %}
       | "set" __ "tempo" __ "to" __ n __ "bpm" {% block("setTempoTo:", 6) %}
       | "clear" {% block("clearPenTrails") %}
       | "stamp" {% block("stampCostume") %}
       | "pen" __ "down" {% block("putPenDown") %}
       | "pen" __ "up" {% block("putPenUp") %}
       | "set" __ "pen" __ "color" __ "to" __ c {% block("penColor:", 8) %}
       | "change" __ "pen" __ "hue" __ "by" __ n {% block("changePenHueBy:", 8) %}
       | "set" __ "pen" __ "hue" __ "to" __ n {% block("setPenHueTo:", 8) %}
       | "change" __ "pen" __ "shade" __ "by" __ n {% block("changePenShadeBy:", 8) %}
       | "set" __ "pen" __ "shade" __ "to" __ n {% block("setPenShadeTo:", 8) %}
       | "change" __ "pen" __ "size" __ "by" __ n {% block("changePenSizeBy:", 8) %}
       | "set" __ "pen" __ "size" __ "to" __ n {% block("penSize:", 8) %}
       | "broadcast" __ m_broadcast {% block("broadcast:", 2) %}
       | "broadcast" __ m_broadcast __ "and" __ "wait" {% block("doBroadcastAndWait", 2) %}
       | "wait" __ n __ "secs" {% block("wait:elapsed:from:", 2) %}
       | "wait" __ "until" __ b {% block("doWaitUntil", 4) %}
       | "stop" __ m_stop {% block("stopScripts", 2) %}
       | "create" __ "clone" __ "of" __ m_spriteOnly {% block("createCloneOf", 6) %}
       | "delete" __ "this" __ "clone" {% block("deleteClone") %}
       | "ask" __ sb __ "and" __ "wait" {% block("doAsk", 2) %}
       | "turn" __ "video" __ m_videoState {% block("setVideoState", 4) %}
       | "set" __ "video" __ "transparency" __ "to" __ n __ "%" {% block("setVideoTransparency", 8) %}
       | "reset" __ "timer" {% block("timerReset") %}
       | "set" __ m_var __ "to" __ sb {% block("setVar:to:", 2, 6) %}
       | "change" __ m_var __ "by" __ n {% block("changeVar:by:", 2, 6) %}
       | "show" __ "variable" __ m_var {% block("showVariable:", 4) %}
       | "hide" __ "variable" __ m_var {% block("hideVariable:", 4) %}
       | "add" __ sb __ "to" __ m_list {% block("append:toList:", 2, 6) %}
       | "delete" __ d_listDeleteItem __ "of" __ m_list {% block("deleteLine:ofList:", 2, 6) %}
       | "if" __ "on" __ "edge," __ "bounce" {% block("bounceOffEdge") %}
       | "insert" __ sb __ "at" __ d_listItem __ "of" __ m_list {% block("insert:at:ofList:", 2, 6, 10) %}
       | "replace" __ "item" __ d_listItem __ "of" __ m_list __ "with" __ sb {% block("setLine:ofList:to:", 4, 8, 12) %}
       | "show" __ "list" __ m_list {% block("showList:", 4) %}
       | "hide" __ "list" __ m_list {% block("hideList:", 4) %}

simple_reporter -> "x" __ "position" {% block("xpos") %}
                 | "y" __ "position" {% block("ypos") %}
                 | "direction" {% block("heading") %}
                 | "costume" __ "#" {% block("costumeIndex") %}
                 | "size" {% block("scale") %}
                 | "backdrop" __ "name" {% block("sceneName") %}
                 | "backdrop" __ "#" {% block("backgroundIndex") %}
                 | "volume" {% block("volume") %}
                 | "tempo" {% block("tempo") %}

simple_predicate -> "touching" __ m_touching _ "?" {% block("touching:", 2) %}

simple_reporter -> "answer" {% block("answer") %}

simple_predicate -> "key" __ m_key __ "pressed" _ "?" {% block("keyPressed:", 2) %}
                  | "mouse" __ "down" _ "?" {% block("mousePressed") %}

simple_reporter -> "mouse" __ "x" {% block("mouseX") %}
                 | "mouse" __ "y" {% block("mouseY") %}
                 | "loudness" {% block("soundLevel") %}
                 | "video" __ m_videoMotionType __ "on" __ m_stageOrThis {% block("senseVideoMotion", 2, 6) %}
                 | "timer" {% block("timer") %}
                 | "current" __ m_timeAndDate {% block("timeAndDate", 2) %}
                 | "days" __ "since" __ "2000" {% block("timestamp", 4) %}
                 | "username" {% block("getUserName") %}
                 | "item" __ d_listItem __ "of" __ m_list {% block("getLine:ofList:", 2, 6) %}
                 | "length" __ "of" __ m_list {% block("lineCountOfList:", 4) %}

simple_reporter -> VariableName {% block("readVariable", 0) %}

else -> _ "else" _  {% ignore %}
ellips -> _ "..." _ {% ignore %}


_ -> %WS | null {% ignore %}
__ -> %WS {% ignore %}

string -> %string     {% string %}
number -> %number     {% number %}

color -> %color

VariableName -> "foo" {% literal('foo') %}
              | "PixelX" {% literal('PixelX') %}
ListName -> "list" {% literal('list') %}

