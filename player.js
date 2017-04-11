'use strict'
const h = require('v2/h')
const View = require('v2/view/view')
const emitter = require('v2/emitter')

const {Project} = require('./project')


class Player extends View {
  /* originally based on nathan/phosphorus#b3ba0df */

  init() {
    this.stage = null
    this.scale = 1
    this.isFullScreen = false
    this.sending = false

    this.flag.addEventListener('click', e => this.emit('flag click', e))
    this.pause.addEventListener('click', this.pauseClick.bind(this))
    this.stop.addEventListener('click', this.stopClick.bind(this))
    this.fullScreen.addEventListener('click', this.fullScreenClick.bind(this))

    window.addEventListener('resize', this.updateFullScreen.bind(this))

    document.addEventListener("fullscreenchange", () => {
      if (this.isFullScreen !== document.fullscreen) this.fullScreenClick()
    })
    document.addEventListener("mozfullscreenchange", () => {
      if (this.isFullScreen !== document.mozFullScreen) this.fullScreenClick()
    })
    document.addEventListener("webkitfullscreenchange", () => {
      if (this.isFullScreen !== document.webkitIsFullScreen) this.fullScreenClick()
    })
  }

  build() {
    return h('.v2-view.tosh-preview', {id: 'phosphorus'}, [
      h('.controls', [
        h('.progress-bar'),
        this.stop = h('span.stop'),
        this.pause = h('span.pause'),
        this.flag = h('span.flag', {title: "Shift+click to enable turbo mode."}),
        this.turbo = h('.turbo'),
        //this.smallStageBtn = h('span.small-stage.disabled'),
        this.fullScreen = h('span.full-screen'),
      ]),
      this.player = h('.player'),
    ])
  }

  set size({w, h}) {
    this.player.style.width = w + 'px'
    this.player.style.height = h + 'px'
    this.scale = w / 480
    if (this.stage) {
      console.log(this.scale)
      this.stage.setZoom(this.scale)
      if (!stage.isRunning) {
        this.stage.draw()
      }
    }
  }

  turboClick() {
    stage.isTurbo = !stage.isTurbo
    flag.title = stage.isTurbo ? 'Turbo mode enabled. Shift+click to disable.' : 'Shift+click to enable turbo mode.'
    turbo.style.display = stage.isTurbo ? 'block' : 'none'
  }

  flagClick(e) {
    if (!this.stage) return
    if (e.shiftKey) {
      this.turboClick()
    } else {
      this.stage.start()
      this.pause.className = 'pause'
      this.stage.stopAll()
      this.stage.triggerGreenFlag()
    }
    this.stage.focus()
    e.preventDefault()
  }

  pauseClick(e) {
    if (!this.stage) return
    if (this.stage.isRunning) {
      this.stage.pause()
      this.pause.className = 'play'
    } else {
      this.stage.start()
      this.pause.className = 'pause'
    }
    this.stage.focus()
    e.preventDefault()
  }

  stopClick(e) {
    if (!this.stage) return
    this.stage.start()
    this.pause.className = 'pause'
    this.stage.stopAll()
    this.stage.focus()
    e.preventDefault()
  }

  fullScreenClick(e) {
    if (e) e.preventDefault()
    if (!this.stage) return
    document.documentElement.classList.toggle('fs')
    this.isFullScreen = !this.isFullScreen
    if (!e || !e.shiftKey) {
      if (this.isFullScreen) {
        var el = document.documentElement
        if (el.requestFullScreenWithKeys) {
          el.requestFullScreenWithKeys()
        } else if (el.webkitRequestFullScreen) {
          el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT)
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen()
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen()
        }
      }
    }
    if (!this.isFullScreen) {
      document.body.style.width =
      document.body.style.height =
      document.body.style.marginLeft =
      document.body.style.marginTop = ''
    }
    // TODO update App
    this.updateFullScreen()
    if (!this.stage.isRunning) {
      this.stage.draw()
    }
    this.stage.focus()
  }

  exitFullScreen(e) {
    if (this.isFullScreen && e.keyCode === 27) {
      this.fullScreenClick(e)
    }
  }

  updateFullScreen() {
    if (!this.stage) return
    if (this.isFullScreen) {
      window.scrollTo(0, 0)
      var padding = 8
      var w = window.innerWidth - padding * 2
      var h = window.innerHeight - padding - controls.offsetHeight
      w = Math.min(w, h / .75)
      h = w * .75 + controls.offsetHeight
      document.body.style.width = w + 'px'
      document.body.style.height = h + 'px'
      document.body.style.marginLeft = (window.innerWidth - w) / 2 + 'px'
      document.body.style.marginTop = (window.innerHeight - h - padding) / 2 + 'px'
      this.stage.setZoom(w / 480)
    } else {
      this.stage.setZoom(this.scale)
      if (!stage.isRunning) {
        this.stage.draw()
      }
    }
  }

  syncBack() {
    if (!this.stage) return
    const scriptables = [this.stage].concat(this.stage.children)
    for (const s of scriptables) {
      if (!(s.isStage || s.isSprite)) continue
      // } else if (s.target) { // TODO watchers?
      if (s.isClone) continue
      const t = s._tosh
      for (const v of t.variables) {
        v.value = s.vars[s.name] || v.value
      }
      for (const l of t.lists) {
        l.value = s.lists[s.listName] ? s.lists[s.listName].contents : l.value
      }
      t.currentCostumeIndex = s.currentCostumeIndex
      if (s.isStage) {
        t.tempoBPM = s.tempoBPM
      } else {
        t.scratchX = s.scratchX
        t.scratchY = s.scratchY
        t.direction = s.direction
        t.rotationStyle = s.rotationStyle
        t.visible = s.visible
      }
    }
  }

  sendProject(project, start=true) {
    if (this.stage) {
      this.stage.stopAll()
      this.stage.pause()
    }
    if (this.sending) {
      // TODO cancel in-flight request?
    } else {
      this.syncBack()
    }

    // send phosphorus the zip object
    const zip = Project.save(project)
    const request = P.IO.loadSB2Project(zip)
    if (request.isError) {
      console.error(request.result)
      return
    }

    // save list of children, in case it changes _while the project is loading_
    // nb. phosphorus doesn't support list watchers
    const children = project.children.filter(o => !!o.objName)

    this._loadProject(request, stage => {
      // save info for sync
      stage._tosh = project
      for (var i=0; i<stage.children.length; i++) {
        const s = stage.children[i]
        if (s.isSprite) s._tosh = children[i]
      }

      stage.handleError = function(e) {
        console.error(e.stack || e)
      }
      if (start) {
        stage.focus()
        stage.triggerGreenFlag()
      }
    })
  }

  _loadProject(request, cb) {
    var stage = this.stage
    while (this.player.firstChild) this.player.removeChild(this.player.lastChild)
    this.pause.className = 'pause'

    request.onload = stage => {
      window.stage = this.stage = stage
      var isTurbo = stage ? stage.isTurbo : false
      stage.start()
      stage.isTurbo = isTurbo
      this.updateFullScreen()

      stage.root.addEventListener('keydown', this.exitFullScreen.bind(this))

      this.player.appendChild(stage.root)
      if (cb) {
        cb(stage)
        cb = null
      }
    }
    request.onerror = function(e) {
      console.error(e.stack)
    }

    // sometimes the project IO has already loaded!
    if (request.isDone) {
      if (request.isError) {
        console.error(request.result)
        return
      }
      request.onload(request.result)
    }
  }

}
emitter(Player)
module.exports = Player
