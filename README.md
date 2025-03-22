# 公民责任模拟器 (Citizen Simulation Game)

一个互动式公民责任模拟器，通过情境模拟帮助用户了解公民权利与义务。

## 项目简介

这是一个基于Web的互动式模拟游戏，旨在通过不同的社会情境模拟，加深用户对公民责任和权利的理解。游戏提供多种主题选择，包括环保行动、言论自由和法律责任，让玩家在沉浸式体验中学习并思考作为公民的责任与权利。

## 核心功能

- **多主题选择**：环保行动、言论自由、法律责任等多种主题场景
- **AI驱动对话**：基于AI的情境模拟与对话生成
- **互动式体验**：玩家可以做出不同选择，影响情境发展
- **实时反馈**：根据玩家的选择提供即时反馈和教育性内容

## 技术栈

- **前端**：HTML, CSS, JavaScript
- **后端**：Node.js, Express
- **AI服务**：自定义AI服务用于情境生成和对话

## 安装指南

### 前提条件

- Node.js (v12+)
- npm

### 安装步骤

1. 克隆仓库
```
git clone https://github.com/your-username/citizen-simulation-game.git
cd citizen-simulation-game
```

2. 安装依赖
```
npm install
```

3. 创建环境配置文件
创建一个 `.env` 文件，包含以下内容（根据需要修改）：
```
PORT=3000
OPENAI_API_KEY=your_api_key
OPENAI_API_URL=your_api_url
```

4. 启动服务器
```
npm start
```

或者开发模式运行：
```
npm run dev
```

5. 访问应用
打开浏览器，访问 http://localhost:3000

## 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 联系方式

如有问题或建议，请通过 [GitHub Issues](https://github.com/your-username/citizen-simulation-game/issues) 与我们联系。 