import * as dotenv from 'dotenv' 
dotenv.config()

export function execute(fn) {
  fn().then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch(err => {
      console.error(err)
      process.exit(1)
  })
}
