import { seedTasks } from './driverData.js'

const DB_NAME = 'pod-driver-local'
const DB_VERSION = 1
const stores = ['tasks', 'proofs', 'outbox']
const memory = {
  tasks: [],
  proofs: [],
  outbox: [],
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      stores.forEach((store) => {
        if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: 'id' })
      })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore(storeName, mode, action) {
  try {
    const database = await openDatabase()
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode)
      const store = transaction.objectStore(storeName)
      const request = action(store)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => database.close()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    return actionMemory(storeName, action, error)
  }
}

function actionMemory(storeName, action, error) {
  if (error && !memory[storeName]) throw error
  const fakeStore = {
    getAll: () => ({ result: structuredClone(memory[storeName]) }),
    get: (id) => ({ result: structuredClone(memory[storeName].find((item) => item.id === id)) }),
    put: (value) => {
      const index = memory[storeName].findIndex((item) => item.id === value.id)
      if (index === -1) memory[storeName].push(structuredClone(value))
      else memory[storeName][index] = structuredClone(value)
      return { result: value.id }
    },
    delete: (id) => {
      memory[storeName] = memory[storeName].filter((item) => item.id !== id)
      return { result: undefined }
    },
  }
  return action(fakeStore).result
}

export async function initialiseStorage({ seedDemo = false } = {}) {
  try {
    const database = await openDatabase()
    const existing = await withStore('tasks', 'readonly', (store) => store.count())
    if (!existing && seedDemo) {
      await Promise.all(seedTasks.map((task) => withStore('tasks', 'readwrite', (store) => store.put(task))))
    }
    database.close()
  } catch {
    if (!memory.tasks.length && seedDemo) memory.tasks = structuredClone(seedTasks)
  }
}

export const getTasks = () => withStore('tasks', 'readonly', (store) => store.getAll())
export const getProof = (id) => withStore('proofs', 'readonly', (store) => store.get(id))
export const getProofs = () => withStore('proofs', 'readonly', (store) => store.getAll())
export const getOutbox = () => withStore('outbox', 'readonly', (store) => store.getAll())
export const putTask = (task) => withStore('tasks', 'readwrite', (store) => store.put(task))
export const putProof = (proof) => withStore('proofs', 'readwrite', (store) => store.put(proof))
export const putOutbox = (item) => withStore('outbox', 'readwrite', (store) => store.put(item))
export const removeOutbox = (id) => withStore('outbox', 'readwrite', (store) => store.delete(id))
