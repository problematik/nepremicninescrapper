import * as dotenv from 'dotenv' 
dotenv.config()
import { Logtail } from '@logtail/node'

export const logtail = new Logtail(process.env.LOGTAIL)
