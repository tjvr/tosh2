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

  selectRange(i, j, add) {
    for (const k of this._selection) {
      const item = this.itemAtIndex(k)
      if (item) item.selected = false
    }
    this._selection.clear()
    this._selection.add(i)
    const item = this.itemAtIndex(i)
    if (item) item.selected = true
    return this
  }
  clearSelection() {
    return this
  }
}

class SpriteItem extends Collection.Item {
  build() {
    return h('.sprite-icon.v2-collection-item', [
      this.nameEl = h('.name'),
      this.thumbEl = h('.thumb'),
    ])
  }

  _update() {
    const sprite = this.model
    this.nameEl.textContent = sprite.name
    const costume = sprite.costumes.get(sprite.currentCostumeIndex)
    costume._thumbnail.then(thumb => {
      this.thumbEl.style.backgroundImage = 'url(' + JSON.stringify(thumb.src) + ')'
    })
  }
}
SpriteItem.prototype.keyBindings = []
SpriteList.Item = SpriteItem


module.exports = {SpriteList, RightLayout}

