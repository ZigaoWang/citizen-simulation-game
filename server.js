const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const routes = require('./routes');
const path = require('path');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.use('/api', routes);

// 启动服务器，如果端口被占用则尝试其他端口
function startServer(port) {
  app.listen(port).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`端口 ${port} 已被占用，尝试端口 ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('服务器启动失败:', err);
    }
  }).on('listening', () => {
    console.log(`服务器运行在端口 ${port}`);
  });
}

startServer(PORT);