'use strict'
const itt = require('itt')

require('v2/polyfill-pad')
//const bind = require('v2/bind')
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
const MenuBar = require('v2/view/menu-bar')

const {Project} = require('./project')
const {SpriteList} = require('./views')
const Editor = require('./editor')


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

  get project() { return this._project }
  set project(stage) {
    this._project = stage
    spriteList.model = stage.sprites
  }
}

const spriteList = new SpriteList
window.addEventListener('resize', debounce(5, () => spriteList.resize.bind(spriteList)))

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

app.add(spriteList)

let editor = new Editor
app.add(editor)

// TODO Split

