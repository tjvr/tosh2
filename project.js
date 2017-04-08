const Model = require('v2/model/model')
const List = require('v2/model/list')


class Scriptable extends Model {
  constructor(o) {
    super(o)
    //this._scripts = new List([])
  }

  //get scripts() { return this._scripts }
}
Scriptable._property('objName')


class Stage extends Model {
  constructor(o) {
    super(o)
    this._sprites = new List
  }
  /*
  get children() { return this._children }
  set children(xs) { this._children.data(xs) }
  */

  get sprites() { return this._sprites }
  set sprites(xs) { this._sprites.data = xs.map(o => new Sprite(o)) }
}

class Sprite extends Scriptable {
}

/*
class Project extends Model {
  constructor(stage, children, sprites) {
    super({}, true)
    this.stage = stage
    this.children = children
    this.sprites = sprites
    this._fileName = ''
    if (Object.freeze) Object.freeze(this)
  }

  static create() {
    var sprite = Sprite.create()
    return new Project(Stage.create(), [sprite], [sprite])
  }

  static load(zip) {
    var json = P.IO.parseJSONish(zip.file('project.json').asText())
    return this.fromJSON(json, zip)
  }

  static fromJSON(json, zip) {
    Object.assign({
      scripts: [],
      scriptComments: [],
    }, json)
  }

  save() {
    var zip = new JSZip()
    zip._highestCostumeId = 0
    zip._highestSoundId = 0
    var json = this.toJSON(zip)
    zip.file('project.json', JSON.stringify(json))
    delete zip._highestCostumeId
    delete zip._highestSoundId
    return zip
  }

  toJSON(zip) {
    var children = this.children.map((child, index) => {
      var json = child.toJSON(zip)
      if (child instanceof Sprite) {
        json.indexInLibrary = this.sprites.indexOf(child)
      }
      return json
    })

    return Object.assign(this.stage.toJSON(zip), {
      children: children,

      penLayerMD5: '5c81a336fab8be57adc039a8a2b33ca9.png',
      penLayerID: 0,
      tempoBPM: 60,
      videoAlpha: 0.5,

      info: {
        videoOn: false,
        spriteCount: this.sprites.length,
        scriptCount: sum([this.stage].concat(this.sprites).map(s => s.scripts.length)),
      },
    })
  }
}


class Scriptable extends Model {
  get isStage() { return false }
  get name() { return this.objName }

  static fromJSON(json, zip) {
    var sortedScripts = (json.scripts || []).slice()
    sortedScripts.sort(function(a, b) {
      var ax = a[0], ay = a[1], bx = b[0], by = b[1]
      return ay > by ? +1 : ay < by ? -1
           : ax > bx ? +1 : ax < bx ? -1 : 0
    })

    return new this(Object.assign({
      currentCostumeIndex: 0,
    }, json, {
      scripts: sortedScripts.map(Script.fromJSON),
      scriptComments: [], // TODO: comments
      variables: json.variables ? json.variables.map(Variable.fromJSON) : [],
      lists: json.lists ? json.lists.map(List.fromJSON) : [],
      costumes: json.costumes ? json.costumes.map(json => Costume.fromJSON(json, zip)) : [],
      sounds: json.sounds ? json.sounds.map(json => Sound.fromJSON(json, zip)) : [],
    }))
  }

  static defaultJSON() {
    return {
      scripts: [],
      scriptComments: [],

      variables: [],
      lists: [],

      costumes: [],
      currentCostumeIndex: 0,
      sounds: [],
    }
  }

  rename(name) {
    return new Scriptable(Object.assign({}, this, { objName: name }))
  }
}

class Stage extends Scriptable {
  get isStage() { return true }

  static create() {
    return new Stage(Object.assign(Scriptable.defaultJSON(), {
      objName: 'Stage',
      costumes: [Costume.defaultBackdrop()],
    }))
  }
}

class Sprite extends Scriptable {
  static create() {
    return new Sprite(Object.assign(Scriptable.defaultJSON(), {
      objName: 'turtle',
      costumes: [Costume.defaultCostume()],

      scratchX: 0,
      scratchY: 0,
      scale: 1,
      direction: 90,
      rotationStyle: 'normal',
      isDraggable: false,
      visible: true,
      spriteInfo: {},
    }))
  }
}


class Variable extends Model {
  static create(name) {
    return new Variable({
      name: name,
      value: 0,
      isPersistent: false,
    })
  }

  rename(name) {
    return new Variable(Object.assign({}, this, { name: name }))
  }
}

class List extends Model {
  get name() { return this.listName }

  static create(name) {
    return new List({
      listName: name,
      contents: [],
      isPersistent: false,
      x: 5,
      y: 5,
      width: 102,
      height: 202,
      visible: false,
    })
  }

  rename(name) {
    return new List(Object.assign({}, this, { listName: name }))
  }
}


class Media extends Model {
}

class Sound extends Media {
  get name() { return this.name }

  // TODO
  static audioFromFile(ext, binary) {
    assert(ext === 'wav')
    var audio = new Audio
    audio.src = 'data:audio/' + ext + ';base64,' + btoa(binary)
    audio.controls = true
    return audio
  }

  static fromJSON(json, zip) {
    // TODO
  }

  toJSON(zip) {
    // TODO
  }
}

class Costume extends Media {
  get name() { return this.costumeName }

  static create(name, ext, ab) {
    var c = new Costume({
      costumeName: name,
      _ext: ext,
      _file: ab,
      baseLayerMD5: '',
      bitmapResolution: 1,
      rotationCenterX: 0,
      rotationCenterY: 0,
      _thumbnail: Thumbnail.loadFile(ext, arrayBufferToBinary(ab)),
    })
    c._thumbnail.then(t => {
      costume.rotationCenterX = t.width / 2
      costume.rotationCenterY = t.height / 2
    })
  }

  static fromJSON(json, zip) {
    var ext = json.baseLayerMD5.split('.').pop()
    var root = json.baseLayerID + '.'
    var f = zip.file(root + ext)
    if (!f) { ext = 'png'; f = zip.file(root + ext) }
    if (!f) { ext = 'jpg'; f = zip.file(root + ext) }
    if (!f) { ext = 'svg'; f = zip.file(root + ext) }
    if (!f) throw "Couldn't find image: " + root + ext

    // TODO load textLayer too

    return new Costume(Object.assign({}, json, {
      baseLayerID: undefined,
      _ext: ext,
      _file: f.asArrayBuffer(),
      _thumbnail: Thumbnail.fromFile(ext, f.asBinary()),
    }))
  }

  toJSON(zip) {
    var json = Object.assign(super.toJSON(zip), {
      baseLayerID: zip._highestCostumeId++,
    })

    var filename = json.baseLayerID + '.' + this._ext
    zip.file(filename, this._file)

    return json
  }

  rename(name) {
    return new Costume(Object.assign({}, this, { name: name }))
  }

  static defaultBackdrop() {
    return new Costume({
      name: 'backdrop1',
      ext: 'svg',
      file: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='480px' height='360px'><path fill='#ffffff' d='M 0 0 L 480 0 L 480 360 L 0 360 Z' /></svg>",
      bitmapResolution: 1,
      rotationCenterX: 240,
      rotationCenterY: 180,
      _thumbnail: Future.withResult(new Thumbnail(480, 360, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAA6ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iPgogICAgICAgICA8eG1wOk1vZGlmeURhdGU+MjAxNi0wMS0yNVQyMTowMToyMjwveG1wOk1vZGlmeURhdGU+CiAgICAgICAgIDx4bXA6Q3JlYXRvclRvb2w+UGl4ZWxtYXRvciAzLjQuMjwveG1wOkNyZWF0b3JUb29sPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpDb21wcmVzc2lvbj41PC90aWZmOkNvbXByZXNzaW9uPgogICAgICAgICA8dGlmZjpSZXNvbHV0aW9uVW5pdD4yPC90aWZmOlJlc29sdXRpb25Vbml0PgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj43MjwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6WFJlc29sdXRpb24+NzI8L3RpZmY6WFJlc29sdXRpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj40PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4zPC9leGlmOlBpeGVsWURpbWVuc2lvbj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+Ci3MB8YAAAAVSURBVAgdY/z//z8DDDDBGCAahQMAby0DAwzQlZYAAAAASUVORK5CYII=")),
    })
  }

  static defaultCostume() {
    Sprite.TURTLE = new Costume({
      name: 'turtle',
      ext: 'svg',
      file: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='25px' height='20px'><path style='fill:#007de0;stroke:#033042;stroke-width:1;stroke-linejoin:round;' d='M 0,0 20,8 0,16 6,8 Z' /></svg>",
      bitmapResolution: 1,
      rotationCenterX: 8,
      rotationCenterY: 8,
      _thumbnail: Future.withResult(new Thumbnail(25, 20, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAUCAYAAAB4d5a9AAABTElEQVQ4T2NkMnT5xcDI/JWBmWXmvy+fJjJcP/ycgcqAkckiIPM/n3wbg4AiB+P9Pf8ZGRhP//31uZvh4oEt1LKLEWQQo0XQRga1ANf/8nacDC8vMjDd3fmR4f3d/9TyHdgSEGAy8Xr9z75JhIFLBCLw4wMD48MDP6jhO7glDIZO8kysvFf+uU/kwQgmCn2HsATkG1D8CKq2/DfJFsIaH2T6DsUSjPjBF/Mk+A7DEqzxg88yJN/9//fn3v+zO3TQlVPHkgf7fzI+2PuP4d/fe//ObidsCTg5qwe4/Jez48KbTyDB9Ynhw91/DEz4MzJmxAuotvw3xRPxUFeTkmlJScJEuRqb7/FnRjJcjdMSlHggIayJLdsgBSQvqIBU4ASlEFLCmnhLQEU9E/NXQimEWAOxB5e+gw81i3W8EU+JSwnpxZrjCWkiVZ4ulgAAfsb6FdvZrw8AAAAASUVORK5CYII=")),
    })
  }
}


class Thumbnail {
  constructor(width, height, src) {
    this.width = width
    this.height = height
    this.src = src
  }

  static getImageSrc(ext, binary, cb) {
    if (ext === 'jpg') ext = 'jpeg'
    if (ext === 'svg') {
      var canvas = el('canvas')
      canvg(canvas, binary, {
      renderCallback: function() {
        cb(canvas.toDataURL('image/png'))
      }})
    } else {
      cb('data:image/' + ext + ';base64,' + btoa(binary))
    }
  }

  static fromFile(ext, binary) {
    return new Future(resolve => {
      this.getImageSrc(ext, binary).then(src => {
        var image = new Image

        image.src = src
        image.addEventListener('load', poll)
        poll()

        var timeout
        function poll() {
          if (image.naturalWidth) {
            clearTimeout(timeout)
            resolve(new Thumbnail(width, height, src))
          } else {
            timeout = setTimeout(poll, 100)
          }
        }
      })
    })
  }
}

*/


const blank = {
	"objName": "Stage",
	"costumes": [{
			"costumeName": "backdrop1",
			"baseLayerID": 2,
			"baseLayerMD5": "b61b1077b0ea1931abee9dbbfa7903ff.png",
			"bitmapResolution": 2,
			"rotationCenterX": 480,
			"rotationCenterY": 360
		}],
	"currentCostumeIndex": 0,
	"penLayerMD5": "5c81a336fab8be57adc039a8a2b33ca9.png",
	"penLayerID": 0,
	"tempoBPM": 60,
	"videoAlpha": 0.5,
	"children": [{
			"objName": "Sprite1",
			"costumes": [{
					"costumeName": "turtle",
					"baseLayerID": 1,
					"baseLayerMD5": "4c8c8b562674f070b5a87b91d58d6e39.svg",
					"bitmapResolution": 1,
					"rotationCenterX": 2,
					"rotationCenterY": 0
				}],
			"currentCostumeIndex": 0,
			"scratchX": 0,
			"scratchY": 0,
			"scale": 1,
			"direction": 90,
			"rotationStyle": "normal",
			"isDraggable": false,
			"indexInLibrary": 1,
			"visible": true,
			"spriteInfo": {
			}
		}],
	"info": {
		"swfVersion": "v436",
		"spriteCount": 1,
		"flashVersion": "MAC 17,0,0,188",
		"videoOn": false,
		"scriptCount": 0
	}
}

//const project = new Stage(blank)

module.exports = {Sprite}
