// 测试 ContextValidator 的验证逻辑

// 模拟 extractTripInfo
function extractTripInfo(message) {
  const destinationMap = {
    'huaqiao': '花桥',
    '花桥': '花桥',
  };

  let destination = null;
  const cleanedMessage = message
    .replace(/(\d+)\s*(?:[天日][游旅]*|days?)/gi, '')
    .replace(/[游旅]计划|行程|旅游|trip|travel/gi, '')
    .trim();

  if (cleanedMessage) {
    const normalizedInput = cleanedMessage.toLowerCase().replace(/\s+/g, '');
    for (const [key, value] of Object.entries(destinationMap)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
      if (normalizedInput === normalizedKey || normalizedInput.includes(normalizedKey) || normalizedKey.includes(normalizedInput)) {
        destination = value;
        break;
      }
    }
    if (!destination) {
      for (const dest of ['花桥']) {
        if (cleanedMessage.includes(dest)) {
          destination = dest;
          break;
        }
      }
    }
  }

  let daysMatch = message.match(/(\d+)\s*(?:天|日|days?)/i);
  if (!daysMatch) {
    daysMatch = message.match(/(\d+)$/);
  }
  const days = daysMatch ? parseInt(daysMatch[1]) : 0;

  return { destination, days };
}

// 模拟 ContextValidator.validateFromMessage
function validateFromMessage(message, existingContext = {}, preferences = {}) {
  // 从消息中提取基本信息
  const extractedInfo = extractTripInfo(message);
  console.log('[validateFromMessage] Extracted info:', extractedInfo);

  // 合并已有上下文和提取的信息
  const mergedContext = {
    ...existingContext,
  };

  if (extractedInfo.destination) {
    mergedContext.destination = extractedInfo.destination;
  }

  if (extractedInfo.days > 0) {
    mergedContext.days = extractedInfo.days;
  }

  if (preferences.interests) {
    mergedContext.preferences = preferences.interests;
  }

  if (preferences.budget && !mergedContext.budget) {
    mergedContext.budget = preferences.budget;
  }

  console.log('[validateFromMessage] Merged context:', mergedContext);

  // 验证完整性
  const missingInfo = [];

  // 检查目的地（必需）
  if (!mergedContext.destination || mergedContext.destination.trim().length === 0) {
    missingInfo.push({
      field: 'destination',
      priority: 'required',
    });
  }

  // 检查天数（必需，但可以有默认值）
  if (!mergedContext.days || mergedContext.days <= 0) {
    missingInfo.push({
      field: 'days',
      priority: 'required',
    });
  }

  // 按优先级排序
  missingInfo.sort((a, b) => {
    const priorityOrder = { required: 0, recommended: 1 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const isComplete = missingInfo.filter(m => m.priority === 'required').length === 0;

  return {
    isComplete,
    missingInfo,
    context: mergedContext,
  };
}

console.log('=== Test Case 1: 花桥 (没有天数) ===');
const result1 = validateFromMessage('花桥');
console.log('isComplete:', result1.isComplete);
console.log('missingInfo:', result1.missingInfo);
console.log('context:', result1.context);
console.log('');

console.log('=== Test Case 2: 花桥5天游 ===');
const result2 = validateFromMessage('花桥5天游');
console.log('isComplete:', result2.isComplete);
console.log('missingInfo:', result2.missingInfo);
console.log('context:', result2.context);
console.log('');

console.log('=== Test Case 3: 第一次消息"花桥"，第二次消息"5天" ===');
const firstValidation = validateFromMessage('花桥');
console.log('First validation - isComplete:', firstValidation.isComplete);
console.log('First validation - missingInfo:', firstValidation.missingInfo);

// 模拟用户回答了天数问题，继续处理
const secondValidation = validateFromMessage('5天', firstValidation.context);
console.log('Second validation - isComplete:', secondValidation.isComplete);
console.log('Second validation - missingInfo:', secondValidation.missingInfo);
console.log('Second validation - context:', secondValidation.context);
