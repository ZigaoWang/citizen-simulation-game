const express = require('express');
const aiService = require('./ai-service');
const router = express.Router();

// 开始新游戏
router.post('/start', async (req, res) => {
  try {
    const { category, playerName } = req.body;
    const scenario = await aiService.generateInitialScenario(category, playerName);
    res.json(scenario);
  } catch (error) {
    console.error('开始游戏失败:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
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

// 处理玩家行动
router.post('/action', async (req, res) => {
  try {
    const { currentScenario, action, playerName } = req.body;
    
    if (!currentScenario || !action) {
      return res.status(400).json({ error: '请求缺少必要参数' });
    }
    
    const result = await aiService.processAction(currentScenario, action, playerName);
    res.json(result);
  } catch (error) {
    console.error('处理玩家行动失败:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
  }
});

module.exports = router;