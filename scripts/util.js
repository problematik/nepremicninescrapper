import * as dotenv from 'dotenv' 
dotenv.config()
import { logtail } from '../utils/log'

export function execute(fn) {
  fn().then(() => {
    logtail.log('Done')
    process.exit(0)
  })
  .catch(err => {
      logtail.error(err)
      process.exit(1)
  })
}
