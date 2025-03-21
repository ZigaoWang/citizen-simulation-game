// 游戏主题分类
const GAME_CATEGORIES = {
  ENVIRONMENTAL: '环保行动',
  FREE_SPEECH: '言论自由',
  LEGAL_RESPONSIBILITY: '法律责任'
};

// 游戏初始场景
const initialScenarios = {
  [GAME_CATEGORIES.ENVIRONMENTAL]: {
    id: 'env_001',
    title: '环保卫士',
    description: '你发现本地一家工厂在夜间偷偷排放有毒废水到附近的河流中。作为一名附近社区的居民，你该怎么办？',
    choices: [
      { id: 'env_001_a', text: '匿名举报到环保部门' },
      { id: 'env_001_b', text: '收集证据后公开发布到社交媒体' },
      { id: 'env_001_c', text: '找工厂管理层私下交涉' },
      { id: 'env_001_d', text: '不参与，这不是你的责任' }
    ],
    knowledge: {
      rights: ['环境权', '知情权', '健康权'],
      duties: ['环境保护义务', '遵守法律法规义务', '社会监督义务']
    }
  },
  [GAME_CATEGORIES.FREE_SPEECH]: {
    id: 'speech_001',
    title: '发声与沉默',
    description: '你在社交媒体上看到关于一项新政策的错误信息正在广泛传播。你了解真相，但发声可能会带来争议。你会怎么做？',
    choices: [
      { id: 'speech_001_a', text: '发布事实核查信息' },
      { id: 'speech_001_b', text: '私下联系散播错误信息的人' },
      { id: 'speech_001_c', text: '向相关部门反映情况' },
      { id: 'speech_001_d', text: '保持沉默，避免卷入争议' }
    ],
    knowledge: {
      rights: ['言论自由权', '知情权', '表达权'],
      duties: ['传播真实信息义务', '维护社会秩序义务', '尊重他人权益义务']
    }
  },
  [GAME_CATEGORIES.LEGAL_RESPONSIBILITY]: {
    id: 'legal_001',
    title: '见义勇为',
    description: '你在路上目睹一起抢劫事件，歹徒正在逃跑，而受害者需要帮助。你该如何行动？',
    choices: [
      { id: 'legal_001_a', text: '立即报警并尝试帮助受害者' },
      { id: 'legal_001_b', text: '追赶歹徒并试图阻止' },
      { id: 'legal_001_c', text: '仅报警，不直接参与' },
      { id: 'legal_001_d', text: '离开现场，避免卷入麻烦' }
    ],
    knowledge: {
      rights: ['人身安全权', '求助权', '公民参与权'],
      duties: ['协助维护社会治安义务', '见义勇为义务', '遵守法律法规义务']
    }
  }
};

// 获取初始场景
exports.getInitialScenario = () => {
  return {
    categories: GAME_CATEGORIES,
    initialScenarios: initialScenarios
  };
};

// 更新游戏状态
exports.updateGameState = (result) => {
  // 在这里可以实现游戏状态的持久化
  return {
    ...result,
    timestamp: new Date().toISOString()
  };
};

// 供AI生成的场景模板
exports.getScenarioTemplate = (category) => {
  return initialScenarios[category];
};