
const itt = require('itt')

require('v2/polyfill-pad')
const bind = require('v2/bind')
//const emitter = require('v2/emitter')
//const {key, modifiers} = require('v2/format')
const fs = require('v2/fs') // {zip}
const h = require('v2/h')
const path = require('v2/path') // {basename, ext}
//const request = require('v2/request')
const rt = require('v2/rt') // {platform, type, chooseFile, saveFile, isApple}
const {debounce, toJSON, ucfirst, wrapBlob} = require('v2/util')
const Model = require('v2/model/model')
const List = require('v2/model/list')

const App = require('v2/view/app')
const Collection = require('v2/view/collection')
const MenuBar = require('v2/view/menu-bar')
const View = require('v2/view/view')

const {Project} = require('./project')

class ToshApp extends App {
  constructor() {
    super()
    this.project = Project.create()
    this.name = 'tosh.sb2'
  }

  openProject() {
    rt.chooseFile('.sb2').then(file => {
      this.name = path.basename(file.name)
      JSZip.loadAsync(file)
      .then(Project.load)
      .then(stage => {
        this.project = stage
        console.log(stage)
        this.saveProject()
      })
    })
  }

  importProject() {
    // TODO
  }

  saveProject() {
    const zip = Project.save(this.project)
    zip.generateAsync({type: 'blob'}).then(blob => {
      rt.saveFile(blob, this.name)
    })
  }

  openHelp() {
    openInTab('/help/')
  }
}

const app = new ToshApp
app.mount(document.body)

function open(url) {
  window.location.href = url
}
function openInTab(url) {
  h('a', {href: url, target: '_blank'}).click()
}
function *globalBindings(m) {
  if (!m) return
  if (m.key) {
    yield {key: m.key, command: m.action}
  }
  if (m.menu) yield* globalBindings(m.menu)
  if (m.children) {
    for (const item of m.children) {
      yield* globalBindings(item)
    }
  }
}

const mb = new MenuBar
mb.target = app
mb.spec = [
  ['Tosh', () => open('/')],
  ['File', [
    ['Open', 'openProject', {key: '#o'}],
    ['Import from Scratch…', 'importProject', {key: '#i', enabled: false}],
    ['Save', 'saveProject', {key: '#s'}],
  ]],
  ['Help', [
    ['Guide', () => openInTab('/help/guide/')],
    ['Tips', () => openInTab('/help/tips/')],
    ['List of Blocks', () => openInTab('/help/blocks/')],
    '-',
    ['Send Feedback', () => open('mailto:tim@tjvr.org')],
  ]],
]
app.keyBindings = Array.from(globalBindings(mb))
app.keyBindings.push({
  key: 'F1', command: 'openHelp'
})
app.add(mb)


class SpriteList extends Collection {
  constructor() {
    super()
    this.setTileSize(96, 96)
  }

  build() {
    const el = super.build()
    el.classList.add('tosh-sprites')
    return el
  }
}

class SpriteItem extends Collection.Item {
  _update() {
    this.el.textContent = this.model.objName
  }
}
SpriteItem.prototype.keyBindings = []
SpriteList.Item = SpriteItem

const {Sprite, project} = require('./project')

const sprites = new List([
  new Sprite({objName: 'sprite1'}),
  new Sprite({objName: 'sprite2'}),
  new Sprite({objName: 'sprite3'}),
  new Sprite({objName: 'sprite4'}),
  new Sprite({objName: 'sprite5'}),
  new Sprite({objName: 'sprite6'}),
  new Sprite({objName: 'sprite7'}),
])
const spriteList = new SpriteList
spriteList.model = sprites

app.add(spriteList)
window.spriteList = spriteList
window.addEventListener('resize', debounce(5, () => spriteList.resize.bind(spriteList)))

// TODO Split

