import uuid from 'uuid/v4'

const CREATE = 'C'
const SET = 'S'

class Logger {
  constructor () {
    this[CREATE] = new Map()
    this[SET] = new Map()
  }

  add (objectId, type, prop, value) {
    const key = JSON.stringify([objectId, prop])
    this[type].set(key, value)
    console.log(`[${type}] ${key} ${value}`)
  }
}

const setter = function (obj, prop, value) {
  let newVal = value
  if (obj._id) {
    if (typeof value !== 'object') {
      this._log.add(obj._id, SET, prop, newVal)
    } else {
      newVal = this.wrapObject(value)
      this._log.add(obj._id, SET, prop, {_id: newVal._id})
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

    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        result[key] = this.wrapObject(obj[key])
      } else {
        if (key !== '_id') {
          result[key] = obj[key]
        }
      }
    })

    this._objectIndex[result._id] = result
    return this._objectIndex[result._id]
  }

  applyLog (log, callback) {
    for (var [key, value] of log) {
      callback(...(JSON.parse(key)), value)
    }
  }

  merge (mergableObject) {
    this.applyLog(mergableObject._log[CREATE], objectId => {
      if (this._objectIndex[objectId] === undefined) {
        console.log(`[apply] create ${objectId}`)
        this.wrapObject({_id: objectId})
      }
    })

    this.applyLog(mergableObject._log[SET], (objectId, prop, value) => {
      console.log(`[apply] set ${objectId} ${prop} ${value}`)
      if (typeof value === 'object') {
        this._objectIndex[objectId][prop] = this._objectIndex[value._id]
      } else {
        if (prop !== '_id') {
          this._objectIndex[objectId][prop] = value
        }
      }
    })
  }
}

export default new Proxy(Mergable, {
  construct (target, args) {
    const mergable = new target()
    const proxiedMergable = new Proxy(mergable, {
      set: setter.bind(mergable)
    })

    proxiedMergable._objectIndex[proxiedMergable._id] = proxiedMergable
    Object.keys(args[0] || {}).forEach(key => proxiedMergable[key] = args[0][key])

    return proxiedMergable
  }
})
