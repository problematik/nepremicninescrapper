import * as dotenv from 'dotenv'
dotenv.config()
import { Logtail } from '@logtail/node'

const logtailInstance = new Logtail(process.env.LOGTAIL)

const dumpLocal = !process.env.RENDER || process.env.FORCE_LOCAL_DEBUG
const dumpLogtail = process.env.RENDER

const localInstance = {
  debug: (...args) => {
    if(dumpLocal) {
      console.debug(...args)
    }
  },
  info: (...args) => {
    if(dumpLogtail) {
      logtailInstance.info(...args)
    }
    if(dumpLocal) {
      console.info(...args)
    }
  },
  warn: (...args) => {
    if(dumpLogtail) {
      logtailInstance.warn(...args)
    }
    if(dumpLocal) {
      console.warn(...args)
    }
  },
  error: (...args) => {
    if(dumpLogtail) {
      logtailInstance.warn(...args)
    }
    if(dumpLocal) {
      console.warn(...args)
    }
  },
  flush: () => {
    if(dumpLogtail) {
      logtailInstance.flush()
    }
  }
}

export const logtail = localInstance
