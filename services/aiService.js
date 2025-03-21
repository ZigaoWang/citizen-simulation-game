const axios = require('axios');
const gameModel = require('../models/gameModel');

// OpenAI API配置
const config = {
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  baseURL: process.env.OPENAI_BASE_URL
};

// 生成游戏场景
exports.generateScenario = async (category, context) => {
  try {
    const template = gameModel.getScenarioTemplate(category);
    
    // 根据模板和AI生成场景
    const prompt = `
      你是一个中国公民责任教育游戏的场景设计师。请根据以下主题创建一个教育意义的游戏场景：
      
      主题：${category}
      玩家背景：${context || '一名普通中国公民'}
      
      请创建一个符合中国社会价值观和法律法规的情境，包含以下内容：
      1. 场景标题
      2. 场景描述（200字以内）
      3. 四个可能的选择
      4. 涉及的公民权利（至少2个）
      5. 涉及的公民义务（至少2个）
      
      返回格式为JSON，不要有任何额外的说明。
    `;

    const response = await axios.post('/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    }, config);

    // 处理API返回的场景
    const aiResponse = response.data.choices[0].message.content;
    let scenarioData;
    
    try {
      scenarioData = JSON.parse(aiResponse);
    } catch (error) {
      // 如果解析失败，使用正则表达式提取JSON部分
      const jsonMatch = aiResponse.match(/{[\s\S]*}/);
      if (jsonMatch) {
        scenarioData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析AI返回的场景');
      }
    }
    
    // 生成场景ID
    const scenarioId = `${category.substring(0, 3)}_${Date.now()}`;
    
    // 格式化场景
    return {
      id: scenarioId,
      title: scenarioData.title,
      description: scenarioData.description,
      choices: scenarioData.choices.map((choice, index) => ({
        id: `${scenarioId}_${String.fromCharCode(97 + index)}`,
        text: choice
      })),
      knowledge: {
        rights: scenarioData.rights,
        duties: scenarioData.duties
      }
    };
  } catch (error) {
    console.error('AI场景生成失败:', error);
    throw error;
  }
};

// 生成选择的结果
exports.generateOutcome = async (scenarioId, choiceId, playerHistory) => {
  try {
    // 构建提示，包含历史选择和当前情境
    const prompt = `
      你是一个中国公民责任教育游戏的叙事设计师。玩家刚刚在情境中做出了选择，请根据以下信息生成结果：
      
      情境ID：${scenarioId}
      选择ID：${choiceId}
      玩家历史选择：${JSON.stringify(playerHistory || [])}
      
      请生成一个详细的结果描述，包含：
      1. 直接后果（200字以内）
      2. 社会影响（100字以内）
      3. 个人成长（100字以内）
      4. 相关的公民权利和义务解释（200字以内）
      5. 对玩家责任感的评价（50字以内）
      
      返回格式为JSON，不要有任何额外的说明。
    `;

    const response = await axios.post('/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    }, config);

    // 处理API返回的结果
    const aiResponse = response.data.choices[0].message.content;
    let outcomeData;
    
    try {
      outcomeData = JSON.parse(aiResponse);
    } catch (error) {
      // 如果解析失败，使用正则表达式提取JSON部分
      const jsonMatch = aiResponse.match(/{[\s\S]*}/);
      if (jsonMatch) {
        outcomeData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析AI返回的结果');
      }
    }
    
    return {
      scenarioId,
      choiceId,
      outcome: outcomeData,
      nextScenarioId: `next_${Date.now()}`  // 可以在此生成下一个场景ID
    };
  } catch (error) {
    console.error('AI结果生成失败:', error);
    throw error;
  }
};