import * as dotenv from 'dotenv' 
dotenv.config()

import { scrape as getAdds} from './get-ads'
import { scrape as scrapeAds} from './scrape-ads'
import { markAllNotified, notify } from './notify'
import http from 'http'

import Koa from 'koa'
import Router from 'koa-router'

const app = new Koa();
const router = new Router();

router.post('/get-ads', async (ctx) => {
  await getAdds()
  ctx.response.body = 'Done!'
})

router.post('/mark-notified', async (ctx) => {
  await markAllNotified()
  ctx.response.body = 'Done!'
})

router.post('/scrape-ads', async(ctx) => {
  await scrapeAds()
  ctx.response.body = 'Done!'
})

router.post('/notify', async(ctx) => {
  await notify()
  ctx.response.body = 'Done!'
})

router.post('/500', async(ctx) => {
  ctx.response.status = 500
})

process.on("unhandledRejection", reason => {
  // I just caught an unhandled promise rejection,
  // let's throw it here so my central error handler can catch it
  // throw new Error(reason);
  console.error(reason)
  console.error('Error caught unhadled rejection...')
});

process.on('uncaughtException', reason => {
  // I just received an error that was never handled, time to handle it
  // by throwing it so my error handling middleware can catch it
  console.error(reason)
  console.error('Error caught unhadled rejection...')
});

app
  .use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = 'Error caught'
      ctx.app.emit('error', err, ctx);
    }
  })
  .use(async function(ctx, next) {
    if(!ctx.request.headers['x-key'] || ctx.request.headers['x-key'].toString() !== process.env.APP_KEY.toString()) {
      ctx.response.status = 403
    } else {
      await next()
    }
  })
  .use(router.routes())
  .use(router.allowedMethods())
  .on('error', (err) => {
    console.error(err)
  })

http.createServer(app.callback()).listen(process.env.PORT || 9988, () => {
  console.log('Server up and running')
})

