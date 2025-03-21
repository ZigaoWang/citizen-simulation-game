const express = require('express');
const aiService = require('./ai-service');
const router = express.Router();

// 开始新游戏
router.post('/start', async (req, res) => {
  try {
    const { category } = req.body;
    const scenario = await aiService.generateInitialScenario(category);
    res.json(scenario);
  } catch (error) {
    console.error('游戏启动失败:', error);
    res.status(500).json({ error: '游戏启动失败' });
  }
});

// 处理玩家行动 - 流式响应
router.post('/action/stream', (req, res) => {
  try {
    const { action, context, history } = req.body;
    // 直接传递响应对象，由AI服务处理流式响应
    aiService.processPlayerActionStream(action, context, history, res);
  } catch (error) {
    console.error('处理玩家行动失败:', error);
    res.status(500).json({ error: '处理玩家行动失败' });
  }
});

// 处理玩家行动 - 传统方式 (备用)
router.post('/action', async (req, res) => {
  try {
    const { action, context, history } = req.body;
    const response = await aiService.processPlayerAction(action, context, history);
    res.json(response);
  } catch (error) {
    console.error('处理玩家行动失败:', error);
    res.status(500).json({ error: '处理玩家行动失败' });
  }
});

module.exports = router;