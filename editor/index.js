'use strict'
const RT = require('v2/rt')
const h = require('v2/h')
const {debounce} = require('v2/util')
const View = require('v2/view/view')

const CodeMirror = require('codemirror')
require('codemirror/addon/hint/show-hint')
require('codemirror/addon/scroll/simplescrollbars')
require('codemirror/addon/scroll/annotatescrollbar')
require('codemirror/addon/search/matchesonscrollbar')
require('codemirror/addon/edit/closebrackets')
require('codemirror/addon/edit/matchbrackets')
require('codemirror/addon/search/search')
require('codemirror/addon/search/searchcursor')
require('codemirror/addon/dialog/dialog')
require('codemirror/addon/runmode/runmode')
require('codemirror/keymap/vim')
require('codemirror/keymap/emacs')

class Editor extends View {
  constructor() {
    super()
    this._model = null
    this._layout = this._layout.bind(this)
    this._changed = this._changed.bind(this)
    this.cm = CodeMirror(this.el, this.cmOptions)
  }
  menu() {}
  dblclick() {}

  build() {
    return h('.v2-view.tosh-editor')
  }

  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    // TODO save pending changes
    if (this._model && this.isLive) this._unlisten()
    this._model = value
    if (this.isLive) {
      if (this._model) this._listen()
      this._layout()
      this._changed()
    }
  }
  _onActivate() {
    setTimeout(this._layout)
    if (this._model) this._listen()
  }
  _onDeactivate() {
    this._bb = null
    if (this._model) this._unlisten()
  }

  // TODO bind to sprite
  _listen() {this._model.on('change', this._changed)}
  _unlisten() {this._model.unlisten('change', this._changed)}
  _changed() {
    // TODO this.model.scripts
  }

  resize() { this._layout() }
  _layout() {
    // set container size
    const bb = this.el.parentNode.getBoundingClientRect()
    this.el.style.width = bb.width + 'px'

    // fix layout
    this.cm.refresh()

    // // make sure scrollbar has width (cm.display.barWidth)
    // // otherwise annotations won't appear!
    // this.cm.setOption('scrollbarStyle', 'native');
    // this.cm.setOption('scrollbarStyle', this.cmOptions.scrollbarStyle);
  }

  focus() {
    this.cm.focus()
  }

}

var extraKeys = {
  // 'Ctrl-Space': function(cm) {
  //   if (cm.somethingSelected()) {
  //     cm.replaceSelection(''); // TODO complete on a selection
  //   }
  //   requestHint(cm, true);
  // },
  // 'Tab': function(cm) {
  //   // seek next input
  //   if (inputSeek(cm, +1)) return;

  //   // auto-indent
  //   if (cm.somethingSelected()) {
  //     cm.indentSelection('smart');
  //   }
  // },
  // 'Shift-Tab': function(cm) {
  //   // seek prev input
  //   if (inputSeek(cm, -1)) return;
  // },
};
//extraKeys[Host.isMac ? 'Cmd-F' : 'Ctrl-F'] = 'findPersistent';

Editor.prototype.cmOptions = {
  mode: '',

  indentUnit: 3,
  smartIndent: true,
  tabSize: 3,
  indentWithTabs: true,

  lineWrapping: true,
  dragDrop: false,
  cursorScrollMargin: 80,

  lineNumbers: true,

  cursorHeight: 1,

  undoDepth: NaN,

  extraKeys: extraKeys,

  autoCloseBrackets: true,
  matchBrackets: "()<>[]''\"\"",
  scrollbarStyle: 'simple',
}

module.exports = Editor

