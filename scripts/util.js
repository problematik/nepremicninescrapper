import * as dotenv from 'dotenv' 
dotenv.config()
import { logtail } from '../utils/log'

export function execute(fn) {
  fn().then(() => {
    logtail.log('Done')
    logtail.flush()
    process.exit(0)
  })
  .catch(err => {
      logtail.error(err)
      logtail.flush()
      process.exit(1)
  })
}
