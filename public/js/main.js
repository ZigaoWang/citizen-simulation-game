document.addEventListener('DOMContentLoaded', () => {
  // DOM元素
  const loadingScreen = document.getElementById('loading-screen');
  const welcomeScreen = document.getElementById('welcome-screen');
  const gameScreen = document.getElementById('game-screen');
  const endingScreen = document.getElementById('ending-screen');
  
  const themeButtons = document.querySelectorAll('.theme-btn');
  const startButton = document.getElementById('start-game-btn');
  const playerNameInput = document.getElementById('player-name');
  
  const scenarioText = document.getElementById('scenario-text');
  const rightsContainer = document.getElementById('rights-container');
  const dutiesContainer = document.getElementById('duties-container');
  
  const playerActionInput = document.getElementById('player-action');
  const submitActionButton = document.getElementById('submit-action');
  
  const feedbackContainer = document.getElementById('feedback-container');
  const evaluationBadge = document.getElementById('evaluation-badge');
  const feedbackText = document.getElementById('feedback-text');
  const knowledgeText = document.getElementById('knowledge-text');
  const continueButton = document.getElementById('continue-btn');
  const closeFeedbackButton = document.getElementById('close-feedback-btn');
  
  const endingTitle = document.getElementById('ending-title');
  const endingText = document.getElementById('ending-text');
  const endingReflection = document.getElementById('ending-reflection');
  const newGameButton = document.getElementById('new-game-btn');
  const shareButton = document.getElementById('share-btn');
  
  // 游戏状态
  const gameState = {
    playerName: '',
    selectedTheme: '',
    currentScenario: '',
    actionHistory: [],
    currentContext: null,
    score: 0,
    decisionsCount: 0,
    discoveredRights: new Set(),
    discoveredDuties: new Set(),
    achievements: new Set()
  };
  
  // 音效
  const audioEffects = {
    clickSound: null,
    successSound: null, 
    failureSound: null,
    neutralSound: null,
    typingSound: null,
    backgroundSound: null
  };
  
  // 尝试加载音效
  function loadSounds() {
    try {
      audioEffects.clickSound = new Audio('/sound/click.mp3');
      audioEffects.successSound = new Audio('/sound/success.mp3');
      audioEffects.failureSound = new Audio('/sound/failure.mp3');
      audioEffects.neutralSound = new Audio('/sound/neutral.mp3');
      audioEffects.typingSound = new Audio('/sound/typing.mp3');
      audioEffects.backgroundSound = new Audio('/sound/background.mp3');
      
      // 设置背景音乐循环播放
      if (audioEffects.backgroundSound) {
        audioEffects.backgroundSound.loop = true;
        audioEffects.backgroundSound.volume = 0.2;
      }
    } catch (error) {
      console.warn('加载音效失败:', error);
    }
  }
  
  // 尝试播放音效
  function playSound(sound) {
    try {
      if (sound && typeof sound.play === 'function') {
        sound.currentTime = 0;
        sound.play().catch(e => {
          // 忽略播放错误，不影响游戏体验
        });
      }
    } catch (error) {
      // 忽略错误
    }
  }
  
  // 显示加载中
  function showLoading() {
    loadingScreen.classList.add('active');
  }
  
  // 隐藏加载中
  function hideLoading() {
    loadingScreen.classList.remove('active');
  }
  
  // 切换屏幕
  function showScreen(screen) {
    // 移除所有活动屏幕
    welcomeScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    endingScreen.classList.remove('active');
    
    // 播放过渡音效
    playSound(audioEffects.clickSound);
    
    // 在短暂延迟后显示新屏幕，以实现过渡效果
    setTimeout(() => {
      screen.classList.add('active');
    }, 50);
  }
  
  // 文本打字机效果
  function typeText(element, text, speed = 30) {
    if (!element) return Promise.resolve();
    
    // Make sure text is a string
    text = text || '';
    
    return new Promise(resolve => {
      element.textContent = '';
      let i = 0;
      let intervalId;
      
      function type() {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          
          // 间歇性播放打字音效
          if (i % 3 === 0) {
            playSound(audioEffects.typingSound);
          }
        } else {
          clearInterval(intervalId);
          resolve();
        }
      }
      
      intervalId = setInterval(type, speed);
    });
  }
  
  // 添加知识点药丸 - 增强版
  function addKnowledgePill(container, text) {
    if (!container) return;
    
    // 检查是否已经存在相同的药丸
    const existingPills = container.querySelectorAll('.pill');
    for (const existingPill of existingPills) {
      if (existingPill.textContent === text) {
        // 已存在，添加突出动画后返回
        existingPill.classList.add('highlight');
        
        // 添加闪光效果
        const flashEffect = document.createElement('div');
        flashEffect.className = 'pill-flash';
        existingPill.appendChild(flashEffect);
        
        // 播放特效音效
        playSound(audioEffects.successSound);
        
        // 显示发现提示
        showToast(`再次发现: ${text}!`, 'info');
        
        setTimeout(() => {
          existingPill.classList.remove('highlight');
          if (flashEffect && flashEffect.parentNode) {
            flashEffect.parentNode.removeChild(flashEffect);
          }
        }, 1500);
        return;
      }
    }
    
    // 为不同类型的知识点添加不同的图标
    let icon = '';
    let pillClass = 'pill';
    
    if (container === rightsContainer) {
      icon = '🔮'; // 权利图标
      pillClass += ' right-pill';
      // 更新发现计数
      gameState.discoveredRights.add(text);
    } else if (container === dutiesContainer) {
      icon = '📜'; // 义务图标
      pillClass += ' duty-pill';
      // 更新发现计数
      gameState.discoveredDuties.add(text);
    }
    
    // 创建药丸元素
    const pill = document.createElement('div');
    pill.className = pillClass;
    pill.innerHTML = `<span class="pill-icon">${icon}</span><span class="pill-text">${text}</span>`;
    
    // 添加点击事件以显示详细信息
    pill.addEventListener('click', () => {
      // 显示详细知识点弹窗
      showKnowledgePopup(text);
      // 添加点击效果
      pill.classList.add('pulse');
      setTimeout(() => pill.classList.remove('pulse'), 500);
    });
    
    // 添加并应用动画效果
    container.appendChild(pill);
    setTimeout(() => {
      pill.style.opacity = '1';
      pill.style.transform = 'translateY(0)';
      
      // 播放获得音效
      playSound(audioEffects.successSound);
      
      // 显示发现提示
      showToast(`新发现: ${text}!`, 'success');
      
      // 添加特殊效果 - 星星动画
      createStarEffect(pill);
      
      // 更新收集进度提示
      updateCollectionProgress();
    }, 10);
  }
  
  // 添加Toast提示功能
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
  
  // 创建星星特效
  function createStarEffect(element) {
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('div');
      star.className = 'star-effect';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 0.5}s`;
      
      element.appendChild(star);
      
      // 动画结束后移除
      setTimeout(() => {
        if (star.parentNode) {
          star.parentNode.removeChild(star);
        }
      }, 1000);
    }
  }
  
  // 更新收集进度
  function updateCollectionProgress() {
    const rightCount = gameState.discoveredRights.size;
    const dutyCount = gameState.discoveredDuties.size;
    const totalCount = rightCount + dutyCount;
    
    // 显示收集成就
    if (totalCount === 3 && !gameState.achievements.has('beginner_collector')) {
      gameState.achievements.add('beginner_collector');
      showAchievement('初级收藏家', '发现3个知识点');
    } else if (totalCount === 6 && !gameState.achievements.has('advanced_collector')) {
      gameState.achievements.add('advanced_collector');
      showAchievement('高级收藏家', '发现6个知识点');
    } else if (totalCount === 9 && !gameState.achievements.has('master_collector')) {
      gameState.achievements.add('master_collector');
      showAchievement('收藏大师', '发现9个知识点');
    }
  }
  
  // 显示成就通知
  function showAchievement(title, description) {
    const achievement = document.createElement('div');
    achievement.className = 'achievement';
    achievement.innerHTML = `
      <div class="achievement-icon">🏆</div>
      <div class="achievement-content">
        <h4>解锁成就</h4>
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
    `;
    
    document.body.appendChild(achievement);
    
    // 播放成就音效
    playSound(audioEffects.successSound);
    
    // 显示动画
    setTimeout(() => achievement.classList.add('show'), 10);
    
    // 自动隐藏
    setTimeout(() => {
      achievement.classList.remove('show');
      setTimeout(() => {
        if (achievement.parentNode) {
          achievement.parentNode.removeChild(achievement);
        }
      }, 500);
    }, 5000);
  }
  
  // 显示知识点弹窗
  function showKnowledgePopup(pillText) {
    // 创建弹窗元素
    const popup = document.createElement('div');
    popup.className = 'knowledge-popup';
    
    // 根据类型获取详细内容
    let detailContent = '';
    if (gameState.discoveredRights.has(pillText)) {
      detailContent = getKnowledgeDetail('right', pillText);
    } else if (gameState.discoveredDuties.has(pillText)) {
      detailContent = getKnowledgeDetail('duty', pillText);
    }
    
    // 设置弹窗内容
    popup.innerHTML = `
      <div class="popup-header">
        <h3>${pillText}</h3>
        <button class="close-popup">×</button>
      </div>
      <div class="popup-content">
        <p>${detailContent}</p>
      </div>
    `;
    
    // 添加到文档中
    document.body.appendChild(popup);
    
    // 添加关闭按钮事件
    popup.querySelector('.close-popup').addEventListener('click', () => {
      popup.classList.add('fade-out');
      setTimeout(() => {
        document.body.removeChild(popup);
      }, 300);
    });
    
    // 显示动画
    setTimeout(() => popup.classList.add('active'), 10);
  }
  
  // 获取知识点详细内容
  function getKnowledgeDetail(type, title) {
    // 预设的知识点详细内容
    const knowledgeDetails = {
      right: {
        "知情权": "中国公民的知情权是公民了解国家、社会事务和与自身利益相关信息的权利。《政府信息公开条例》保障公民、法人和其他组织依法获取政府信息的权利。",
        "参与权": "参与权是指公民有权参与国家和社会事务的管理。中国宪法第2条规定：\"中华人民共和国的一切权力属于人民。\"公民通过选举、政治协商等形式行使参与权。",
        "表达权": "表达权是指公民有权自由表达自己的意见和看法。中国宪法第35条规定公民有言论、出版、集会、结社、游行、示威的自由。但表达权需在法律框架内行使。",
        "平等权": "平等权是指公民在法律面前一律平等。中国宪法第33条规定：\"中华人民共和国公民在法律面前一律平等。\"任何公民享有宪法和法律规定的权利，同时必须履行宪法和法律规定的义务。"
      },
      duty: {
        "遵守法律义务": "中国宪法第53条规定：\"中华人民共和国公民必须遵守宪法和法律，保守国家秘密，爱护公共财产，遵守劳动纪律，遵守公共秩序，尊重社会公德。\"",
        "保护环境义务": "中国宪法第26条规定：\"国家保护和改善生活环境和生态环境，防治污染和其他公害。\"公民有保护环境的义务，共同建设美丽中国。",
        "公民责任": "公民责任是指公民对国家、社会和他人应当承担的责任。包括履行法定义务、道德责任和社会责任，是构建和谐社会的基础。",
        "纳税义务": "中国宪法第56条规定：\"中华人民共和国公民有依照法律纳税的义务。\"纳税是公民的基本义务，税收是国家财政收入的主要来源，支持国家各项事业发展。",
        "维护他人生命权的义务": "维护他人生命权是公民的基本道德和法律义务。《中华人民共和国民法典》第179条规定公民有见义勇为的权利，第183条规定合法实施紧急避险、正当防卫的行为不承担责任。《刑法》也规定了对见死不救、危害他人生命安全等行为的处罚条款。公民应当在力所能及的范围内，采取适当措施保护他人生命安全。"
      }
    };
    
    // 返回对应的详细内容，如果没有找到就返回默认文本
    return knowledgeDetails[type][title] || `这是关于${title}的详细信息。在真实场景中，这里会显示更详细的解释和相关法律条文。`;
  }
  
  // 主题按钮事件
  themeButtons.forEach(button => {
    button.addEventListener('click', () => {
      themeButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      gameState.selectedTheme = button.dataset.theme;
      startButton.disabled = false;
      
      // 播放选择音效
      playSound(audioEffects.clickSound);
      
      // 添加按钮选择动画
      button.animate([
        { transform: 'scale(0.95)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' }
      ], {
        duration: 400,
        easing: 'ease-out'
      });
    });
  });
  
  // 开始游戏事件
  startButton.addEventListener('click', async () => {
    gameState.playerName = playerNameInput.value.trim() || '游客';
    showLoading();
    
    // 开始播放背景音乐
    if (audioEffects.backgroundSound) {
      audioEffects.backgroundSound.play().catch(e => {
        // 忽略自动播放限制错误
      });
    }
    
    try {
      const response = await fetch('/api/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: gameState.selectedTheme,
          playerName: gameState.playerName
        })
      });
      
      if (!response.ok) throw new Error('网络错误');
      
      const data = await response.json();
      gameState.currentContext = data;
      
      // 重置游戏计分
      gameState.score = 0;
      gameState.decisionsCount = 0;
      
      // 更新UI
      updateGameScreen(data);
      
      // 显示游戏屏幕
      showScreen(gameScreen);
      
      // 焦点到输入框
      setTimeout(() => {
        playerActionInput.focus();
      }, 600);
    } catch (error) {
      console.error('启动游戏失败:', error);
      alert('启动游戏失败，请刷新页面重试');
    } finally {
      hideLoading();
    }
  });
  
  // 提交玩家行动 - 使用真实流式响应
  async function submitPlayerActionStreaming() {
    const playerAction = playerActionInput.value.trim();
    if (!playerAction) return;
    
    // 禁用输入框和按钮
    playerActionInput.disabled = true;
    submitActionButton.disabled = true;
    
    // 显示反馈容器作为流式内容接收区
    feedbackContainer.classList.remove('hidden');
    feedbackContainer.classList.add('visible', 'streaming');
    
    // 设置动态加载指示器
    feedbackText.innerHTML = '<div class="streaming-indicator active"><div class="typing-indicator"><span></span><span></span><span></span></div><div class="streaming-text"></div></div>';
    const streamingTextElement = feedbackText.querySelector('.streaming-text');
    
    try {
      // 发送到流式API端点
      const response = await fetch('/api/action/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: playerAction,
          context: gameState.currentContext,
          history: gameState.actionHistory,
          playerName: gameState.playerName
        })
      });
      
      if (!response.ok) {
        throw new Error(`服务器响应错误: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedText = '';
      let completeJSON = null;
      
      // 处理流式数据
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解码数据块
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        // 处理每一行数据
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            // 检查是否完成
            if (data === '[DONE]') {
              // 完成流处理
              console.log('流处理完成');
              continue;
            }
            
            try {
              const parsedData = JSON.parse(data);
              
              // 处理增量更新
              if (parsedData.type === 'INCREMENT') {
                receivedText += parsedData.content;
                streamingTextElement.textContent = receivedText;
                
                // 滚动到最新内容
                feedbackContainer.scrollTop = feedbackContainer.scrollHeight;
                
                // 间歇性播放打字音效
                if (Math.random() > 0.7) {
                  playSound(audioEffects.typingSound);
                }
              } 
              // 处理完整的JSON响应
              else if (parsedData.feedback && parsedData.scenario) {
                console.log('接收到完整响应:', parsedData);
                completeJSON = parsedData;
                
                // 检查是否是离线模式响应
                const isOfflineMode = parsedData.feedback.includes('【离线模式 - API连接失败】');
                if (isOfflineMode) {
                  console.warn('收到离线模式响应，尝试构建更好的游戏体验');
                  
                  // 创建一个更有意义的响应
                  const enhancedResponse = {
                    ...parsedData,
                    feedback: `你决定"${playerAction}"。这个选择可能会影响后续的情境发展。`,
                    evaluation: 'NEUTRAL',
                    knowledge: '在面对选择时，公民权利和义务是相互关联的。每个行动都可能影响你自己和他人的权益。'
                  };
                  
                  // 如果收集到足够的流文本，尝试使用它而不是默认文本
                  if (receivedText && receivedText.length > 30) {
                    const sentences = receivedText.split(/[.。!！?？]/).filter(s => s.trim().length > 10);
                    if (sentences.length >= 2) {
                      enhancedResponse.feedback = sentences[0] + '.';
                      enhancedResponse.scenario = sentences[1] + '.';
                      enhancedResponse.knowledge = '基于你的选择，思考公民如何平衡个人行为与社会责任。';
                    }
                  }
                  
                  completeJSON = enhancedResponse;
                }
                
                // 停止流式显示
                feedbackContainer.classList.remove('streaming');
                
                // 更新游戏状态
                gameState.actionHistory.push({
                  action: playerAction,
                  result: completeJSON
                });
                
                gameState.currentContext = completeJSON;
                
                // 更新游戏分数
                updateScore(completeJSON.evaluation);
                
                // 显示完整反馈
                showFeedback(completeJSON);
              }
              // 处理错误
              else if (parsedData.type === 'ERROR') {
                throw new Error(parsedData.error || '处理请求时发生错误');
              }
              // 对于其他类型的JSON，如果有feedback，也尝试处理
              else if (parsedData.feedback) {
                console.log('接收到非标准响应:', parsedData);
                completeJSON = {
                  ...parsedData,
                  scenario: parsedData.scenario || '请继续你的冒险...',
                  evaluation: parsedData.evaluation || 'NEUTRAL',
                  knowledge: parsedData.knowledge || '继续探索更多公民权利与义务。'
                };
                
                // 停止流式显示并更新游戏
                feedbackContainer.classList.remove('streaming');
                
                // 更新游戏状态
                gameState.actionHistory.push({
                  action: playerAction,
                  result: completeJSON
                });
                
                gameState.currentContext = completeJSON;
                
                // 更新游戏分数
                updateScore(completeJSON.evaluation);
                
                // 显示完整反馈
                showFeedback(completeJSON);
              }
            } catch (error) {
              console.warn('解析流数据失败:', error, '原始数据:', data);
              // 继续处理，不中断流
              
              // 尝试判断是否是完整JSON响应但格式有问题
              if (data && data.includes('"feedback"') && data.includes('"scenario"')) {
                try {
                  // 尝试修复并解析JSON
                  const fixedData = data.replace(/\n/g, '\\n').replace(/\r/g, '');
                  const jsonStartIdx = fixedData.indexOf('{');
                  const jsonEndIdx = fixedData.lastIndexOf('}') + 1;
                  
                  if (jsonStartIdx >= 0 && jsonEndIdx > jsonStartIdx) {
                    const jsonStr = fixedData.substring(jsonStartIdx, jsonEndIdx);
                    const parsedData = JSON.parse(jsonStr);
                    
                    if (parsedData.feedback && parsedData.scenario) {
                      console.log('成功修复并解析JSON响应');
                      
                      // 更新游戏状态
                      gameState.actionHistory.push({
                        action: playerAction,
                        result: parsedData
                      });
                      
                      gameState.currentContext = parsedData;
                      
                      // 更新游戏分数
                      updateScore(parsedData.evaluation);
                      
                      // 显示完整反馈
                      feedbackContainer.classList.remove('streaming');
                      showFeedback(parsedData);
                    }
                  }
                } catch (fixError) {
                  console.warn('尝试修复JSON失败:', fixError);
                }
              }
            }
          }
        }
      }
      
      // 完成流处理，清空输入框
      playerActionInput.value = '';
      
      // 如果没有收到完整响应，但有收集到流文本，从文本构建一个响应
      if (!completeJSON && receivedText.length > 30) {
        console.warn('未收到完整的游戏响应，但有流文本，尝试构建响应');
        
        // 从收集到的文本构建响应
        const sentences = receivedText.split(/[.。!！?？]/).filter(s => s.trim().length > 10);
        let constructedResponse = {
          feedback: '你的选择已被记录。',
          evaluation: 'NEUTRAL',
          knowledge: '公民在做决策时应考虑行动的后果和对社会的影响。',
          gameOver: false,
          scenario: '请继续你的行动...',
          rights: [],
          duties: []
        };
        
        // 尝试从文本中提取信息
        if (sentences.length >= 2) {
          constructedResponse.feedback = sentences[0] + '.';
          constructedResponse.scenario = sentences.slice(1).join('. ') + '.';
        }
        
        // 设置为当前上下文
        gameState.currentContext = constructedResponse;
        
        // 更新游戏状态
        gameState.actionHistory.push({
          action: playerAction,
          result: constructedResponse
        });
        
        // 更新游戏分数
        updateScore(constructedResponse.evaluation);
        
        // 显示构建的反馈
        feedbackContainer.classList.remove('streaming');
        showFeedback(constructedResponse);
        
        console.log('已从流文本构建响应:', constructedResponse);
      }
      // 如果没有收到完整响应，也没有足够的流文本，显示错误
      else if (!completeJSON) {
        console.warn('未收到完整的游戏响应');
        
        // 创建基本的响应以继续游戏
        const basicResponse = {
          feedback: `你决定"${playerAction}"。系统正在处理你的选择。`,
          evaluation: 'NEUTRAL',
          knowledge: '在技术困难时，公民应当保持耐心和理解。',
          gameOver: false,
          scenario: '请继续你的冒险...',
          rights: ['知情权'],
          duties: ['公民责任']
        };
        
        // 更新游戏状态
        gameState.actionHistory.push({
          action: playerAction,
          result: basicResponse
        });
        
        gameState.currentContext = basicResponse;
        
        // 更新游戏分数
        updateScore(basicResponse.evaluation);
        
        // 显示构建的反馈
        feedbackContainer.classList.remove('streaming');
        showFeedback(basicResponse);
        
        console.log('已创建基本响应以继续游戏:', basicResponse);
      }
      
    } catch (error) {
      console.error('提交行动失败:', error);
      
      // 创建错误响应以保持游戏流程
      const errorResponse = {
        feedback: `你决定"${playerAction}"。在处理你的选择时遇到了技术问题，但游戏将继续。`,
        evaluation: 'NEUTRAL',
        knowledge: '面对技术挑战，公民应保持冷静并寻找解决方案。',
        gameOver: false,
        scenario: '请继续你的冒险...',
        rights: ['知情权'],
        duties: ['公民责任']
      };
      
      // 更新游戏状态
      gameState.actionHistory.push({
        action: playerAction,
        result: errorResponse
      });
      
      gameState.currentContext = errorResponse;
      
      // 更新游戏分数
      updateScore(errorResponse.evaluation);
      
      // 显示错误反馈
      feedbackContainer.classList.remove('streaming');
      showFeedback(errorResponse);
      
      console.log('已创建错误响应以继续游戏:', errorResponse);
    } finally {
      // 恢复输入框和按钮状态
      playerActionInput.disabled = false;
      submitActionButton.disabled = false;
      
      // 焦点回到输入框
      playerActionInput.focus();
    }
  }
  
  // 更新游戏分数
  function updateScore(evaluation) {
    // 更新决策计数
    gameState.decisionsCount++;
    
    // 根据评价更新分数
    switch(evaluation) {
      case 'POSITIVE':
        gameState.score += 10;
        playSound(audioEffects.successSound);
        break;
      case 'NEGATIVE':
        gameState.score -= 5;
        playSound(audioEffects.failureSound);
        break;
      case 'NEUTRAL':
        gameState.score += 3;
        playSound(audioEffects.neutralSound);
        break;
    }
    
    // 更新分数显示
    const scoreElement = document.getElementById('player-score') || createScoreElement();
    scoreElement.textContent = `得分: ${gameState.score}`;
    
    // 加分动画
    const scoreChange = document.createElement('div');
    scoreChange.className = `score-change ${evaluation.toLowerCase()}`;
    scoreChange.textContent = evaluation === 'POSITIVE' ? '+10' : 
                              evaluation === 'NEGATIVE' ? '-5' : '+3';
    scoreElement.appendChild(scoreChange);
    
    // 动画结束后移除元素
    setTimeout(() => {
      scoreChange.remove();
    }, 1000);
  }
  
  // 创建分数元素
  function createScoreElement() {
    const scoreElement = document.createElement('div');
    scoreElement.id = 'player-score';
    scoreElement.className = 'player-score';
    scoreElement.textContent = `得分: ${gameState.score}`;
    document.querySelector('.game-header').appendChild(scoreElement);
    return scoreElement;
  }
  
  // 显示反馈
  function showFeedback(data, skipFeedbackText = false) {
    // 设置评价标记
    const evaluationClass = {
      'POSITIVE': 'positive',
      'NEGATIVE': 'negative',
      'NEUTRAL': 'neutral'
    }[data.evaluation] || 'neutral';
    
    evaluationBadge.className = `badge ${evaluationClass}`;
    evaluationBadge.textContent = {
      'POSITIVE': '积极选择',
      'NEGATIVE': '消极选择',
      'NEUTRAL': '中立选择'
    }[data.evaluation] || '中立选择';
    
    // 如果没有跳过，设置反馈文本
    if (!skipFeedbackText) {
      feedbackText.textContent = data.feedback;
    }
    
    // 设置知识点文本
    knowledgeText.textContent = data.knowledge;
    
    // 显示反馈容器
    feedbackContainer.classList.remove('hidden', 'streaming');
    feedbackContainer.classList.add('visible');
    
    // 添加新发现的权利和义务
    if (data.rights && Array.isArray(data.rights)) {
      data.rights.forEach(right => {
        addKnowledgePill(rightsContainer, right);
      });
    }
    
    if (data.duties && Array.isArray(data.duties)) {
      data.duties.forEach(duty => {
        addKnowledgePill(dutiesContainer, duty);
      });
    }
  }
  
  // 提交按钮事件
  submitActionButton.addEventListener('click', submitPlayerActionStreaming);
  
  // 输入框回车事件
  playerActionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitPlayerActionStreaming();
    }
  });
  
  // 输入框输入事件 - 动态调整高度
  playerActionInput.addEventListener('input', () => {
    const inputValue = playerActionInput.value.trim();
    submitActionButton.disabled = inputValue === '';
  });
  
  // 继续按钮事件
  continueButton.addEventListener('click', () => {
    const data = gameState.currentContext;
    
    // 如果游戏结束，显示结局屏幕
    if (data && data.gameOver) {
      showEnding(data);
      return;
    }
    
    // 否则，继续游戏，更新游戏屏幕
    if (data) {
      updateGameScreen(data);
    }
    
    // 隐藏反馈容器
    feedbackContainer.classList.remove('visible');
    setTimeout(() => {
      feedbackContainer.classList.add('hidden');
    }, 300);
    
    // 焦点回到输入框
    playerActionInput.focus();
  });
  
  // 关闭反馈按钮事件
  closeFeedbackButton.addEventListener('click', () => {
    feedbackContainer.classList.remove('visible');
    setTimeout(() => {
      feedbackContainer.classList.add('hidden');
    }, 300);
    
    // 如果游戏已结束，按关闭按钮也会显示结局
    const data = gameState.currentContext;
    if (data && data.gameOver) {
      showEnding(data);
    }
    
    // 焦点回到输入框
    playerActionInput.focus();
  });
  
  // 新游戏按钮事件
  newGameButton.addEventListener('click', () => {
    // 重置游戏状态
    gameState.actionHistory = [];
    gameState.currentContext = null;
    gameState.score = 0;
    gameState.decisionsCount = 0;
    gameState.discoveredRights = new Set();
    gameState.discoveredDuties = new Set();
    
    // 清空知识药丸容器
    rightsContainer.innerHTML = '';
    dutiesContainer.innerHTML = '';
    
    // 返回欢迎屏幕
    showScreen(welcomeScreen);
  });
  
  // 分享按钮事件
  shareButton.addEventListener('click', () => {
    const shareText = `我在"公民责任模拟器"游戏中做出了${gameState.decisionsCount}个决策，最终得分: ${gameState.score}。我了解了这些公民权利: ${Array.from(gameState.discoveredRights).join(', ')}，以及这些公民义务: ${Array.from(gameState.discoveredDuties).join(', ')}。#公民责任#公民教育`;
    
    // 尝试使用Web Share API
    if (navigator.share) {
      navigator.share({
        title: '公民责任模拟器游戏结果',
        text: shareText,
        url: window.location.href
      }).catch(error => {
        console.warn('分享失败:', error);
        copyToClipboard(shareText);
      });
    } else {
      // 回退到剪贴板复制
      copyToClipboard(shareText);
    }
  });
  
  // 复制到剪贴板
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('游戏结果已复制到剪贴板，可以粘贴分享给朋友！');
    }).catch(err => {
      console.error('复制失败:', err);
      
      // 使用传统方法创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        alert('游戏结果已复制到剪贴板，可以粘贴分享给朋友！');
      } catch (err) {
        console.error('复制失败:', err);
        alert('无法复制到剪贴板，请手动复制以下内容：\n\n' + text);
      }
      
      document.body.removeChild(textArea);
    });
  }
  
  // 更新游戏屏幕
  function updateGameScreen(data) {
    // 清除现有场景文本
    scenarioText.textContent = '';
    
    // 使用打字机效果显示新场景
    typeText(scenarioText, data.scenario);
    
    // 确保知识点是数组
    const rights = Array.isArray(data.rights) ? data.rights : [];
    const duties = Array.isArray(data.duties) ? data.duties : [];
    
    // 更新界面元素
    feedbackContainer.classList.remove('visible');
    feedbackContainer.classList.add('hidden');
    
    // 确保分数显示存在
    if (!document.getElementById('player-score')) {
      createScoreElement();
    }
  }
  
  // 显示结局
  function showEnding(data) {
    // 设置结局标题
    endingTitle.textContent = data.endingTitle || '冒险结束';
    
    // 创建结局描述文本
    const endingDescription = document.createElement('p');
    endingDescription.className = 'ending-description';
    endingDescription.textContent = data.endingDescription || data.feedback || '你的冒险结束了。';
    
    // 清空并添加新内容
    endingText.innerHTML = '';
    endingText.appendChild(endingDescription);
    
    // 添加统计信息
    const statsElement = document.createElement('div');
    statsElement.className = 'ending-stats';
    statsElement.innerHTML = `
      <h4>冒险统计</h4>
      <ul>
        <li>决策次数: <span>${gameState.decisionsCount}</span></li>
        <li>最终得分: <span>${gameState.score}</span></li>
        <li>发现的权利: <span>${gameState.discoveredRights.size}</span></li>
        <li>认识的义务: <span>${gameState.discoveredDuties.size}</span></li>
      </ul>
    `;
    endingText.appendChild(statsElement);
    
    // 设置反思文本
    endingReflection.textContent = data.endingReflection || data.knowledge || '每个决定都体现了你对公民责任的理解，希望这次体验能帮助你更好地认识自己的权利和义务。';
    
    // 显示结局屏幕
    showScreen(endingScreen);
    
    // 停止背景音乐
    if (audioEffects.backgroundSound) {
      try {
        audioEffects.backgroundSound.pause();
        audioEffects.backgroundSound.currentTime = 0;
      } catch (e) {
        // 忽略错误
      }
    }
    
    // 根据得分播放不同音效
    if (gameState.score >= 50) {
      playSound(audioEffects.successSound);
    } else if (gameState.score >= 20) {
      playSound(audioEffects.neutralSound);
    } else {
      playSound(audioEffects.failureSound);
    }
  }
  
  // 初始化加载音效
  loadSounds();
  
  // 初始化时禁用开始按钮，直到选择主题
  startButton.disabled = true;
});