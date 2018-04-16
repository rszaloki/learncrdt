import uuid from 'uuid/v4'

const CREATE = 'C'
const SET = 'S'
const ID = '_id'
const OBJECT = 'o'
const COMMIT = 'c'
const HEAD = 'HEAD'

const OBJECT_INDEX = Symbol('OBJECT_INDEX')
const HISTORY = Symbol('HISTORY')

const isObject = o => typeof o === 'object'

const getId = prefix => `${prefix}::${uuid()}`

class Log {
  constructor (parent = null) {
    this.parent = parent
    this[CREATE] = new Map()
    this[SET] = new Map()
  }

  add (objectId, type, prop, value) {
    const key = JSON.stringify([objectId, prop])
    this[type].set(key, value)
    // console.log(`[${type}] ${key} ${value}`)
  }
}

class History extends Map {
  constructor () {
    super()
    this.newHead()
  }

  get head () {
    return this.get(HEAD)
  }

  get commitOrder () {
    const order = [HEAD]
    let current = this.head
    while (current.parent) {
      order.push(current.parent)
      current = this.get(current.parent)
    }

    return order
  }

  newHead (parent) {
    this.set(HEAD, new Log(parent))
  }

  log (objectId, type, prop, value) {
    this.head.add(objectId, type, prop, value)
  }

  commit (markId = getId(COMMIT)) {
    this.set(markId, this.head)
    console.log(`[history] new marker ${markId}`)
    this.newHead(markId)
  }
}

const setter = function (obj, prop, value) {
  let newVal = value
  if (obj[ID]) {
    if (!isObject(value)) {
      this[HISTORY].log(obj[ID], SET, prop, newVal)
    } else {
      newVal = this.wrapObject(value)
      this[HISTORY].log(obj[ID], SET, prop, {[ID]: newVal[ID]})
    }
  }
  return Reflect.set(obj, prop, newVal)
}

class Mergable {
  constructor (obj) {
    if (obj && obj[ID]) {
      this[ID] = obj[ID]
    } else {
      this[ID] = getId(OBJECT)
    }
    this[HISTORY] = new History()
    this[OBJECT_INDEX] = {}
  }

  get _history () {
    return this[HISTORY]
  }

  get _objectIndex () {
    return this[OBJECT_INDEX]
  }

  get historyLog () {
    const types = [CREATE, SET]
    this[HISTORY].commitOrder.forEach(commitKey => {
      const log = this[HISTORY].get(commitKey)
      console.log(`[history] ${commitKey} <- ${log.parent}`)
      types.forEach(type => {
        for (let [key, value] of log[type]) {
          console.log(`[history] - ${type} ${key} ${JSON.stringify(value)}`)
        }
      })
    })
  }

  wrapObject (obj) {
    let result = {}
    if (!obj[ID]) {
      result[ID] = getId(OBJECT)
    } else {
      result[ID] = obj[ID]
    }
    this[HISTORY].log(result[ID], CREATE, ID, result[ID])

    result = new Proxy(result, {
      set: setter.bind(this)
    })

    Object.keys(obj).forEach(key => {
      if (isObject(obj[key])) {
        result[key] = this.wrapObject(obj[key])
      } else {
        if (key !== ID) {
          result[key] = obj[key]
        }
      }
    })

    this[OBJECT_INDEX][result[ID]] = result
    return this[OBJECT_INDEX][result[ID]]
  }

  commit (commitId) {
    this[HISTORY].commit(commitId)
  }

  applyLog (log, callback) {
    for (var [key, value] of log) {
      callback(...(JSON.parse(key)), value)
    }
  }

  applyCommit (commitKey, commitLog) {
    console.log(`[merge] apply ${commitKey}`)
    if (commitLog) {
      this.applyLog(commitLog[CREATE], objectId => {
        if (this[OBJECT_INDEX][objectId] === undefined) {
          console.log(`[apply] create ${objectId}`)
          this.wrapObject({[ID]: objectId})
        }
      })
      this.applyLog(commitLog[SET], (objectId, prop, value) => {
        console.log(`[apply] set ${objectId} ${prop} ${value}`)
        if (isObject(value)) {
          this[OBJECT_INDEX][objectId][prop] = this[OBJECT_INDEX][value[ID]]
        } else {
          if (prop !== ID) {
            this[OBJECT_INDEX][objectId][prop] = value
          }
        }
      })
      this.commit(commitKey)
    }
  }

  merge (mergableObject) {
    const history = mergableObject[HISTORY]
    const commitOrder = history.commitOrder
    const myCommits = new Set(this[HISTORY].commitOrder)

    console.log(`[merge] incoming commits ${JSON.stringify(commitOrder)}`)
    console.log(`[merge] my commits ${JSON.stringify(Array.from(myCommits))}`)

    let commitKey = commitOrder.pop()
    while (commitKey) {
      console.log(`[merge] check ${commitKey}`)
      if (!myCommits.has(commitKey)) {
        this.applyCommit(commitKey, history.get(commitKey))
      }
      commitKey = commitOrder.pop()
    }
  }
}

export default new Proxy(Mergable, {
  construct (target, args) {
    const mergable = new target(args[0])
    const proxiedMergable = new Proxy(mergable, {
      set: setter.bind(mergable)
    })

    proxiedMergable[OBJECT_INDEX][proxiedMergable[ID]] = proxiedMergable
    if (args[0]) {
      Object.keys(args[0]).forEach(key => proxiedMergable[key] = args[0][key])
    }

    return proxiedMergable
  }
})
