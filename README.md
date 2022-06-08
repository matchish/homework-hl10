# homework-hl10

`siege -c100 -t 60S "http://localhost:3001/redis POST {}"`

aof 492.66 trans/sec  
rdb 540.85 trans/sec

`siege -c100 -t 60S "http://localhost:3001/beanstalkd POST {}"`

beanstalkd 474.43 trans/sec
