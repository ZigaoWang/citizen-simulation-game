const axios = require('axios');
const dotenv = require('dotenv');
const { createParser } = require('eventsource-parser');

dotenv.config();

// 游戏主题
const GAME_THEMES = {
  ENVIRONMENTAL: '环保行动',
  FREE_SPEECH: '言论自由',
  LEGAL_DUTY: '法律责任'
};

// OpenAI API配置
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4o"; // 使用更强大的GPT-4o模型

// 标准API客户端
const apiClient = axios.create({
  baseURL: OPENAI_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  }
});

// 处理SSE流解析
async function parseSSE(response, onParse) {
  const parser = createParser((event) => {
    if (event.type === 'event' && event.data !== '[DONE]') {
      try {
        const data = JSON.parse(event.data);
        onParse(data);
      } catch (error) {
        console.error('解析SSE事件失败:', error);
      }
    }
  });

  // 处理流式响应
  for await (const chunk of response.data) {
    const decoded = new TextDecoder().decode(chunk);
    parser.feed(decoded);
  }
}

// 生成初始场景
async function generateInitialScenario(category) {
  try {
    const theme = GAME_THEMES[category] || '公民责任';
    
    const systemPrompt = `你是一个互动文字冒险游戏的AI主持人，专注于中国公民责任、权利与义务的教育。
    请创建一个关于"${theme}"的起始场景，描述一个道德或法律困境情境。
    场景应当:
    1. 生动描述一个现实世界的情境，让玩家面临与公民责任相关的选择
    2. 明确说明玩家的角色和所处环境
    3. 提示玩家需要决定如何行动
    4. 融入相关的公民权利和义务知识
    5. 保持中立，不暗示"正确"答案
    
    重要：输出必须是有效的JSON格式，不要使用代码块标记（\`\`\`）或其他格式标记！直接返回以下格式：
    
    {
      "scenario": "场景描述文本",
      "rights": ["相关的公民权利1", "相关的公民权利2"],
      "duties": ["相关的公民义务1", "相关的公民义务2"]
    }`;

    const response = await apiClient.post('/chat/completions', {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请生成一个新场景" }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" } // 强制使用JSON响应格式
    });

    // 处理API返回
    const content = response.data.choices[0].message.content;
    let scenarioData;
    
    try {
      scenarioData = JSON.parse(content);
    } catch (error) {
      console.error('解析AI返回内容失败，尝试清理后解析:', error);
      
      // 清理可能的代码块标记和其他非JSON内容
      const cleanedContent = content
        .replace(/```json|```/g, '') // 移除代码块标记
        .replace(/[\u{0000}-\u{001F}]/gu, '') // 移除所有控制字符
        .trim();
      
      try {
        // 尝试解析清理后的内容
        scenarioData = JSON.parse(cleanedContent);
      } catch (cleanError) {
        console.error('清理后仍无法解析JSON，尝试提取JSON部分:', cleanError);
        
        // 尝试从文本中提取JSON
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            scenarioData = JSON.parse(jsonMatch[0]);
          } catch (finalError) {
            console.error('所有解析方法都失败，使用备用结果:', finalError);
            return getFallbackScenario(theme);
          }
        } else {
          console.error('无法提取JSON格式，使用备用结果');
          return getFallbackScenario(theme);
        }
      }
    }
    
    // 验证必要字段
    if (!scenarioData.scenario) {
      console.warn('场景数据缺少必要字段，使用备用场景');
      return getFallbackScenario(theme);
    }
    
    return scenarioData;
    
  } catch (error) {
    console.error('生成场景失败:', error);
    // 返回默认场景，防止游戏崩溃
    return getFallbackScenario(category);
  }
}

// 处理玩家行动 - 流式API
async function processPlayerActionStream(action, context, history, res) {
  try {
    // 设置响应头以支持流式传输
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemPrompt = `你是一个互动文字冒险游戏的AI主持人，专注于中国公民责任、权利与义务的教育。
    根据玩家的行动，请评估他们的选择并生成故事的后续发展。你应该：
    1. 判断玩家的行动是否符合公民责任、法律和道德标准
    2. 生成现实且合理的后果
    3. 提供关于相关权利和义务的教育内容
    4. 根据玩家的选择，故事可能走向积极结局（被表扬、获得成就）或消极结局（面临惩罚、法律后果）
    5. 如果故事达到自然结束点，标记游戏结束；否则继续故事
    
    教育重点：
    - 责任的概念：明确解释玩家行动如何体现了对自己、他人或社会的责任
    - 回报与代价：详细说明履行责任带来的积极影响或逃避责任的负面后果
    - 中国公民基本权利：具体引用中华人民共和国宪法中相关的公民权利条款
    - 中国公民基本义务：具体引用中华人民共和国宪法中相关的公民义务条款
    
    游戏设计：
    - 创建情感共鸣，让玩家感受到其决策的重要性
    - 提供有教育意义、引人入胜的情节
    - 确保每个场景都探索"责任，中国公民的基本权利与义务"的不同方面
    
    重要：输出必须是有效的JSON格式，严格遵循以下结构：
    
    {
      "feedback": "对玩家行动的详细反应和故事发展",
      "evaluation": "POSITIVE/NEGATIVE/NEUTRAL",
      "knowledge": "相关的公民权利或义务知识点",
      "gameOver": false,
      "updatedContext": {},
      "scenario": "新的场景描述（仅当游戏继续时）",
      "rights": ["更新的权利列表"],
      "duties": ["更新的义务列表"]
    }`;

    // 准备API请求
    const streamResponse = await apiClient.post('/chat/completions', {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          currentContext: context,
          playerAction: action,
          actionHistory: history
        })}
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      stream: true // 启用流式输出
    }, {
      responseType: 'stream'
    });

    // 收集完整的JSON响应
    let completeResponse = '';
    let validJSONFound = false;
    let finalJSON = null;
    let responseReceived = false; // 标记是否收到了任何有意义的响应

    // 处理流式响应并向客户端发送数据
    for await (const chunk of streamResponse.data) {
      // 解码数据块
      const chunkText = new TextDecoder().decode(chunk);
      
      // 查找并分离事件数据
      const lines = chunkText.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        // 只处理以"data: "开头的行
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          responseReceived = true; // 标记已收到响应
          
          // 检查是否是结束标志
          if (data === '[DONE]') {
            // 完成流处理，尝试解析最终的JSON
            try {
              if (completeResponse && !validJSONFound) {
                // 尝试从累积的响应中提取JSON
                const jsonMatch = completeResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  try {
                    finalJSON = JSON.parse(jsonMatch[0]);
                    validJSONFound = true;
                    console.log('成功从流中解析JSON');
                  } catch (parseErr) {
                    console.error('从提取的文本解析JSON失败:', parseErr);
                    
                    // 尝试清理JSON字符串然后再解析
                    const cleanedJson = jsonMatch[0]
                      .replace(/\\n/g, ' ')
                      .replace(/\\"/g, '"')
                      .replace(/\\\\/g, '\\');
                    
                    try {
                      finalJSON = JSON.parse(cleanedJson);
                      validJSONFound = true;
                      console.log('成功从清理后的文本中解析JSON');
                    } catch (finalErr) {
                      console.error('清理后仍无法解析JSON:', finalErr);
                      
                      // 新增：尝试通过启发式方法构建一个合理的JSON
                      try {
                        // 提取可能的关键字段
                        const feedbackMatch = completeResponse.match(/"feedback"\s*:\s*"([^"]*)"/) || 
                                             completeResponse.match(/feedback[^"]*"([^"]*)"/);
                        const scenarioMatch = completeResponse.match(/"scenario"\s*:\s*"([^"]*)"/) || 
                                             completeResponse.match(/scenario[^"]*"([^"]*)"/);
                        
                        if (feedbackMatch && scenarioMatch) {
                          console.log('尝试通过启发式方法构建JSON');
                          finalJSON = {
                            feedback: feedbackMatch[1],
                            scenario: scenarioMatch[1],
                            evaluation: completeResponse.includes('POSITIVE') ? 'POSITIVE' : 
                                        completeResponse.includes('NEGATIVE') ? 'NEGATIVE' : 'NEUTRAL',
                            knowledge: "根据收到的内容提供合理的知识点。",
                            gameOver: completeResponse.includes('gameOver') && completeResponse.includes('true'),
                            rights: [],
                            duties: []
                          };
                          validJSONFound = true;
                        }
                      } catch (heuristicErr) {
                        console.error('启发式解析失败:', heuristicErr);
                      }
                    }
                  }
                }
              }
              
              // 如果成功解析了JSON，发送给客户端
              if (validJSONFound && finalJSON) {
                // 确保有必要的字段
                if (!finalJSON.feedback || !finalJSON.scenario) {
                  const fallback = getFallbackActionResult(action);
                  finalJSON = {
                    ...finalJSON,
                    feedback: finalJSON.feedback || fallback.feedback,
                    scenario: finalJSON.scenario || fallback.scenario,
                    evaluation: finalJSON.evaluation || fallback.evaluation,
                    knowledge: finalJSON.knowledge || fallback.knowledge,
                    gameOver: finalJSON.gameOver || fallback.gameOver,
                    rights: finalJSON.rights || fallback.rights,
                    duties: finalJSON.duties || fallback.duties
                  };
                }
                
                res.write(`data: ${JSON.stringify(finalJSON)}\n\n`);
              } else if (responseReceived) {
                // 如果至少收到了一些响应，但无法解析为JSON，尝试构建一个基于收到内容的伪响应
                console.warn('无法从流式响应中提取有效JSON，但收到了响应数据');
                let customResponse = {
                  feedback: `你决定"${action}"。`,
                  evaluation: "NEUTRAL",
                  knowledge: "处理响应时遇到技术问题，但游戏仍会继续。",
                  gameOver: false,
                  scenario: "请继续你的冒险...",
                  rights: [],
                  duties: []
                };
                
                // 如果我们收集到了一些文本，尝试从中提取有用信息
                if (completeResponse.length > 20) {
                  // 提取可能的段落来用作反馈和场景
                  const paragraphs = completeResponse
                    .split(/\n\n|\.\s+/)
                    .filter(p => p.length > 15 && p.length < 500);
                  
                  if (paragraphs.length >= 2) {
                    customResponse.feedback = paragraphs[0];
                    customResponse.scenario = paragraphs[1];
                  } else if (paragraphs.length === 1) {
                    const middlePoint = Math.floor(paragraphs[0].length / 2);
                    customResponse.feedback = paragraphs[0].substring(0, middlePoint);
                    customResponse.scenario = paragraphs[0].substring(middlePoint);
                  }
                }
                
                console.log('发送构建的响应:', customResponse);
                res.write(`data: ${JSON.stringify(customResponse)}\n\n`);
              } else {
                // 如果无法解析JSON，发送备用响应
                console.error('无法从流式响应中提取有效JSON');
                res.write(`data: ${JSON.stringify(getFallbackActionResult(action))}\n\n`);
              }
            } catch (error) {
              console.error('最终解析JSON失败:', error);
              res.write(`data: ${JSON.stringify(getFallbackActionResult(action))}\n\n`);
            }
            
            // 结束响应流
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          } else {
            try {
              // 尝试解析当前块作为JSON
              const parsedData = JSON.parse(data);
              
              // 检查是否是完整的JSON对象（不只是增量更新）
              if (parsedData.choices && parsedData.choices[0] && parsedData.choices[0].delta) {
                const delta = parsedData.choices[0].delta;
                
                // 收集内容部分
                if (delta.content) {
                  completeResponse += delta.content;
                  
                  // 尝试实时解析JSON（如果已经收到完整JSON）
                  try {
                    // 只尝试解析看起来像完整JSON的字符串
                    if (completeResponse.trim().startsWith('{') && completeResponse.trim().endsWith('}')) {
                      const potentialJson = JSON.parse(completeResponse);
                      if (potentialJson.feedback && potentialJson.scenario) {
                        finalJSON = potentialJson;
                        validJSONFound = true;
                        console.log('实时解析JSON成功');
                      }
                    }
                  } catch (e) {
                    // 尚未收到完整的JSON，继续收集
                  }
                  
                  // 发送增量更新到客户端
                  res.write(`data: ${JSON.stringify({
                    type: 'INCREMENT',
                    content: delta.content
                  })}\n\n`);
                }
              }
            } catch (error) {
              // 无法解析此块，忽略并继续
              console.warn('无法解析数据块:', error);
            }
          }
        }
      }
    }
    
    // 防止流没有正确结束
    if (!validJSONFound) {
      if (responseReceived && completeResponse.length > 30) {
        // 如果收到了有意义的响应但无法解析为JSON，尝试构建自定义响应
        console.warn('流处理未正确结束，但有收集到内容，尝试构建响应');
        
        const customResponse = {
          feedback: `你决定"${action}"。`,
          evaluation: "NEUTRAL",
          knowledge: "游戏遇到了技术问题，但我们会继续。",
          gameOver: false,
          scenario: "请继续输入你的下一步行动...",
          rights: [],
          duties: []
        };
        
        // 尝试从收集到的文本中提取有用内容
        if (completeResponse.length > 0) {
          // 提取可能的段落
          const paragraphs = completeResponse
            .split(/\n\n|\.\s+/)
            .filter(p => p.trim().length > 10 && p.trim().length < 500);
          
          if (paragraphs.length >= 2) {
            customResponse.feedback = paragraphs[0];
            customResponse.scenario = paragraphs[1];
            
            // 尝试确定评估类型
            if (completeResponse.toLowerCase().includes('正确') || 
                completeResponse.toLowerCase().includes('好的') ||
                completeResponse.toLowerCase().includes('积极')) {
              customResponse.evaluation = 'POSITIVE';
            } else if (completeResponse.toLowerCase().includes('错误') || 
                      completeResponse.toLowerCase().includes('不应该') ||
                      completeResponse.toLowerCase().includes('负面')) {
              customResponse.evaluation = 'NEGATIVE';  
            }
          }
        }
        
        res.write(`data: ${JSON.stringify(customResponse)}\n\n`);
      } else {
        console.error('流处理未能正确结束或未找到有效JSON');
        res.write(`data: ${JSON.stringify(getFallbackActionResult(action))}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('处理行动流出错:', error);
    try {
      // 发送错误信息给客户端
      res.write(`data: ${JSON.stringify({
        type: 'ERROR',
        error: '处理请求时发生错误'
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e) {
      console.error('在错误处理中尝试写入响应时失败:', e);
      res.status(500).json({ error: '处理玩家行动失败' });
    }
  }
}

// 处理玩家行动 - 非流式API (备用)
async function processPlayerAction(action, context, history) {
  try {
    const systemPrompt = `你是一个互动文字冒险游戏的AI主持人，专注于中国公民责任、权利与义务的教育。
    根据玩家的行动，请评估他们的选择并生成故事的后续发展。你应该：
    1. 判断玩家的行动是否符合公民责任、法律和道德标准
    2. 生成现实且合理的后果
    3. 提供关于相关权利和义务的教育内容
    4. 根据玩家的选择，故事可能走向积极结局（被表扬、获得成就）或消极结局（面临惩罚、法律后果）
    5. 如果故事达到自然结束点，标记游戏结束；否则继续故事
    
    教育重点：
    - 责任的概念：明确解释玩家行动如何体现了对自己、他人或社会的责任
    - 回报与代价：详细说明履行责任带来的积极影响或逃避责任的负面后果
    - 中国公民基本权利：具体引用中华人民共和国宪法中相关的公民权利条款
    - 中国公民基本义务：具体引用中华人民共和国宪法中相关的公民义务条款
    
    重要：输出必须是有效的JSON格式，不要使用代码块标记（\`\`\`）或其他格式标记！直接返回以下格式：
    
    {
      "feedback": "对玩家行动的详细反应和故事发展",
      "evaluation": "POSITIVE/NEGATIVE/NEUTRAL",
      "knowledge": "相关的公民权利或义务知识点",
      "gameOver": false,
      "updatedContext": {},
      "scenario": "新的场景描述（仅当游戏继续时）",
      "rights": ["更新的权利列表"],
      "duties": ["更新的义务列表"]
    }`;

    const response = await apiClient.post('/chat/completions', {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          currentContext: context,
          playerAction: action,
          actionHistory: history
        })}
      ],
      temperature: 0.7,
      response_format: { type: "json_object" } // 强制使用JSON响应格式
    });

    const content = response.data.choices[0].message.content;
    let actionResult;
    
    try {
      // 首先尝试直接解析整个响应
      actionResult = JSON.parse(content);
    } catch (error) {
      console.error('解析AI返回内容失败，尝试清理后解析:', error);
      
      // 清理可能的代码块标记和其他非JSON内容
      const cleanedContent = content
        .replace(/```json|```/g, '') // 移除代码块标记
        .replace(/[\u{0000}-\u{001F}]/gu, '') // 移除所有控制字符
        .trim();
      
      try {
        // 尝试解析清理后的内容
        actionResult = JSON.parse(cleanedContent);
      } catch (cleanError) {
        console.error('清理后仍无法解析JSON，尝试提取JSON部分:', cleanError);
        
        // 尝试从文本中提取JSON（更强大的正则表达式）
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          try {
            actionResult = JSON.parse(jsonMatch[0]);
          } catch (finalError) {
            console.error('所有解析方法都失败，使用备用结果:', finalError);
            return getFallbackActionResult(action);
          }
        } else {
          console.error('无法提取JSON格式，使用备用结果');
          return getFallbackActionResult(action);
        }
      }
    }
    
    // 验证结果中包含必要的字段
    if (!actionResult.feedback || !actionResult.scenario) {
      console.warn('AI返回的JSON缺少必要字段，填充默认值');
      const fallback = getFallbackActionResult(action);
      return {
        feedback: actionResult.feedback || fallback.feedback,
        evaluation: actionResult.evaluation || fallback.evaluation,
        knowledge: actionResult.knowledge || fallback.knowledge,
        gameOver: actionResult.gameOver || fallback.gameOver,
        updatedContext: actionResult.updatedContext || {},
        scenario: actionResult.scenario || fallback.scenario,
        rights: actionResult.rights || fallback.rights,
        duties: actionResult.duties || fallback.duties
      };
    }
    
    return actionResult;
  } catch (error) {
    console.error('处理行动失败:', error);
    // 返回默认结果，防止游戏崩溃
    return getFallbackActionResult(action);
  }
}

// 默认场景，在API调用失败时使用
function getFallbackScenario(theme) {
  const themeText = GAME_THEMES[theme] || theme;
  
  return {
    scenario: `【离线模式 - API连接失败】\n\n你走在城市的街道上，看到一个与${themeText}相关的情况正在发生。你需要决定如何应对这一情况。\n\n请输入你想采取的行动...`,
    rights: ["知情权", "参与权"],
    duties: ["遵守法律义务", "保护环境义务"]
  };
}

// 默认行动结果，在API调用失败时使用
function getFallbackActionResult(action) {
  return {
    feedback: `【离线模式 - API连接失败】\n\n你决定"${action}"。这个选择产生了一定的影响，但系统无法详细评估。请继续输入你的下一步行动...`,
    evaluation: "NEUTRAL",
    knowledge: "作为公民，我们有权利做出自己的选择，同时也有责任承担选择带来的后果。",
    gameOver: false,
    updatedContext: {},
    scenario: `请继续输入你的下一步行动...`,
    rights: ["知情权", "参与权"],
    duties: ["遵守法律义务", "公民责任"]
  };
}

module.exports = {
  generateInitialScenario,
  processPlayerAction,
  processPlayerActionStream,
  GAME_THEMES
};