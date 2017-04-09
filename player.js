'use strict'
const h = require('v2/h')
const View = require('v2/view/view')


class Player extends View {
  build() {
    return h('.v2-view.tosh-player')
  }

  set size({w, h}) {
    this.el.style.width = w + 'px'
    this.el.style.height = h + 'px'
  }
}

module.exports = Player

