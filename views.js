'use strict'
const Collection = require('v2/view/collection')
//const View = require('v2/view/view')

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


module.exports = {SpriteList}

