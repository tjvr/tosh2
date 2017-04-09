'use strict'
const itt = require('itt')

const bind = require('v2/bind')
const fs = require('v2/fs') // {zip}
const h = require('v2/h')
const path = require('v2/path') // {basename, ext}
//const request = require('v2/request')
const rt = require('v2/rt') // {platform, type, chooseFile, saveFile, isApple}
const {debounce, toJSON, ucfirst, wrapBlob} = require('v2/util')

const Model = require('v2/model/model')
const App = require('v2/view/app')
const MenuBar = require('v2/view/menu-bar')
const Split = require('v2/view/split')
const UndoManager = require('v2/undo-manager')

const {Project} = require('./project')
const {SpriteList, RightLayout} = require('./views')
const Editor = require('./editor')
const Player = require('./player')


function open(url) {
  window.location.href = url
}
function openInTab(url) {
  // TODO avoid pop-up blocker
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


class Root extends Model {
  constructor() {
    super()
    this.project = Project.create()
    this.name = 'tosh.sb2'
  }
}
Root._property('project')
Root._property('name')


class ToshApp extends App {
  constructor() {
    super()
    this.model = new Root
  }

  openProject() {
    rt.chooseFile('.sb2').then(file => {
      this.model.name = path.basename(file.name)
      JSZip.loadAsync(file)
      .then(Project.load)
      .then(stage => {
        this.model.project = stage
        console.log(stage)
      })
    })
  }

  importProject() {
    // TODO
  }

  saveProject() {
    const zip = Project.save(this.model.project)
    zip.generateAsync({type: 'blob'}).then(blob => {
      rt.saveFile(blob, this.model.name)
    })
  }

  openHelp() {
    openInTab('/help/')
  }
}

const spriteList = new SpriteList

const app = window.app = new ToshApp
app.mount(document.body)

const um = window.um = new UndoManager
ToshApp.prototype.undo = um.undo.bind(um)
ToshApp.prototype.redo = um.redo.bind(um)
um.watch(app.model)

const undoItem = new MenuBar.Item({title: 'Undo', action: 'undo', key: '#z'})
const redoItem = new MenuBar.Item({title: 'Redo', action: 'redo', key: rt.isMac ? '^#z' : '#y'})

setInterval(() => {
  undoItem.title = um.canUndo ? `Undo ${itt.last(um._past).name}` : 'Undo'
  undoItem.enabled = um.canUndo
  redoItem.title = um.canRedo ? `Redo ${itt.last(um._future).name}` : 'Redo'
  redoItem.enabled = um.canRedo
}, 100)

const mb = new MenuBar({
  target: app,
  spec: [
    ['Tosh', () => open('/')],
    ['File', [
      ['Open', 'openProject', {key: '#o'}],
      ['Import from Scratch…', 'importProject', {key: '#i', enabled: false}],
      ['Save', 'saveProject', {key: '#s'}],
    ]],
    ['Edit', [
      undoItem,
      redoItem,
    ]],
    ['Help', [
      ['Guide', () => openInTab('/help/guide/')],
      ['Tips', () => openInTab('/help/tips/')],
      ['List of Blocks', () => openInTab('/help/blocks/')],
      '-',
      ['Send Feedback', () => open('mailto:tim@tjvr.org')],
    ]],
  ],
})
app.keyBindings = Array.from(globalBindings(mb))
app.keyBindings.push({
  key: 'F1', command: 'openHelp'
})
app.add(mb)

class ToshSplit extends Split {
  _layout() {
    super._layout()
    this.resizeChildren()
  }
  resizeChildren() {
    for (const pane of this.panes) {
      pane.resize()
    }
  }
}

const player = new Player

const right = new RightLayout
right.add(player)
right.add(spriteList)

const editor = new Editor

const split = new ToshSplit
split.addPane(editor)
split.addPane(right)
app.add(split)

right.resize()
window.addEventListener('resize', split.resizeChildren.bind(split))

//bind(spriteList, 'model', app.model, 'project.sprites')
spriteList.model = app.model.project.sprites
app.model.on('project change', e => {
  spriteList.model = app.model.project.sprites
})
