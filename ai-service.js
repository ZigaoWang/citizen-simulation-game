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

// 清理JSON字符串，替换中文引号和标点
function sanitizeJsonString(jsonString) {
  if (!jsonString) return '';
  
  return jsonString
    // 替换中文引号为英文引号
    .replace(/[""]/g, '"')
    .replace(/['']/, "'")
    // 替换中文冒号为英文冒号
    .replace(/：/g, ':')
    // 替换中文逗号为英文逗号
    .replace(/，/g, ',')
    // 替换中文括号为英文括号
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    .replace(/｛/g, '{')
    .replace(/｝/g, '}')
    // 处理常见句末省略问题
    .replace(/(\w)…/g, '$1...')
    .replace(/(\w)\.{2}(?!\.)/, '$1...')
    // 可能导致JSON解析错误的空格处理
    .replace(/([{,])\s*"(\w+)"\s*:/, '$1"$2":')
    // 确保字符串属性值正确闭合
    .replace(/"([^"]*?)([^\\"])"/g, '"$1$2"')
    // 替换其他可能导致问题的字符
    .replace(/\\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ');
}

// 尝试解析JSON，使用多种策略
function tryParseJson(jsonString) {
  if (!jsonString) return null;
  
  // 清理JSON字符串
  const cleanedJson = sanitizeJsonString(jsonString);
  
  // 尝试直接解析
  try {
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.warn('直接解析JSON失败，尝试提取JSON对象:', error);
    
    // 尝试提取JSON对象
    try {
      const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (extractError) {
      console.warn('提取JSON对象失败，尝试修复常见语法错误:', extractError);
      
      // 尝试修复常见语法错误
      try {
        // 处理属性名没有引号的情况
        const fixedJson = cleanedJson
          .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
          // 处理多余的逗号
          .replace(/,\s*([}\]])/g, '$1');
        
        return JSON.parse(fixedJson);
      } catch (fixError) {
        console.warn('修复JSON语法错误失败，尝试提取关键字段:', fixError);
        
        // 如果所有解析方法都失败，尝试提取关键字段构建新的JSON
        try {
          const feedbackMatch = cleanedJson.match(/"feedback"\s*:\s*"([^"]*)"/);
          const scenarioMatch = cleanedJson.match(/"scenario"\s*:\s*"([^"]*)"/);
          const evaluationMatch = cleanedJson.match(/"evaluation"\s*:\s*"([^"]*)"/);
          const knowledgeMatch = cleanedJson.match(/"knowledge"\s*:\s*"([^"]*)"/);
          
          if (feedbackMatch && scenarioMatch) {
            // 确保评估类型始终为有效值
            let evaluation = "NEUTRAL";
            if (evaluationMatch) {
              const rawEval = evaluationMatch[1].toUpperCase();
              if (rawEval.includes("POSITIVE")) {
                evaluation = "POSITIVE";
              } else if (rawEval.includes("NEGATIVE")) {
                evaluation = "NEGATIVE";
              }
            }
            
            return {
              feedback: feedbackMatch[1],
              scenario: scenarioMatch[1],
              evaluation: evaluation,
              knowledge: knowledgeMatch ? knowledgeMatch[1] : "处理响应时遇到技术问题，但游戏仍会继续。",
              gameOver: false,
              rights: [],
              duties: []
            };
          }
        } catch (fieldExtractionError) {
          console.error('所有JSON解析方法都失败:', fieldExtractionError);
          return null;
        }
      }
    }
  }
  
  return null;
}

// 生成初始场景
async function generateInitialScenario(category, playerName = '') {
  try {
    const theme = GAME_THEMES[category] || '公民责任';
    const characterName = playerName || '公民'; // 使用玩家名字，如果没有则使用通用称呼
    
    const systemPrompt = `你是一个互动文字冒险游戏的AI主持人，专注于中国公民责任、权利与义务的教育。
    
    # 你的任务
    请创建一个关于"${theme}"的起始场景，描述一个与中国公民权利和义务相关的情境。
    
    # 游戏主角
    - 主角的名字是：${characterName}
    - 在生成的场景中，请使用"${characterName}"来称呼主角，而不是使用"你"
    - 场景描述应该使用第三人称，例如："${characterName}是一名大学生，正在校园内散步..."
    
    # 场景设计要求
    1. 生动且具体地描述一个现实世界的情境，让玩家面临与公民责任相关的选择
    2. 明确说明玩家的角色（身份、处境）和所处环境（地点、时间、背景）
    3. 描述一个具体的情境，而不是以问题结尾
    4. 场景中需要包含与中国公民权利和义务相关的元素
    5. 保持中立，不暗示"正确"答案
    6. 结尾应描述一个明确的情境，让玩家能够做出具体决定（而不是询问玩家）
    7. 设计富有冲突和道德困境的场景，让玩家必须权衡不同责任或利益
    8. 创造紧张感和急迫性，让玩家的决策显得重要且有影响力
    9. 加入多方利益冲突，没有完全正确或错误的选择
    10. 引入可能挑战玩家价值观的复杂社会议题
    
    # 冲突设计原则
    - 个人利益与社会责任的冲突
    - 不同权利之间的冲突（如言论自由与他人名誉权）
    - 不同义务之间的冲突（如举报违法行为与保护亲友）
    - 短期利益与长期影响的权衡
    - 法律规定与道德考量的差异
    - 不同群体间的价值观冲突
    
    # 教育主题要点
    - 责任的概念：对自己、他人和社会的责任
    - 责任的回报与代价：履行责任的积极影响和逃避责任的负面后果
    - 中国公民基本权利：如平等权、自由权、政治权利、社会经济权利等
    - 中国公民基本义务：如遵守宪法法律、维护国家安全、依法纳税等
    
    # JSON格式注意事项
    - 所有字符串必须使用英文双引号（"）包围，不能使用中文引号
    - 所有属性名必须使用英文双引号（"）包围
    - 字符串内如有引号需要转义，例如: "这是\"引用\"文本"
    - 确保JSON结构完整，所有括号和引号正确配对
    - 数组元素之间使用英文逗号（,）分隔
    - 最后一个属性后不要添加逗号
    
    # 场景示例
    "${characterName}是一名大学生，正在校园内散步。突然，${characterName}看到前方有两名学生在激烈争吵，似乎随时可能爆发肢体冲突。其中一人情绪非常激动，手中拿着一个玻璃瓶。周围已经有不少学生驻足观望，但没人上前制止。${characterName}注意到不远处有一名保安，但他似乎还没有注意到这边的情况。${characterName}认识其中一名争吵的学生，是宿舍的同学，之前他曾经帮助过${characterName}。此时，玻璃瓶在争执中被打翻，碎片飞溅，情况变得更加危险。"
    
    # 更好的场景示例（含更多冲突和道德困境）
    "${characterName}是一家新媒体公司的编辑，负责审核即将发布的一篇关于本地食品安全问题的调查报告。这篇报告揭露了城市最受欢迎的连锁餐厅存在严重的食品安全隐患。文章中包含了餐厅员工提供的内部照片和证词，指出餐厅使用过期原料和不卫生操作。就在${characterName}准备最终审核时，公司总监告诉${characterName}该餐厅是公司的重要广告客户，暗示${characterName}'适当调整'文章内容。同时，${characterName}的调查记者坚持完整发布，认为这关乎公众健康。更复杂的是，${characterName}刚刚得知，如果失去这家餐厅的广告，公司可能需要裁员，而几位同事正面临家庭经济困难。现在文章的发布时间就在今晚，${characterName}必须做出决定。"
    
    # 输出格式要求
    输出必须是有效的JSON格式，不要使用代码块标记（\`\`\`）或其他格式标记！直接返回以下格式：
    
    {
      "scenario": "详细的场景描述，必须以具体情境结束，不要以问句结尾",
      "rights": ["相关的中国公民权利1", "相关的中国公民权利2"],
      "duties": ["相关的中国公民义务1", "相关的中国公民义务2"]
    }`;

    const response = await apiClient.post('/chat/completions', {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请生成一个新场景" }
      ],
      temperature: 0.7,
      max_tokens: 2048, // 增加生成长度
      response_format: { type: "json_object" } // 强制使用JSON响应格式
    });

    // 处理API返回
    const content = response.data.choices[0].message.content;
    let scenarioData;
    
    try {
      // 使用增强的JSON解析函数
      scenarioData = tryParseJson(content);
      if (!scenarioData) {
        throw new Error('无法解析场景JSON');
      }
    } catch (error) {
      console.error('解析AI返回内容失败:', error);
      return getFallbackScenario(theme, characterName);
    }
    
    // 验证必要字段
    if (!scenarioData.scenario) {
      console.warn('场景数据缺少必要字段，使用备用场景');
      return getFallbackScenario(theme, characterName);
    }
    
    // 确保rights和duties是数组
    if (!Array.isArray(scenarioData.rights)) scenarioData.rights = [];
    if (!Array.isArray(scenarioData.duties)) scenarioData.duties = [];
    
    return scenarioData;
    
  } catch (error) {
    console.error('生成场景失败:', error);
    // 返回默认场景，防止游戏崩溃
    return getFallbackScenario(category, playerName || '公民');
  }
}

// 在处理玩家行动的流式API部分，确保完整捕获JSON内容
// 增强方法，通过启发式方法修复不完整的JSON
function repairIncompleteJson(jsonString) {
  // 已经是有效JSON，直接返回
  try {
    JSON.parse(jsonString);
    return jsonString;
  } catch (e) {
    // 继续修复流程
  }
  
  let fixedJson = jsonString;
  
  // 修复未闭合的字符串
  const openQuotes = (fixedJson.match(/"/g) || []).length;
  if (openQuotes % 2 !== 0) {
    // 有未闭合的引号，尝试找到并修复
    const props = ['feedback', 'evaluation', 'knowledge', 'scenario'];
    for (const prop of props) {
      const propRegex = new RegExp(`"${prop}"\\s*:\\s*"([^"]*?)([^\\\\])(?!")`, 'g');
      fixedJson = fixedJson.replace(propRegex, `"${prop}":"$1$2"`);
    }
  }
  
  // 确保JSON对象正确闭合
  if (fixedJson.trim().startsWith('{') && !fixedJson.trim().endsWith('}')) {
    fixedJson = fixedJson.trim() + '}';
  }
  
  // 修复缺失的逗号
  fixedJson = fixedJson.replace(/}{\s*"/, '},{');
  
  // 检查是否成功修复
  try {
    JSON.parse(fixedJson);
    return fixedJson;
  } catch (e) {
    // 仍然失败，记录并返回原始字符串
    console.warn('自动修复JSON失败:', e);
    return jsonString;
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
    根据玩家的行动，请评估他们的选择并生成故事的后续发展。
    
    # 重要提示
    - 必须输出明确的场景描述，让玩家知道具体发生了什么以及有哪些可能的选择
    - 每个场景需要为玩家设置清晰的决策点，描述玩家面临的多个具体选择方向
    - 不要使用"你决定如何做..."这类开放式提问，而应该提供具体情境以便玩家做出明确选择
    - 你的响应不应该是对用户输入的简短反馈，而是详细的游戏情节推进，包括玩家行动的后果
    - 你必须严格按照JSON格式规范输出，确保所有引号、逗号、大括号正确配对
    - 绝对不要使用中文引号（"" ''）或其他非ASCII标准引号，只使用英文引号 " 和 '
    - 所有文本必须完整，不得使用省略号结尾或留下未完成的句子
    - 场景描述必须足够详细（至少5-6句话），并以明确的决策环境结束，引导玩家进行下一步选择
    - 每个返回必须包含清晰的情境和至少2-3个可能的行动方向，让玩家知道可以怎么做
    
    # 你的任务
    1. 评估玩家的选择是否符合公民责任、法律和道德标准
    2. 生成真实且详细的后果场景（不少于5句话）
    3. 提供关于相关中国公民权利和义务的教育内容
    4. 根据玩家选择，推进故事走向（积极或消极）
    5. 设置下一个明确的决策点，为玩家提供多个具体的可能选择
    6. 确保所有文本字段完整，每个场景都给玩家明确的选择空间和行动结果
    7. 明确说明玩家行动可能导致的后果
    8. 创造情节冲突和紧张感，使游戏更有吸引力和教育意义
    9. 为玩家创设重大道德困境和价值取舍，使其深入思考公民责任
    10. 设计有意义的抉择，让玩家权衡个人利益与社会责任的关系
    
    # 故事进展管理
    - 故事必须有连贯性和进展性，不要在updatedContext中简单分类当前情境
    - updatedContext字段应该包含与前一场景直接相关的信息，让故事自然流动
    - 每个场景都应该考虑玩家的前一个选择，形成连贯的故事线
    - 场景转换应该自然，不要突然跳到不相关的主题
    - 创造紧张情境和道德困境，给玩家有意义的选择
    - 确保场景描述包含玩家行动的具体后果和反应
    - 增加情节冲突和张力，让玩家感到自己的选择至关重要
    - 设计多方利益冲突，让玩家权衡不同方面的责任和义务
    - 加入道德灰色地带的情境，挑战玩家的价值观和责任感
    - 引入现实中的复杂社会问题，探索权利与义务的平衡点
    
    # 冲突设计原则
    - 利益冲突：设计情境让玩家必须在个人利益和社会责任间做选择
    - 权利冲突：创造场景让不同人的权利发生冲突，玩家需要权衡
    - 义务冲突：让玩家面对多重义务无法同时满足的情况
    - 价值观冲突：设计挑战玩家道德底线的情境
    - 时间紧迫性：增加时间压力，让玩家在有限时间内做出选择
    - 信息不对称：提供不完整信息，让玩家在不确定性中做决策
    - 代价与风险：每个选择都有明确的代价和风险，没有完美解决方案
    
    # 教育重点
    - 责任的概念：具体解释玩家行动如何体现对自己、他人或社会的责任
    - 回报与代价：详细说明履行责任带来的积极影响或逃避责任的负面后果
    - 中国公民基本权利：引用中华人民共和国宪法中相关的公民权利条款
    - 中国公民基本义务：引用中华人民共和国宪法中相关的公民义务条款
    - 权利与义务的平衡：探讨如何在维护自身权利的同时履行对社会的义务
    - 责任的不同维度：包括法律责任、道德责任、社会责任和历史责任等
    - 公民素养：强调理性、包容、协商等解决冲突的方式
    
    # 输出格式要求
    输出必须是有效的标准JSON格式，严格按照以下结构，使用英文引号和标点：
    
    {
      "feedback": "对玩家行动的详细回应（必须完整，不可省略，至少3-4句话）",
      "evaluation": "POSITIVE或NEGATIVE或NEUTRAL",
      "knowledge": "相关公民权利或义务的知识点（必须完整，至少2-3句话）",
      "gameOver": false,
      "updatedContext": {"scenario": "当前故事的具体情况，而不是抽象分类。例如：'记者揭露食品安全问题'，而不是简单分类为'市场管理'"},
      "scenario": "新场景的详细描述（至少5-6句话），必须以具体情境结束，而不是提问。场景应该为玩家提供明确的决策环境和多个可能的选择方向。最后两句应明确指出玩家可以采取的2-3个不同行动及其可能的后果。",
      "rights": ["相关权利1", "相关权利2"],
      "duties": ["相关义务1", "相关义务2"]
    }
    
    # JSON格式注意事项
    - 所有字符串必须使用英文双引号（"）包围，不能使用中文引号
    - 所有属性名必须使用英文双引号（"）包围
    - 字符串内如有引号需要转义，例如: "这是\"引用\"文本"
    - 确保JSON结构完整，所有括号和引号正确配对
    - 数组元素之间使用英文逗号（,）分隔
    - 最后一个属性后不要添加逗号
    - 所有文本必须完整，不得使用省略号或未完成句子
    
    # 输出示例
    以下是一个良好响应的示例：
    
    {
      "feedback": "你选择了举报摊贩售卖的过期食品，这是负责任的行为。市场监管人员迅速到达现场，核实了你的举报，感谢你保护消费者权益的行为。你的举报不仅阻止了更多人购买不安全食品，也向其他商家传递了遵守食品安全法规的重要信息。",
      "evaluation": "POSITIVE",
      "knowledge": "《中华人民共和国食品安全法》规定，食品经营者必须保证食品安全，不得销售过期、变质或者不符合食品安全标准的食品。消费者有权举报违法行为，保护自己和他人的健康权益。这种公民监督是维护社会公共安全的重要方式。",
      "gameOver": false,
      "updatedContext": {"scenario": "食品安全举报引发社区紧张关系"},
      "scenario": "市场监管人员对摊贩进行了处罚，并将案件记录在案。几天后，当地媒体报道了这起食品安全事件，引发了公众对市场监管的广泛讨论。然而，意想不到的是，被处罚摊贩突然出现在你家门口，情绪激动地指责你毁了他的生意和家庭。他声泪俱下地解释自己是家中唯一的经济来源，有一个生病的孩子需要治疗，而现在因为巨额罚款，他无法支付孩子的医药费。周围邻居也围观议论，有人支持你维护食品安全的行为，也有人同情这位摊贩的处境。同时，市场监管部门发来短信，邀请你作为典型公民代表参加食品安全宣传活动，接受媒体采访。你现在面临艰难抉择：你可以接受邀请，进一步宣传食品安全的重要性，但这可能会加剧摊贩对你的敌意；你可以私下与摊贩沟通，了解其困境并考虑是否能够以其他方式帮助他的家庭；或者你可以向市场监管部门申请减轻对摊贩的处罚，但这可能会被视为对食品安全监管的干预。",
      "rights": ["知情权", "健康权", "表达权"],
      "duties": ["维护公共安全的义务", "协助行政执法的义务", "关爱社会弱势群体的道德责任"]
    }
    
    记住：scenario必须描述一个具体情境，而不是以问句结束。必须为玩家创造具体场景，让他们能做出明确选择。每个场景都应以句号结尾，不能使用省略号或未完成的句子。必须提供多个可能的行动方向和每种选择可能带来的后果。故事必须连贯，且有明显的情节发展和冲突。`;

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
      max_tokens: 2048, // 增加生成长度，避免截断
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
                // 使用增强的JSON解析功能前，先尝试修复JSON
                completeResponse = repairIncompleteJson(completeResponse);
                
                // 确保JSON完整
                if (completeResponse.trim().startsWith('{') && !completeResponse.trim().endsWith('}')) {
                  console.warn('检测到JSON可能未闭合，尝试修复');
                  completeResponse = completeResponse.trim() + '}';
                }
                
                finalJSON = tryParseJson(completeResponse);
                if (finalJSON) {
                  validJSONFound = true;
                  console.log('成功解析完整响应JSON');
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
                    rights: finalJSON.rights || fallback.rights || [],
                    duties: finalJSON.duties || fallback.duties || []
                  };
                }
                
                // 验证并修正评估值
                if (finalJSON.evaluation) {
                  const evalUpper = finalJSON.evaluation.toString().toUpperCase();
                  if (evalUpper.includes("POSITIVE")) {
                    finalJSON.evaluation = "POSITIVE";
                  } else if (evalUpper.includes("NEGATIVE")) {
                    finalJSON.evaluation = "NEGATIVE";
                  } else {
                    finalJSON.evaluation = "NEUTRAL";
                  }
                } else {
                  finalJSON.evaluation = "NEUTRAL";
                }
                
                // 确保rights和duties是数组
                if (!Array.isArray(finalJSON.rights)) finalJSON.rights = [];
                if (!Array.isArray(finalJSON.duties)) finalJSON.duties = [];
                
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
                  
                  // 尝试确定评估类型
                  if (completeResponse.toLowerCase().includes('正确') || 
                      completeResponse.toLowerCase().includes('好的') ||
                      completeResponse.toLowerCase().includes('积极') ||
                      completeResponse.toLowerCase().includes('positive')) {
                    customResponse.evaluation = 'POSITIVE';
                  } else if (completeResponse.toLowerCase().includes('错误') || 
                            completeResponse.toLowerCase().includes('不应该') ||
                            completeResponse.toLowerCase().includes('负面') ||
                            completeResponse.toLowerCase().includes('negative')) {
                    customResponse.evaluation = 'NEGATIVE';  
                  } else {
                    customResponse.evaluation = 'NEUTRAL';  // 确保默认值为NEUTRAL
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
                    if (completeResponse.trim().startsWith('{')) {
                      // 先修复可能不完整的JSON
                      const repairedJson = repairIncompleteJson(completeResponse);
                      
                      const potentialJson = tryParseJson(repairedJson);
                      if (potentialJson && potentialJson.feedback && potentialJson.scenario) {
                        // 验证并修正评估值
                        if (potentialJson.evaluation) {
                          const evalUpper = potentialJson.evaluation.toString().toUpperCase();
                          if (evalUpper.includes("POSITIVE")) {
                            potentialJson.evaluation = "POSITIVE";
                          } else if (evalUpper.includes("NEGATIVE")) {
                            potentialJson.evaluation = "NEGATIVE";
                          } else {
                            potentialJson.evaluation = "NEUTRAL";
                          }
                        } else {
                          potentialJson.evaluation = "NEUTRAL";
                        }
                        
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
                completeResponse.toLowerCase().includes('积极') ||
                completeResponse.toLowerCase().includes('positive')) {
              customResponse.evaluation = 'POSITIVE';
            } else if (completeResponse.toLowerCase().includes('错误') || 
                      completeResponse.toLowerCase().includes('不应该') ||
                      completeResponse.toLowerCase().includes('负面') ||
                      completeResponse.toLowerCase().includes('negative')) {
              customResponse.evaluation = 'NEGATIVE';  
            } else {
              customResponse.evaluation = 'NEUTRAL';  // 确保默认值为NEUTRAL
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
      max_tokens: 2048, // 增加生成长度，避免截断
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

// 获取备用场景
function getFallbackScenario(theme, characterName = '公民') {
  // 主题映射到合适的备用场景
  const fallbackScenarios = {
    // 环保主题
    ENVIRONMENTAL: {
      scenario: `${characterName}是一家化工企业的员工，负责监测废水排放数据。一天，${characterName}发现公司的废水处理设施出现故障，已经连续三天超标排放有害物质，可能对附近河流和居民区造成严重污染。公司管理层已经知晓这个问题，但决定暂缓维修以保证生产进度，声称这只是'暂时的小问题'。然而，${characterName}通过私下检测发现，废水中的有害物质含量是安全标准的十倍以上。同时，${characterName}得知有环保督察组即将来访，公司计划提供之前的'正常'数据以应对检查。更让${characterName}纠结的是，${characterName}刚刚得知自己被列入下个月的晋升名单，而公司明确表示希望所有员工在督察期间'齐心协力保护公司形象'。${characterName}的大学同学就在本地环保局工作，最近刚成为督察组成员。此刻，${characterName}手中有确凿的污染数据和证据，却面临着职业前景和环保责任的两难选择。`,
      rights: ["知情权", "健康环境权", "举报权"],
      duties: ["保护环境的义务", "遵守法律的义务", "诚实守信的道德义务"]
    },
    
    // 言论自由主题
    FREE_SPEECH: {
      scenario: `${characterName}是一家流行社交媒体平台的内容审核员，负责审核用户发布的内容是否符合平台规范。今天，${characterName}发现一篇关于当地政府建设项目的热门帖子，文章中有用户提供的照片显示该项目可能存在安全隐患和资金使用不当问题。这篇帖子迅速引发了热议，获得了大量转发和评论。就在${characterName}审核过程中，${characterName}收到了来自上级的特别通知，指出该帖子'可能含有未经证实的信息，建议按照平台规定处理'。同时，${characterName}注意到发帖用户是一位知名的独立记者，以深入调查社会问题著称。更复杂的是，${characterName}的好友在那个建设项目工作，曾私下向${characterName}抱怨过项目管理的问题，证实了帖子中的部分指控。如果${characterName}允许帖子保留，可能会引发更大范围的公众讨论甚至抗议；如果${characterName}移除帖子，可能会被视为压制言论自由和掩盖真相。平台的决策将在一小时后生效，${characterName}必须做出选择。`,
      rights: ["言论自由权", "知情权", "监督权"],
      duties: ["遵守法律法规的义务", "遵守职业道德", "维护社会稳定的责任"]
    },
    
    // 法律责任主题
    LEGAL_DUTY: {
      scenario: `${characterName}是一家科技公司的中层管理者，今天意外发现公司财务系统存在严重漏洞，导致客户的个人信息和支付数据面临泄露风险。初步调查显示，这个漏洞已经存在三个月，可能有上千用户的数据已经被不明人士访问。公司高层在得知情况后，决定悄悄修复问题但不通知用户和监管机构，理由是'避免不必要的恐慌和公司声誉损失'。作为会议参与者，${characterName}被要求签署保密协议。然而，根据《网络安全法》规定，发生数据泄露事件必须及时向用户和监管部门报告。更让${characterName}纠结的是，${characterName}发现自己的亲属也是可能受影响的用户之一，而公司打算启动的一个重要项目将由${characterName}负责，这对${characterName}的职业发展至关重要。此时，一位技术团队成员私下告诉${characterName}，他计划向媒体匿名举报此事，并希望${characterName}能提供更多内部证据。${characterName}面临着法律义务、职业道德、个人忠诚和家人安全的多重考量。`,
      rights: ["知情权", "个人信息保护权", "公民监督权"],
      duties: ["遵守法律的义务", "职业道德责任", "保护他人合法权益的义务"]
    },
    
    // 默认主题
    DEFAULT: {
      scenario: `${characterName}是一名普通市民，在下班回家的路上，目睹了一起交通事故。一辆汽车撞倒了一位骑电动自行车的外卖员，肇事司机迅速驾车离开现场。受伤的外卖员倒在路边，看起来情况严重。现场只有几位路人，都在犹豫是否上前帮助。${characterName}注意到，这位外卖员的送餐箱旁散落着食物，已经无法配送。就在${characterName}思考如何应对时，${characterName}发现自己手机只剩5%的电量，而今晚还有一个重要的线上会议必须参加。此时路上的其他行人似乎都在回避责任，有人甚至小声说'别惹麻烦，我听说以前有好心人帮助受伤者反被讹诈'。${characterName}认出那辆肇事车辆的部分车牌号码，但不确定自己是否看清了。远处警笛声若隐若现，但不知道是否朝这个方向来。`,
      rights: ["人身安全权", "获得救助权", "知情权"],
      duties: ["见义勇为的道德责任", "协助执法的公民义务", "提供紧急救助的人道主义责任"]
    }
  };
  
  // 返回对应主题的备用场景，如果没有则返回默认场景
  const fallbackScenario = fallbackScenarios[theme] || fallbackScenarios.DEFAULT;
  
  // 确保场景中使用玩家名字
  return fallbackScenario;
}

// 获取备用行动结果
function getFallbackActionResult(currentScenario, playerAction, characterName = '公民') {
  return {
    scenario: `${characterName}决定${playerAction}。这个决定让${characterName}思考了公民责任的重要性。在现代社会中，每个公民都有责任为社会做出贡献，同时也享有相应的权利。${characterName}的行动反映了对社会责任的认识，这将影响${characterName}和周围人的生活。面对新的情况，${characterName}需要继续权衡自己的权利和义务，做出负责任的决策。`,
    updatedContext: "责任反思",
    feedback: `${characterName}的选择反映了对公民责任的理解。`,
    rights: ["知情权", "参与权"],
    duties: ["遵守社会道德", "承担社会责任"]
  };
}

module.exports = {
  generateInitialScenario,
  processPlayerAction,
  processPlayerActionStream,
  GAME_THEMES
};