import Mergable from 'src/mergable'
import undraw from 'src/undraw'
import { Store } from 'svelte/store'
import uuid from 'uuid/v4'
import { getMeta, loadFile, saveFile } from 'src/drive'

const stampsLengts = undraw.length

class StampStore extends Store {
  constructor (init) {
    super(init)
    this.reset()
  }

  updateCanvas () {
    const tracker = this.get('tracker')
    this.set({canvas: Object.entries(tracker).map(entry => entry[1]).filter(item => item.stampId)})
  }

  addStamp (stamp) {
    const tracker = this.get('tracker')
    const stampId = uuid()
    stamp.stampId = stampId

    tracker[stampId] = stamp
    tracker.commit()
    this.set({dirty: true})
    this.updateCanvas()
  }

  updatePos (stampId, ox, oy) {
    const tracker = this.get('tracker')
    const stamp = tracker[stampId]
    if (stamp) {
      console.log(JSON.stringify(stamp))
      stamp.top = stamp.top + oy
      stamp.left = stamp.left + ox
      tracker.commit()
      this.set({dirty: true})
      this.updateCanvas()
    }
  }

  getRandomStamp () {
    const index = Math.floor(Math.random() * stampsLengts)
    return undraw[index]
  }

  updateFile (newFile) {
    console.log(`[file updated] ${newFile}`)
    const file = this.get('file')
    this.set({file: Object.assign(file, newFile)})
    return this.get('file')
  }

  reset (response = {}) {
    const tracker = new Mergable(response)
    this.set({
      dirty: false,
      canvas: [],
      tracker: tracker
    })
    tracker.commit('initial')
    this.updateCanvas()
  }

  load () {
    return loadFile(this.get('file')).then(response => this.reset(response))
  }

  merge () {
    const oldTracker = this.get('tracker')
    return this.load().then(() => {
      const currentTracker = this.get('tracker')
      currentTracker.merge(oldTracker)
      this.updateCanvas()
    })
  }

  _save () {
    const obj = Object.assign({}, this.get('tracker'))
    const doc = JSON.stringify(obj)
    const file = this.get('file')
    return saveFile(file, doc).then(result => this.updateFile(result)).then(() => this.reset(obj))
  }

  refresh () {
    const file = this.get('file')
    return getMeta(file).then(driveFile => {
      if (driveFile.headRevisionId !== file.headRevisionId) {
        this.updateFile(driveFile)
        return this.merge(file).then(() => true)
      } else {
        return false
      }
    })
  }

  save () {
    const file = this.get('file')

    if (file.id) {
      return this.refresh().then((didRefresh) => didRefresh ? this.save() : this._save())
    } else {
      return this._save()
    }
  }
}

export default new StampStore({
  signInStatus: false,
  gapiLoaded: false,
  file: {
    editable: true,
    mimeType: 'application/json'
  }
})
