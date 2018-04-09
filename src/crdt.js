import uuid from 'uuid/v4'

const SET_VAL = 'setVal'
const SET_REF = 'setRef'
const CREATE = 'create'

class Logger {
  constructor () {
    this[CREATE] = []
    this[SET_VAL] = []
    this[SET_REF] = []
  }

  add (objectId, type, prop, value) {
    this[type].push({objectId, prop, value})
  }
}

export default class Mergable {
  constructor (data = {}) {
    this.log = new Logger()
    this.objectIndex = {}
    this.$ = this.wrapObject(data)
  }

  get setHandler () {
    return {
      set: (obj, prop, value) => {
        let newVal = value
        if (obj._id) {
          if (typeof value !== 'object') {
            this.log.add(obj._id, SET_VAL, prop, newVal)
          } else {
            newVal = this.wrapObject(value)
            this.log.add(obj._id, SET_REF, prop, newVal._id)
          }
        }
        return Reflect.set(obj, prop, newVal)
      }
    }
  }

  wrapObject (obj) {
    let result = {}
    if (!obj._id) {
      result._id = uuid()
      this.log.add(result._id, CREATE)
    } else {
      result._id = obj._id
    }

    result = new Proxy(result, this.setHandler)

    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        result[key] = this.wrapObject(obj[key])
      } else {
        if (key !== '_id') {
          result[key] = obj[key]
        }
      }
    })

    this.objectIndex[result._id] = result
    return this.objectIndex[result._id]
  }

  merge (mergableObject) {
    // this is fairly naive approach, it should use sorted lists to merge the props

    mergableObject.log[CREATE].forEach(record => {
      if (this.objectIndex[record.objectId] === undefined) {
        this.wrapObject({_id: record.objectId})
      }
    })
    mergableObject.log[SET_REF].forEach(record => {
      this.objectIndex[record.objectId][record.prop] = this.objectIndex[record.value]
    })
    mergableObject.log[SET_VAL].forEach(record => {
      this.objectIndex[record.objectId][record.prop] = record.value
    })
  }
}