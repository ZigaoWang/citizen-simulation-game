const aiService = require('../services/aiService');
const gameModel = require('../models/gameModel');

// 初始化游戏
exports.startGame = async (req, res) => {
  try {
    const initialScenario = gameModel.getInitialScenario();
    res.json(initialScenario);
  } catch (error) {
    console.error('游戏初始化失败:', error);
    res.status(500).json({ message: '游戏初始化失败' });
  }
};

// 生成AI场景
exports.generateScenario = async (req, res) => {
  try {
    const { category, context } = req.body;
    
    // 生成AI场景
    const scenario = await aiService.generateScenario(category, context);
    res.json(scenario);
  } catch (error) {
    console.error('场景生成失败:', error);
    res.status(500).json({ message: '场景生成失败' });
  }
};

// 处理玩家选择
exports.processChoice = async (req, res) => {
  try {
    const { scenarioId, choiceId, playerHistory } = req.body;
    
    // 根据玩家的选择生成后续情节
    const result = await aiService.generateOutcome(scenarioId, choiceId, playerHistory);
    
    // 更新游戏状态
    const updatedGameState = gameModel.updateGameState(result);
    
    res.json(updatedGameState);
  } catch (error) {
    console.error('选择处理失败:', error);
    res.status(500).json({ message: '选择处理失败' });
  }
};