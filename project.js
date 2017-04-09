'use strict'
const Model = require('v2/model/model')
const List = require('v2/model/list')


class ToshModel extends Model {
  constructor(ctx) {
    super()
    this.ctx = ctx
  }

  toJSON(ctx) {
    const o = {}
    for (const k of this.dataProperties) {
      if (k[0] === '_') continue
      var v = this[k]
      if (v instanceof List) v = v.data
      if (Array.isArray(v)) v = v.map(c => c.toJSON ? c.toJSON(ctx) : c)
      o[k] = v && v.toJSON ? v.toJSON(ctx) : v
    }
    return o
  }

  init(o) {
    if (o) Object.assign(this, o)
    delete this.ctx
  }
}


class Scriptable extends ToshModel {
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
    this.sprites = new List
    this.bindChildren()

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
    json.info.scriptCount = this.scriptCount
    //delete json.info.swfVersion
    //delete json.info.flashVersion
    return json
  }
  get scriptCount() {
    var count = 0
    count += this.scripts.length
    for (const sprite of this.sprites) {
      count += sprite.scripts.length
    }
    return count
  }

  get children() { return this._children }
  set children(xs) {
    const children = xs.slice()
    this._children.data = children
    let sprites = []
    for (var i=0; i<children.length; i++) {
      const o = children[i]
      if (o.objName) {
        sprites.push(children[i] = new Sprite(o, this.ctx))
      }
    }
    sprites.sort((a, b) => a.indexInLibrary - b.indexInLibrary)
    this.sprites.data = sprites
  }
  bindChildren() {
    // TODO listen for sprite modifications & update children accordingly
  }

  get costumes() { return this._costumes }
  set costumes(xs) { this._costumes.data = xs.map(o => new Costume(o, this.ctx)) }

  get sounds() { return this._sounds }
  set sounds(xs) { this._sounds.data = xs.map(o => new Sound(o, this.ctx)) }
}
Stage.prototype.dataProperties = Scriptable.prototype.dataProperties.slice()
Stage.prototype.dataProperties.push('children')
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

  toJSON(ctx) {
    return Object.assign(super.toJSON(ctx), {
      indexInLibrary: ctx.sprites.indexOf(this) + 1,
    })
  }

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
Sprite.prototype.dataProperties = Scriptable.prototype.dataProperties.slice()
Sprite.prototype.dataProperties.push('scratchX')
Sprite.prototype.dataProperties.push('scratchY')
Sprite.prototype.dataProperties.push('scale')
Sprite.prototype.dataProperties.push('direction')
Sprite.prototype.dataProperties.push('rotationStyle')
Sprite.prototype.dataProperties.push('isDraggable')
Sprite.prototype.dataProperties.push('visible')
Sprite.prototype.dataProperties.push('spriteInfo')
Sprite.prototype.dataProperties.push('indexInLibrary')


class Costume extends ToshModel {
  constructor(o, ctx) {
    super(ctx)
    // this.costumeName
    this.baseLayerMD5 = ''
    this.bitmapResolution = 1
    this.rotationCenterX = 0
    this.rotationCenterY = 0
    this._ext = o && o.baseLayerMD5.split('.').pop()
    this.init(o)
    delete this.baseLayerID
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
    this.ctx.promises.push(f.async('blob').then(blob => {
      this._blob = blob
    }))
    // this._thumbnail = this._blob.then(makeThumbnail)
  }

  toJSON(ctx) {
    const json = super.toJSON(ctx)
    const id = json.baseLayerID = ctx.highestCostumeId++
    const name = id + '.' + this._ext
    ctx.zip.file(name, this._blob)
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


class Sound extends ToshModel {
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
    this.ctx.promises.push(f.async('blob').then(blob => {
      this._blob = blob
    }))
  }

  toJSON(ctx) {
    const json = super.toJSON(ctx)
    const id = json.soundID = ctx.highestSoundId++
    const name = id + '.wav'
    ctx.zip.file(name, this._blob)
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
      const ctx = {zip, promises: []}
      const stage = new Stage(json, ctx)
      return Promise.all(ctx.promises).then(() => {
        return stage
      })
    })
  }

  static save(stage) {
    const ctx = {
      zip: new JSZip(),
      sprites: stage.sprites.data,
      highestCostumeId: 0,
      highestSoundId: 0,
    }
    const json = stage.toJSON(ctx)
    //console.log(json)
    const zip = ctx.zip
    zip.file('project.json', JSON.stringify(json, null, '  '))
    return zip
  }
}

module.exports = {Project, Sprite}

