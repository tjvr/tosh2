'use strict'
const h = require('v2/h')
const View = require('v2/view/view')


class Player extends View {
  /* originally based on nathan/phosphorus#b3ba0df */

  init() {
    this._stage = null
    this.isFullScreen = false
    this.flag.addEventListener('click', this.flagClick.bind(this))
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

  get stage() { return this._stage }

  build() {
    return h('.v2-view.tosh-preview', [
      h('.controls', [
        h('.progress-bar'),
        this.stop = h('span.stop'),
        this.pause = h('span.pause'),
        this.flag = h('span.flag', {title: "Shift+click to enable turbo mode."}),
        this.turbo = h('.turbo'),
        this.smallStageBtn = h('span.small-stage.disabled'),
        this.fullScreen = h('span.full-screen'),
      ]),
      this.player = h('.player'),
    ])
  }

  set size({w, h}) {
    this.player.style.width = w + 'px'
    this.player.style.height = h + 'px'
  }

  turboClick() {
    stage.isTurbo = !stage.isTurbo
    flag.title = stage.isTurbo ? 'Turbo mode enabled. Shift+click to disable.' : 'Shift+click to enable turbo mode.'
    turbo.style.display = stage.isTurbo ? 'block' : 'none'
  }

  flagClick(e) {
    // TODO send event to App
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
    if (!isFullScreen) {
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
    if (isFullScreen && e.keyCode === 27) {
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
      // TODO set zoom value
      this.stage.setZoom(1)
      if (!stage.isRunning) {
        this.stage.draw()
      }
    }
  }

  // TODO
  loadProject(request, cb) {
    var stage = this.stage
    if (stage) {
      // TODO is this duplicated in app.js?
      stage.stopAll()
      stage.pause()
    }
    while (this.player.firstChild) this.player.removeChild(this.player.lastChild)
    this.pause.className = 'pause'

    request.onload = stage => {
      window.stage = this.stage = stage
      var isTurbo = stage ? stage.isTurbo : false
      stage.start()
      stage.isTurbo = isTurbo
      this.updateFullScreen()

      stage.root.addEventListener('keydown', exitFullScreen)

      this.player.appendChild(stage.root)
      if (cb) {
        cb(stage)
        cb = null
      }
    }
    request.onerror = function(e) {
      console.error(e.stack)
    }

    // sometimes the project is already loaded!
    if (request.isDone) {
      if (request.isError) {
        console.error(request.result)
        return
      }
      request.onload(request.result)
    }
  }


  /*
  // TODO transition to small stage when window is too small

  var smallStageBtn = document.querySelector('.small-stage')
  smallStageBtn.addEventListener('click', App.smallStage.toggle)

  var MIN_WIDTH = 1000
  var MIN_HEIGHT = 508
  var windowTooSmall = windowSize.compute(function(size) {
    return (size.width < MIN_WIDTH || size.height < MIN_HEIGHT)
  })
  windowTooSmall.subscribe(function(tooSmall) {
    if (tooSmall) App.smallStage.assign(true)
    if (tooSmall) {
      smallStageBtn.classList.add('disabled')
    } else {
      smallStageBtn.classList.remove('disabled')
    }
  })
  */

}


module.exports = Player

