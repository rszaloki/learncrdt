import uuid from 'uuid/v4'

const CREATE = 'C'
const SET_VAL = 'V'
const SET_REF = 'R'

class Logger {
  constructor () {
    this[CREATE] = new Set()
    this[SET_VAL] = new Set()
    this[SET_REF] = new Set()
  }

  add (objectId, type, prop, value) {
    this[type].add(JSON.stringify([objectId, prop, value]))
  }
}

const setter = function (obj, prop, value) {
  let newVal = value
  if (obj._id) {
    if (typeof value !== 'object') {
      this._log.add(obj._id, SET_VAL, prop, newVal)
    } else {
      newVal = this.wrapObject(value)
      this._log.add(obj._id, SET_REF, prop, newVal._id)
    }
  }
  return Reflect.set(obj, prop, newVal)
}

class Mergable {
  constructor () {
    this._id = uuid()
    Object.defineProperties(this, {
      _log: {
        enumerable: false,
        value: new Logger(),
        writable: false,
        configurable: false
      },
      _objectIndex: {
        enumerable: false,
        value: {},
        writable: false,
        configurable: false
      }
    })
  }

  assign (obj, result) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        result[key] = this.wrapObject(obj[key])
      } else {
        if (key !== '_id') {
          result[key] = obj[key]
        }
      }
    })
  }

  wrapObject (obj) {
    let result = {}
    if (!obj._id) {
      result._id = uuid()
      this._log.add(result._id, CREATE)
    } else {
      result._id = obj._id
    }

    result = new Proxy(result, {
      set: setter.bind(this)
    })

    this.assign(obj, result)

    this._objectIndex[result._id] = result
    return this._objectIndex[result._id]
  }

  applyLog (log, callback) {
    log.forEach(record => callback(...(JSON.parse(record))))
  }

  merge (mergableObject) {
    this.applyLog(mergableObject._log[CREATE], objectId => {
      if (this._objectIndex[objectId] === undefined) {
        this.wrapObject({_id: objectId})
      }
    })

    this.applyLog(mergableObject._log[SET_REF], (objectId, prop, value) => {
      this._objectIndex[objectId][prop] = this._objectIndex[value]
    })

    this.applyLog(mergableObject._log[SET_REF], (objectId, prop, value) => {
      this._objectIndex[objectId][prop] = value
    })
  }
}

export default new Proxy(Mergable, {
  construct (target, args) {
    const mergable = new target()
    const proxiedMergable = new Proxy(mergable, {
      set: setter.bind(mergable)
    })

    proxiedMergable.assign(args[0], proxiedMergable)

    return proxiedMergable
  }
})
