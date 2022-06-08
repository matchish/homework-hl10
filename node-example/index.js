import express from 'express'
import { Message, Producer, QueueManager, Consumer } from 'redis-smq'
import BeanstalkdWorker from 'beanstalkd-worker'
import casual from 'casual'

const redisConfig = {
    namespace: 'hl10',
    redis: {
        client: 'redis',
        options: {
            host: process.env.REDIS_HOST,
            port: 6379,
            connect_timeout: 3600000,
            auth_pass: 'secret'
        },
    },
    messages: {
        store: false,
    },

}
console.log()
const beanstalkdWorker = new BeanstalkdWorker(
    'beanstalkd',
    process.env.BEANSTALKD_PORT
)


QueueManager.createInstance(redisConfig, async (err, queueManager) => {
    await new Promise((resolve, reject) => {
        if (err) {
            reject(err)
        } else {
            queueManager.queue.exists('hl10', (err, reply) => {
                if (err) {
                    reject(err)
                } else {
                    if (reply) {
                        resolve()
                    } else {
                        queueManager.queue.create('hl10', false, (err) => {
                            if (err) {
                                reject(err)
                            } else {
                                resolve()
                            }
                        })
                    }
                }
            })
        }

    })
    const consumer = new Consumer(redisConfig)

    const messageHandler = (msg, cb) => {
        // const payload = msg.getBody()
        // console.log('Message payload', payload)
        cb() // acknowledging the message
    }

    consumer.consume('hl10', messageHandler, (err) => {
        if (err) console.error(err)
    })

    consumer.run()
})

const app = express()

app.use(express.urlencoded({ extended: false }))


app.post('/redis', async (req, res) => {
    const message = new Message()

    message
        .setBody({
            address: casual.address
        })
        .setTTL(3600000) // in millis
        .setQueue('hl10')

    const producer = new Producer(redisConfig)
    producer.produce(message, (err) => {
        if (err) console.log(err)
        else {
            const msgId = message.getId() // string
            // console.log('Successfully produced. Message ID is ', msgId)
            res.statusCode = 200
            res.end(msgId.toString())
        }
    })
})

app.post('/beanstalkd', (req, res) => {
    beanstalkdWorker.spawn('hl10', {
        address: casual.address
    }, {
        delay: 0,
        priority: 1000,
        timeout: 10 * 60 * 1000 // ms
    }).then(function (job) {
        // console.log(job.id)
        res.status(200).send(job.id.toString())
    })
})



const port = 3000

app.listen(port, () => console.log('Server running...'))

beanstalkdWorker.handle('hl10', function (payload) {
    // console.log(payload)
    return Promise.resolve()
}, {
    tries: 3, // Total amount of tries including the first one
    backoff: {
        initial: 60 * 1000, // ms
        exponential: 1.5 // multiple backoff by N each try
    }
})

beanstalkdWorker.start()