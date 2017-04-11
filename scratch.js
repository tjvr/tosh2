const inputPat = /(%[a-zA-Z](?:\.[a-zA-Z]+)?)/g

const inputShapes = {
  '%b': 'boolean',
  '%c': 'color',
  '%d': 'number-menu',
  '%m': 'readonly-menu',
  '%n': 'number',
  '%s': 'string',
}

function getInputShape(input) {
  var s = input.slice(0, 2)
  return inputShapes[s]
}

/*****************************************************************************/

const commands = {
  "forward:": {category: "motion", shape: "stack", spec: "move %n steps"},
  "turnRight:": {category: "motion", shape: "stack", spec: "turn @turnRight %n degrees"},
  "turnLeft:": {category: "motion", shape: "stack", spec: "turn @turnLeft %n degrees"},
  "heading:": {category: "motion", shape: "stack", spec: "point in direction %d.direction"},
  "pointTowards:": {category: "motion", shape: "stack", spec: "point towards %m.spriteOrMouse"},
  "gotoX:y:": {category: "motion", shape: "stack", spec: "go to x:%n y:%n"},
  "gotoSpriteOrMouse:": {category: "motion", shape: "stack", spec: "go to %m.location"},
  "glideSecs:toX:y:elapsed:from:": {category: "motion", shape: "stack", spec: "glide %n secs to x:%n y:%n"},
  "changeXposBy:": {category: "motion", shape: "stack", spec: "change x by %n"},
  "xpos:": {category: "motion", shape: "stack", spec: "set x to %n"},
  "changeYposBy:": {category: "motion", shape: "stack", spec: "change y by %n"},
  "ypos:": {category: "motion", shape: "stack", spec: "set y to %n"},
  "setRotationStyle": {category: "motion", shape: "stack", spec: "set rotation style %m.rotationStyle"},
  "say:duration:elapsed:from:": {category: "looks", shape: "stack", spec: "say %s for %n secs"},
  "say:": {category: "looks", shape: "stack", spec: "say %s"},
  "think:duration:elapsed:from:": {category: "looks", shape: "stack", spec: "think %s for %n secs"},
  "think:": {category: "looks", shape: "stack", spec: "think %s"},
  "show": {category: "looks", shape: "stack", spec: "show"},
  "hide": {category: "looks", shape: "stack", spec: "hide"},
  "lookLike:": {category: "looks", shape: "stack", spec: "switch costume to %m.costume"},
  "nextCostume": {category: "looks", shape: "stack", spec: "next costume"},
  "nextScene": {category: "looks", shape: "stack", spec: "next backdrop"},
  "startScene": {category: "looks", shape: "stack", spec: "switch backdrop to %m.backdrop"},
  "startSceneAndWait": {category: "looks", shape: "stack", spec: "switch backdrop to %m.backdrop and wait"},
  "changeGraphicEffect:by:": {category: "looks", shape: "stack", spec: "change %m.effect effect by %n"},
  "setGraphicEffect:to:": {category: "looks", shape: "stack", spec: "set %m.effect effect to %n"},
  "filterReset": {category: "looks", shape: "stack", spec: "clear graphic effects"},
  "changeSizeBy:": {category: "looks", shape: "stack", spec: "change size by %n"},
  "setSizeTo:": {category: "looks", shape: "stack", spec: "set size to %n%"},
  "comeToFront": {category: "looks", shape: "stack", spec: "go to front"},
  "goBackByLayers:": {category: "looks", shape: "stack", spec: "go back %n layers"},
  "playSound:": {category: "sound", shape: "stack", spec: "play sound %m.sound"},
  "doPlaySoundAndWait": {category: "sound", shape: "stack", spec: "play sound %m.sound until done"},
  "stopAllSounds": {category: "sound", shape: "stack", spec: "stop all sounds"},
  "playDrum": {category: "sound", shape: "stack", spec: "play drum %d.drum for %n beats"},
  "rest:elapsed:from:": {category: "sound", shape: "stack", spec: "rest for %n beats"},
  "noteOn:duration:elapsed:from:": {category: "sound", shape: "stack", spec: "play note %d.note for %n beats"},
  "instrument:": {category: "sound", shape: "stack", spec: "set instrument to %d.instrument"},
  "changeVolumeBy:": {category: "sound", shape: "stack", spec: "change volume by %n"},
  "setVolumeTo:": {category: "sound", shape: "stack", spec: "set volume to %n%"},
  "changeTempoBy:": {category: "sound", shape: "stack", spec: "change tempo by %n"},
  "setTempoTo:": {category: "sound", shape: "stack", spec: "set tempo to %n bpm"},
  "clearPenTrails": {category: "pen", shape: "stack", spec: "clear"},
  "stampCostume": {category: "pen", shape: "stack", spec: "stamp"},
  "putPenDown": {category: "pen", shape: "stack", spec: "pen down"},
  "putPenUp": {category: "pen", shape: "stack", spec: "pen up"},
  "penColor:": {category: "pen", shape: "stack", spec: "set pen hue to %c"}, // nb. modified
  "changePenHueBy:": {category: "pen", shape: "stack", spec: "change pen hue by %n"}, // nb. modified
  "setPenHueTo:": {category: "pen", shape: "stack", spec: "set pen hue to %n"},
  "changePenShadeBy:": {category: "pen", shape: "stack", spec: "change pen shade by %n"},
  "setPenShadeTo:": {category: "pen", shape: "stack", spec: "set pen shade to %n"},
  "changePenSizeBy:": {category: "pen", shape: "stack", spec: "change pen size by %n"},
  "penSize:": {category: "pen", shape: "stack", spec: "set pen size to %n"},
  "whenGreenFlag": {category: "events", shape: "hat", spec: "when @greenFlag clicked"},
  "whenKeyPressed": {category: "events", shape: "hat", spec: "when %m.key key pressed"},
  "whenClicked": {category: "events", shape: "hat", spec: "when this sprite clicked"},
  "whenSceneStarts": {category: "events", shape: "hat", spec: "when backdrop switches to %m.backdrop"},
  "whenSensorGreaterThan": {category: "events", shape: "hat", spec: "when %m.triggerSensor > %n"},
  "whenIReceive": {category: "events", shape: "hat", spec: "when I receive %m.broadcast"},
  "broadcast:": {category: "events", shape: "stack", spec: "broadcast %m.broadcast"},
  "doBroadcastAndWait": {category: "events", shape: "stack", spec: "broadcast %m.broadcast and wait"},
  "wait:elapsed:from:": {category: "control", shape: "stack", spec: "wait %n secs"},
  "doRepeat": {category: "control", shape: "c-block", spec: "repeat %n"},
  "doForever": {category: "control", shape: "c-block cap", spec: "forever"},
  "doIf": {category: "control", shape: "c-block", spec: "if %b then"},
  "doIfElse": {category: "control", shape: "if-block", spec: "if %b then"},
  "doWaitUntil": {category: "control", shape: "stack", spec: "wait until %b"},
  "doUntil": {category: "control", shape: "c-block", spec: "repeat until %b"},
  "stopScripts": {category: "control", shape: "cap", spec: "stop %m.stop"},
  "whenCloned": {category: "control", shape: "hat", spec: "when I start as a clone"},
  "createCloneOf": {category: "control", shape: "stack", spec: "create clone of %m.spriteOnly"},
  "deleteClone": {category: "control", shape: "cap", spec: "delete this clone"},
  "doAsk": {category: "sensing", shape: "stack", spec: "ask %s and wait"},
  "setVideoState": {category: "sensing", shape: "stack", spec: "turn video %m.videoState"},
  "setVideoTransparency": {category: "sensing", shape: "stack", spec: "set video transparency to %n%"},
  "timerReset": {category: "sensing", shape: "stack", spec: "reset timer"},
  "setVar:to:": {category: "variable", shape: "stack", spec: "set %m.var to %s"},
  "changeVar:by:": {category: "variable", shape: "stack", spec: "change %m.var by %n"},
  "showVariable:": {category: "variable", shape: "stack", spec: "show variable %m.var"},
  "hideVariable:": {category: "variable", shape: "stack", spec: "hide variable %m.var"},
  "append:toList:": {category: "list", shape: "stack", spec: "add %s to %m.list"},
  "deleteLine:ofList:": {category: "list", shape: "stack", spec: "delete %d.listDeleteItem of %m.list"},
  "bounceOffEdge": {category: "motion", shape: "stack", spec: "if on edge, bounce"},
  "insert:at:ofList:": {category: "list", shape: "stack", spec: "insert %s at %d.listItem of %m.list"},
  "setLine:ofList:to:": {category: "list", shape: "stack", spec: "replace item %d.listItem of %m.list with %s"},
  "showList:": {category: "list", shape: "stack", spec: "show list %m.list"},
  "hideList:": {category: "list", shape: "stack", spec: "hide list %m.list"},
  "xpos": {category: "motion", shape: "reporter", spec: "x position"},
  "ypos": {category: "motion", shape: "reporter", spec: "y position"},
  "heading": {category: "motion", shape: "reporter", spec: "direction"},
  "costumeIndex": {category: "looks", shape: "reporter", spec: "costume #"},
  "scale": {category: "looks", shape: "reporter", spec: "size"},
  "sceneName": {category: "looks", shape: "reporter", spec: "backdrop name"},
  "backgroundIndex": {category: "looks", shape: "reporter", spec: "backdrop #"},
  "volume": {category: "sound", shape: "reporter", spec: "volume"},
  "tempo": {category: "sound", shape: "reporter", spec: "tempo"},
  "touching:": {category: "sensing", shape: "predicate", spec: "touching %m.touching?"},
  "touchingColor:": {category: "sensing", shape: "predicate", spec: "touching color %c?"},
  "color:sees:": {category: "sensing", shape: "predicate", spec: "color %c is touching %c?"},
  "distanceTo:": {category: "sensing", shape: "reporter", spec: "distance to %m.spriteOrMouse"},
  "answer": {category: "sensing", shape: "reporter", spec: "answer"},
  "keyPressed:": {category: "sensing", shape: "predicate", spec: "key %m.key pressed?"},
  "mousePressed": {category: "sensing", shape: "predicate", spec: "mouse down?"},
  "mouseX": {category: "sensing", shape: "reporter", spec: "mouse x"},
  "mouseY": {category: "sensing", shape: "reporter", spec: "mouse y"},
  "soundLevel": {category: "sensing", shape: "reporter", spec: "loudness"},
  "senseVideoMotion": {category: "sensing", shape: "reporter", spec: "video %m.videoMotionType on %m.stageOrThis"},
  "timer": {category: "sensing", shape: "reporter", spec: "timer"},
  "getAttribute:of:": {category: "sensing", shape: "reporter", spec: "%m.attribute of %m.spriteOrStage"},
  "timeAndDate": {category: "sensing", shape: "reporter", spec: "current %m.timeAndDate"},
  "timestamp": {category: "sensing", shape: "reporter", spec: "days since 2000"},
  "getUserName": {category: "sensing", shape: "reporter", spec: "username"},
  "+": {category: "operators", shape: "reporter", spec: "%n + %n"},
  "-": {category: "operators", shape: "reporter", spec: "%n - %n"},
  "*": {category: "operators", shape: "reporter", spec: "%n * %n"},
  "/": {category: "operators", shape: "reporter", spec: "%n / %n"},
  "randomFrom:to:": {category: "operators", shape: "reporter", spec: "pick random %n to %n"},
  "<": {category: "operators", shape: "predicate", spec: "%s < %s"},
  "=": {category: "operators", shape: "predicate", spec: "%s = %s"},
  ">": {category: "operators", shape: "predicate", spec: "%s > %s"},
  "&": {category: "operators", shape: "predicate", spec: "%b and %b"},
  "|": {category: "operators", shape: "predicate", spec: "%b or %b"},
  "not": {category: "operators", shape: "predicate", spec: "not %b"},
  "concatenate:with:": {category: "operators", shape: "reporter", spec: "join %s %s"},
  "letter:of:": {category: "operators", shape: "reporter", spec: "letter %n of %s"},
  "stringLength:": {category: "operators", shape: "reporter", spec: "length of %s"},
  "%": {category: "operators", shape: "reporter", spec: "%n mod %n"},
  "rounded": {category: "operators", shape: "reporter", spec: "round %n"},
  "computeFunction:of:": {category: "operators", shape: "reporter", spec: "%m.mathOp of %n"},
  "getLine:ofList:": {category: "list", shape: "reporter", spec: "item %d.listItem of %m.list"},
  "lineCountOfList:": {category: "list", shape: "reporter", spec: "length of %m.list"},
  "list:contains:": {category: "list", shape: "predicate", spec: "%m.list contains %s?"},
  "readVariable": {category: "variable", shape: "reporter", spec: "%m.var"},
  "contentsOfList:": {category: "list", shape: "reporter", spec: "%m.list"},
  "getParam": {category: "parameter", shape: "predicate", spec: "%m.param"},
  //"else": {category: "control", shape: "else", spec: "else"},
  //"end": {category: "control", shape: "end", spec: "end"},
  //"ellips": {category: "grey", shape: "ellips", spec: "..."},
}

for (const selector of Object.keys(commands)) {
  augment(commands[selector])
}

function augment(info) {
  info.parts = info.spec.split(inputPat)
  info.inputs = info.parts.filter(p => inputPat.test(p))
}

function blockInfo(array) {
  const selector = array[0]
  if (selector === 'call') {
    const info = {
      spec: array[1],
      shape: 'stack',
      category: 'custom',
    }
    augment(info)
    return info
  } else {
    const info = commands[selector]
    if (!info) throw new Error("unknown selector: " + selector)
    return info
  }
}

/* 
 * TODO stop block
  var osisInfo = {
    category: "control",
    defaults: ["all"],
    inputs: ["%m.stop"],
    parts: ["stop", "%m.stop", ""],
    selector: "stopScripts",
    shape: "stack",
    spec: "stop %m.stop",
  }
*/

module.exports = {inputPat, blockInfo, getInputShape}
