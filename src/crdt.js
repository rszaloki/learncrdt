import uuid from 'uuid/v4'

const CREATE = 'C'
const SET = 'S'
const ID = '_id'


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
  if (obj[ID]) {
    if (typeof value !== 'object') {
      this._log.add(obj[ID], SET, prop, newVal)
    } else {
      newVal = this.wrapObject(value)
      this._log.add(obj[ID], SET, prop, {[ID]: newVal[ID]})
    }
  }
  return Reflect.set(obj, prop, newVal)
}

class Mergable {
  constructor () {
    this[ID] = uuid()
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
    if (!obj[ID]) {
      result[ID] = uuid()
      this._log.add(result[ID], CREATE)
    } else {
      result[ID] = obj[ID]
    }

    result = new Proxy(result, {
      set: setter.bind(this)
    })

    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        result[key] = this.wrapObject(obj[key])
      } else {
        if (key !== ID) {
          result[key] = obj[key]
        }
      }
    })

    this._objectIndex[result[ID]] = result
    return this._objectIndex[result[ID]]
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
        this.wrapObject({[ID]: objectId})
      }
    })

    this.applyLog(mergableObject._log[SET], (objectId, prop, value) => {
      console.log(`[apply] set ${objectId} ${prop} ${value}`)
      if (typeof value === 'object') {
        this._objectIndex[objectId][prop] = this._objectIndex[value[ID]]
      } else {
        if (prop !== ID) {
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

    proxiedMergable._objectIndex[proxiedMergable[ID]] = proxiedMergable
    Object.keys(args[0] || {}).forEach(key => proxiedMergable[key] = args[0][key])

    return proxiedMergable
  }
})
