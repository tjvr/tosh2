'use strict'
const h = require('v2/h')
const Collection = require('v2/view/collection')
const View = require('v2/view/view')
const emitter = require('v2/emitter')


class RightLayout extends View {
  init() {
    this._bb = null
  }
  build() {
    return h('.v2-view.tosh-player-wrap')
  }

  resize() {
    // maintain player's 4:3 aspect ratio
    this.children[0].size = {w: 0, h: 0}
    this._bb = this.el.getBoundingClientRect()
    const w = this._bb.width
    const h = w / 482 * 362
    this.children[0].size = {w, h}
    // adjust height of sprite list

    this.children[1].el.style.top = (h + 30) + 'px'
    this.children[1].resize()
  }
}


class SpriteList extends Collection {
  constructor() {
    super()
    this.setTileSize(96, 96)
    this._active = null
  }

  get model() { return super.model }
  set model(value) {
    super.model = value
    const index = value.length > 1 ? 1 : 0
    this.selectRange(index, index, true)
  }

  build() {
    const el = super.build()
    el.classList.add('tosh-sprites')
    return el
  }

  selectRange(i, j, add) {
    var oldValue
    for (const k of this._selection) {
      const item = this.itemAtIndex(k)
      if (item) item.selected = false
      oldValue = this.model.get(k)
    }
    this._selection.clear()
    this._selection.add(i)
    const item = this.itemAtIndex(i)
    if (item) item.selected = true
    let value = this.model.get(i)
    this.emit('selection change', {target: this, value, oldValue})
    return this
  }
  clearSelection() {
    return this
  }
}
emitter(SpriteList)

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

