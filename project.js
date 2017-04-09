
const V2Model = require('v2/model/model')
const List = require('v2/model/list')


class Model extends V2Model {
  constructor(ctx) {
    super()
    this.ctx = ctx
  }

  toJSON(ctx) {
    const o = {}
    for (const k of this.dataProperties) {
    //for (const k of Object.getOwnPropertyNames(this)) {
      if (k[0] === '_') continue
      const v = this[k]
      if (v instanceof List) {
        o[k] = v.data.map(c => c.toJSON ? c.toJSON(ctx) : c)
      } else {
        o[k] = v.toJSON ? v.toJSON(ctx) : v
      }
    }
    return o
  }

  init(o) {
    if (o) Object.assign(this, o)
    delete this.ctx
  }
}


class Scriptable extends Model {
  constructor(ctx) {
    super(ctx)
    this.scripts = []
    this.scriptComments = [] // TODO comments
    this.variables = []
    this.lists = []
    this._costumes = new List
    this.currentCostumeIndex = 0
    this._sounds = new List
  }
  get isStage() { return true }

  static newVariable(name) { return {name, value: 0, isPersistent: false} }
  static newList(listName) { return {listName, contents: [], isPersistent: false, x: 5, y: 5, width: 102, height: 202, visible: false} }

  get name() { return this.objName }
  set name(v) { this.objName = v }
}
Scriptable._property('objName')
Scriptable._property('scripts')
Scriptable._property('scriptComments')
Scriptable._property('variables')
Scriptable._property('lists')
Scriptable.dataProperties.push('costumes')
Scriptable._property('currentCostumeIndex')
Scriptable.dataProperties.push('sounds')


class Stage extends Scriptable {
  constructor(o, ctx) {
    super(ctx)
    this.objName = 'Stage'
    this._children = new List
    this._sprites = new List
    // TODO listen for sprite modifications & update children accordingly

    this.penLayerMD5 = '5c81a336fab8be57adc039a8a2b33ca9.png'
    this.penLayerID = 0
    this.tempoBPM = 60
    this.videoAlpha = 0.5
    this.info = {videoOn: false}

    this.init(o)
  }
  get isStage() { return true }

  toJSON(ctx) {
    const json = super.toJSON(ctx)
    json.info.spriteCount = this.sprites.length
    json.info.scriptCount = [this].concat(this.sprites.data).map(s => s.scripts.length).reduce((a, b) => a + b, 0)
    delete json.info.swfVersion
    delete json.info.flashVersion
    return json
  }

  get children() { return this._children }
  set children(xs) { this._children.data = xs }

  get sprites() { return this._sprites }
  set sprites(xs) { this._sprites.data = xs.map(o => new Sprite(o, this.ctx)) }

  get costumes() { return this._costumes }
  set costumes(xs) { this._costumes.data = xs.map(o => new Costume(o, this.ctx)) }

  get sounds() { return this._sounds }
  set sounds(xs) { this._sounds.data = xs.map(o => new Sound(o, this.ctx)) }
}
Stage.prototype.dataProperties.push('children')
Stage.prototype.dataProperties.push('sprites')
Stage.prototype.dataProperties.push('penLayerMD5')
Stage.prototype.dataProperties.push('penLayerID')
Stage.prototype.dataProperties.push('tempoBPM')
Stage.prototype.dataProperties.push('videoAlpha')
Stage.prototype.dataProperties.push('info')


class Sprite extends Scriptable {
  constructor(o, ctx) {
    super(ctx)
    this.objName = 'turtle'
    this.scratchX = 0
    this.scratchY = 0
    this.scale = 1
    this.direction = 90
    this.rotationStyle = 'normal'
    this.isDraggable = false
    this.visible = true
    this.spriteInfo = {}
    this.init(o)
  }
  get isStage() { return false }

  static create() {
    const turtle = new Sprite
    // TODO turtle.costumes.add
    return turtle
  }

  get costumes() { return this._costumes }
  set costumes(xs) { this._costumes.data = xs.map(o => new Costume(o, this.ctx)) }

  get sounds() { return this._sounds }
  set sounds(xs) { this._sounds.data = xs.map(o => new Sound(o, this.ctx)) }
}


class Costume extends Model {
  constructor(o, ctx) {
    super(ctx)
    // this.costumeName
    this.baseLayerMD5 = ''
    this.bitmapResolution = 1
    this.rotationCenterX = 0
    this.rotationCenterY = 0
    this._ext = o && o.baseLayerMD5.split('.').pop()
    this.init(o)
  }
  set baseLayerID(id) {
    const zip = this.ctx.zip
    const root = id + '.'
    var ext = this._ext
    var f = zip.file(root + ext)
    if (!f) { ext = 'png'; f = zip.file(root + ext) }
    if (!f) { ext = 'jpg'; f = zip.file(root + ext) }
    if (!f) { ext = 'svg'; f = zip.file(root + ext) }
    if (!f) throw new Error("Couldn't find image: " + root + ext)
    this._ext = ext
    this._file = f.async('blob') // Promise
    // this._thumbnail = this._file.then(makeThumbnail)
  }

  toJSON(ctx) {
    console.log(this.name)
    const json = super.toJSON(ctx)
    const id = json.baseLayerID = ctx.highestCostumeId++
    const name = id + '.' + this._ext
    this._file.then(blob => ctx.zip.file(name, blob))
    return json
  }

  get name() { return this.costumeName }
  set name(v) { this.costumeName = v }
}
Costume._property('costumeName')
Costume.dataProperties.push('baseLayerMD5')
Costume.dataProperties.push('bitmapResolution')
Costume.dataProperties.push('rotationCenterX')
Costume.dataProperties.push('rotationCenterY')


class Sound extends Model {
  constructor(o, ctx) {
    super(ctx)
    // this.soundName
    this.md5 = ''
    this.sampleCount = 258
    this.rate = 11025
    this.format = ''
    this.init(o)
  }
  set soundID(id) {
    const zip = this.ctx.zip
    const f = zip.file(id + '.wav')
    if (!f) throw new Error("Couldn't find sound: " + root + ext)
    this._file = f.async('blob') // Promise
  }

  toJSON(ctx) {
    const json = super.toJSON(ctx)
    const id = json.soundID = ctx.highestSoundId++
    const name = id + '.wav'
    this._file.then(blob => ctx.zip.file(name, blob))
    return json
  }

  get name() { return this.soundName }
  set name(v) { this.soundName = v }
}
Sound._property('soundName')
Sound.dataProperties.push('md5')
Sound.dataProperties.push('sampleCount')
Sound.dataProperties.push('rate')
Sound.dataProperties.push('format')


// P.IO.parseJSONish
const parseJSONish = function(json) {
  if (!/^\s*\{/.test(json)) throw new SyntaxError('Bad JSON');
  try {
    return JSON.parse(json);
  } catch (e) {}
  if (/[^,:{}\[\]0-9\.\-+EINaefilnr-uy \n\r\t]/.test(json.replace(/"(\\.|[^"\\])*"/g, ''))) {
    throw new SyntaxError('Bad JSON');
  }
  return (1, eval)('(' + json + ')');
}


class Project {
  static create() {
    return new Stage({
      costumes: [], // TODO Costume.defaultBackdrop()],
    })
  }

  static load(zip) {
    var zip = zip
    return zip.file('project.json').async('string').then(text => {
      const json = parseJSONish(text)
      console.log(json)
      const stage = new Stage(json, {zip})
      return stage
    })
  }

  static save(stage) {
    const ctx = {
      zip: new JSZip(),
      highestCostumeId: 0,
      highestSoundId: 0,
    }
    const json = stage.toJSON(ctx)
    console.log(json)
    const zip = ctx.zip
    zip.file('project.json', JSON.stringify(json, null, '  '))
    return zip
  }
}

module.exports = {Project, Sprite}

