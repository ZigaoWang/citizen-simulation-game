const express = require('express');
const gameController = require('../controllers/gameController');
const router = express.Router();

// 获取初始游戏场景
router.get('/start', gameController.startGame);

// 获取AI生成的场景
router.post('/generate-scenario', gameController.generateScenario);

// 提交玩家选择，获取结果
router.post('/choose', gameController.processChoice);

module.exports = router;