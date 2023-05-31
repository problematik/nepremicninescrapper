import * as dotenv from 'dotenv' 
dotenv.config()
import { Logtail } from '@logtail/node'

const logtailInstance = new Logtail(process.env.LOGTAIL)

const localInstance = {
  debug: (...args) => {
    if(!process.env.RENDER) {
      console.debug(...args)
    }
  },
  info: (...args) => {
    if(process.env.RENDER) {
      logtailInstance.info(...args)
    } else {
      console.info(...args)
    }
  },
  warn: (...args) => {
    if(process.env.RENDER) {
      logtailInstance.warn(...args)
    } else {
      console.warn(...args)
    }
  },
  error: (...args) => {
    if(process.env.RENDER) {
      logtailInstance.warn(...args)
    } else {
      console.warn(...args)
    }
  },
  flush: () => {
    if(process.env.RENDER) {
      logtailInstance.flush()
    }
  }
}

export const logtail = localInstance
