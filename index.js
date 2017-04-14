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
const Menu = require('v2/view/menu')
const MenuBar = require('v2/view/menu-bar')
const Split = require('v2/view/split')
const UndoManager = require('v2/undo-manager')

const Project = require('./format')
const {SpriteList, RightLayout} = require('./views')
const Editor = require('./editor')
const Player = require('./player')


// fix saveFile
if (typeof window.requestIdleCallback !== 'function') {
  window.requestIdleCallback = cb => setTimeout(cb, 300)
}


function open(url) {
  window.location.href = url
}
function openInTab(url) {
  // TODO avoid Firefox pop-up blocker
  h('a', {href: url, target: '_blank', rel: 'noopener'}).click()
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
    this.name = 'tosh.sb2'
    this.project = Project.create()
    this.active = null
  }

  set project(stage) {
    super.project = stage
    this.active = null
  }
}
Root._property('name')
Root._property('project')
Root._property('active')


class ToshApp extends App {
  constructor() {
    super()
    this.model = new Root
  }

  openProject() {
    rt.chooseFile('.sb2').then(file => {
      this.model.name = path.basename(file.name)
      Project.loadZipFile(file)
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
    editor.compile()
    const zip = Project.save(this.model.project)
    const blob = zip.generate({type: 'blob'})
    rt.saveFile(blob, this.model.name, {
      type: 'application/octet-stream',
    })
  }

  flagClick() {
    editor.compile()
    player.sendProject(this.model.project)
  }

  leavePlayer() {
    player.pauseClick()
    editor.focus()
  }

  openHelp() {
    openInTab('/help/')
  }
}

const app = window.app = new ToshApp
app.mount(document.body)

const um = window.um = new UndoManager
ToshApp.prototype.undo = um.undo.bind(um)
ToshApp.prototype.redo = um.redo.bind(um)
um.watch(app.model, 'project')
um.watch(app.model, 'name')

const spriteList = new SpriteList
spriteList.on('selection change', e => {
  app.model.active = e.value
})

const mb = new MenuBar({
  target: app,
  spec: [
    ['tosh', () => open('/')],
    ['File', [
      ['Open', 'openProject', {key: '#o'}],
      ['Import from Scratch…', 'importProject', {key: '#i', enabled: false}],
      ['Save', 'saveProject', {key: '#s'}],
    ]],
    ['Edit', {menu: () => new Menu({spec: [
      [um.canUndo ? `Undo ${um.undoName}` : 'Undo', 'undo', {key: '#z', enabled: um.canUndo}],
      [um.canRedo ? `Redo ${um.redoName}` : 'Redo', 'redo', {key: rt.isMac ? '^#Z' : '#y', enabled: um.canRedo}],
    ]})}],
    ['Project', {menu: () => new Menu({spec: [
      ['Run', 'flagClick', {key: '#Enter', enabled: true}],
      ['Stop', 'leavePlayer', {key: 'Escape', enabled: player.isRunning}],
    ]})}],
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
app.keyBindings = app.keyBindings.concat([
  {key: 'F1', command: 'openHelp'},
  {key: '#z', command: 'undo'},
  {key: '^#Z', command: 'redo'},
  {key: '#y', command: 'redo'},
  {key: '#Enter', command: 'flagClick'},
  {key: 'Escape', command: 'leavePlayer'},
])
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
app.model.on('project change', e => {
  spriteList.model = app.model.project.sprites
})
// TODO why is setTimeout needed
setTimeout(() => {
  spriteList.model = app.model.project.sprites
})

player.on('flag click', e => app.flagClick())

app.model.on('active change', e => {
  editor.model = app.model.active
})

