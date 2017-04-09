'use strict'
const h = require('v2/h')
const Collection = require('v2/view/collection')
const View = require('v2/view/view')


class RightLayout extends View {
  init() {
    this._bb = null
  }

  resize() {
    // maintain player's 4:3 aspect ratio
    this.children[0].size = {w: 0, h: 0}
    this._bb = this.el.getBoundingClientRect()
    const w = this._bb.width
    const h = w / 480 * 360
    this.children[0].size = {w, h}
    // adjust height of sprite list

    this.children[1].el.style.top = h + 'px'
    this.children[1].resize()
  }
}


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
  build() {
    return h('.sprite-icon.v2-collection-item', [
      this.nameEl = h('.name'),
    ])
  }

  _update() {
    this.nameEl.textContent = this.model.name
  }
}
SpriteItem.prototype.keyBindings = []
SpriteList.Item = SpriteItem


module.exports = {SpriteList, RightLayout}

