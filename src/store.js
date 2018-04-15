import Mergable from 'src/mergable'
import undraw from 'src/undraw'
import { Store } from 'svelte/store'
import uuid from 'uuid/v4'
import { loadFile, saveFile } from 'src/drive'

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
      this.updateCanvas()
    }
  }

  getRandomStamp () {
    const index = Math.floor(Math.random() * stampsLengts)
    return undraw[index]
  }

  updateFile (newFile) {
    console.log(newFile)
    const file = this.get('file')
    this.set({file: Object.assign(file, newFile)})
    return this.get('file')
  }

  reset () {
    this.set({
      canvas: [],
      tracker: new Mergable()
    })
  }

  load () {
    return loadFile(this.get('file')).then(response => {
      this.set({
        tracker: new Mergable(response)
      })
      this.updateCanvas()
    })
  }

  save () {
    const doc = JSON.stringify(this.get('tracker'))
    const file = this.get('file')
    return saveFile(file, doc).then(result => this.updateFile(result))
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
