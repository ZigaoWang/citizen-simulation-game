// 游戏逻辑模块
// 这个文件包含更复杂的游戏机制，如分数计算、成就系统等

// 分数计算函数
function calculateScore(outcome) {
  const scores = {
    environmental: 0,
    social: 0,
    legal: 0
  };
  
  // 根据结果中的关键词来计算分数
  // 这只是一个示例实现
  const text = JSON.stringify(outcome).toLowerCase();
  
  // 环保分数
  if (text.includes('环保') || text.includes('生态') || text.includes('可持续')) {
    scores.environmental += 10;
  }
  if (text.includes('污染') || text.includes('破坏环境')) {
    scores.environmental -= 5;
  }
  
  // 社会分数
  if (text.includes('帮助') || text.includes('支持') || text.includes('团结')) {
    scores.social += 10;
  }
  if (text.includes('冷漠') || text.includes('忽视')) {
    scores.social -= 5;
  }
  
  // 法律分数
  if (text.includes('法律') || text.includes('守法') || text.includes('合规')) {
    scores.legal += 10;
  }
  if (text.includes('违法') || text.includes('非法')) {
    scores.legal -= 5;
  }
  
  return scores;
}

// 成就检查函数
function checkAchievements(gameState) {
  const achievements = [];
  
  // 示例成就条件
  if (gameState.playerHistory.length >= 5) {
    achievements.push({
      id: 'decision_maker',
      title: '决策者',
      description: '做出5个决定'
    });
  }
  
  if (gameState.gameScore.environmentalScore >= 30) {
    achievements.push({
      id: 'eco_warrior',
      title: '环保勇士',
      description: '环保分数达到30分'
    });
  }
  
  if (gameState.gameScore.socialScore >= 30) {
    achievements.push({
      id: 'social_hero',
      title: '社会英雄',
      description: '社会分数达到30分'
    });
  }
  
  if (gameState.gameScore.legalScore >= 30) {
    achievements.push({
      id: 'law_abider',
      title: '守法公民',
      description: '法律分数达到30分'
    });
  }
  
  return achievements;
}

// 游戏进度存储函数
function saveGameProgress(gameState) {
  try {
    localStorage.setItem('citizenGame_progress', JSON.stringify(gameState));
    return true;
  } catch (e) {
    console.error('保存游戏进度失败:', e);
    return false;
  }
}

// 加载游戏进度函数
function loadGameProgress() {
  try {
    const savedState = localStorage.getItem('citizenGame_progress');
    if (savedState) {
      return JSON.parse(savedState);
    }
    return null;
  } catch (e) {
    console.error('加载游戏进度失败:', e);
    return null;
  }
}

// 生成结论与反思报告
function generateReflectionReport(gameState) {
  // 基于玩家的选择历史生成一份反思报告
  let report = {
    playerName: gameState.playerName,
    totalDecisions: gameState.playerHistory.length,
    environmentalScore: gameState.gameScore.environmentalScore,
    socialScore: gameState.gameScore.socialScore,
    legalScore: gameState.gameScore.legalScore,
    achievements: checkAchievements(gameState),
    conclusion: '',
    reflection: ''
  };
  
  // 生成结论
  if (report.environmentalScore > report.socialScore && report.environmentalScore > report.legalScore) {
    report.conclusion = '你是一位环保卫士，对环境保护充满热情。';
  } else if (report.socialScore > report.environmentalScore && report.socialScore > report.legalScore) {
    report.conclusion = '你是一位社会贡献者，关心社区与他人福祉。';
  } else if (report.legalScore > report.environmentalScore && report.legalScore > report.socialScore) {
    report.conclusion = '你是一位守法公民，尊重法律和社会秩序。';
  } else {
    report.conclusion = '你是一位全面发展的公民，在多方面都表现平衡。';
  }
  
  // 根据分数生成反思建议
  const lowestScore = Math.min(report.environmentalScore, report.socialScore, report.legalScore);
  
  if (lowestScore === report.environmentalScore) {
    report.reflection = '你可以多关注环境保护议题，积极参与环保行动，提高环保意识。';
  } else if (lowestScore === report.socialScore) {
    report.reflection = '你可以更多地参与社区活动，关注社会问题，增强社会责任感。';
  } else {
    report.reflection = '你可以深入学习法律知识，提高法律意识，更好地履行公民义务。';
  }
  
  return report;
}

// 导出函数供main.js使用
window.gameLogic = {
  calculateScore,
  checkAchievements,
  saveGameProgress,
  loadGameProgress,
  generateReflectionReport
};