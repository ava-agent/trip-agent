// 测试完整的 A2UI 流程
// 模拟：用户输入"花桥" -> A2UI 触发 -> 询问天数 -> 用户回答"5天" -> 重新验证

// 模拟 normalizeDestination 函数
function normalizeDestination(input) {
  const destinationMap = {
    'huaqiao': '花桥',
    '花桥': '花桥',
  };

  const normalizedInput = input.toLowerCase().replace(/\s+/g, '');
  for (const [key, value] of Object.entries(destinationMap)) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
    if (normalizedInput === normalizedKey || normalizedInput.includes(normalizedKey) || normalizedKey.includes(normalizedInput)) {
      return value;
    }
  }

  const chineseDestinations = ['花桥'];
  for (const dest of chineseDestinations) {
    if (input.includes(dest)) {
      return dest;
    }
  }

  return null;
}

// 模拟 extractTripInfo 函数（支持 existingContext）
function extractTripInfo(message, existingContext) {
  let destination = null;

  const cleanedMessage = message
    .replace(/(\d+)\s*(?:[天日][游旅]*|days?)/gi, '')
    .replace(/[游旅]计划|行程|旅游|trip|travel/gi, '')
    .trim();

  if (cleanedMessage) {
    destination = normalizeDestination(cleanedMessage);
  }

  // IMPORTANT: Use existingContext.destination if available (from A2UI)
  if (existingContext?.destination) {
    destination = existingContext.destination;
  }

  let daysMatch = message.match(/(\d+)\s*(?:天|日|days?)/i);
  if (!daysMatch) {
    daysMatch = message.match(/(\d+)$/);
  }
  let days = daysMatch ? parseInt(daysMatch[1]) : 0;

  // IMPORTANT: Use existingContext.days if available (from A2UI)
  if (existingContext?.days !== undefined) {
    days = existingContext.days;
  }

  return { destination, days };
}

// 模拟 ContextValidator.validateFromMessage
function validateFromMessage(message, existingContext, preferences) {
  const extractedInfo = extractTripInfo(message, existingContext);
  console.log('[validateFromMessage] Extracted info:', extractedInfo);
  console.log('[validateFromMessage] Existing context:', existingContext);

  const mergedContext = {
    ...existingContext,
  };

  if (extractedInfo.destination) {
    mergedContext.destination = extractedInfo.destination;
  }

  if (extractedInfo.days > 0) {
    mergedContext.days = extractedInfo.days;
  }

  console.log('[validateFromMessage] Merged context:', mergedContext);

  const missingInfo = [];

  if (!mergedContext.destination || mergedContext.destination.trim().length === 0) {
    missingInfo.push({ field: 'destination', priority: 'required' });
  }

  if (!mergedContext.days || mergedContext.days <= 0) {
    missingInfo.push({ field: 'days', priority: 'required' });
  }

  const isComplete = missingInfo.filter(m => m.priority === 'required').length === 0;

  return {
    isComplete,
    missingInfo,
    context: mergedContext,
  };
}

console.log('=== 完整流程测试 ===\n');

// 步骤 1: 用户输入"花桥"
console.log('步骤 1: 用户输入 "花桥"');
const step1Validation = validateFromMessage('花桥', undefined, {});
console.log('  isComplete:', step1Validation.isComplete);
console.log('  missingInfo:', step1Validation.missingInfo.map(m => m.field));
console.log('  context:', step1Validation.context);
console.log('');

// 步骤 2: 系统收集到 destination: "花桥"
const collectedContextFromStep1 = { destination: '花桥' };
console.log('步骤 2: A2UI 收集到 context.destination = "花桥"');
console.log('  collectedContext:', collectedContextFromStep1);
console.log('');

// 步骤 3: 用户回答天数"5天"
console.log('步骤 3: 用户回答天数 "5天"');
// 这里是关键问题：ChatWindow 传递的是空对象 {} 还是 collectedContextFromStep1？
// 根据 ChatWindow.tsx 第 98-104 行，handleSendMessage 中 existingContext 始终是 {}

// 错误情况：传递空对象
console.log('  ❌ 错误情况：existingContext = {}');
const step3WrongValidation = validateFromMessage('5天', {}, {});
console.log('    isComplete:', step3WrongValidation.isComplete);
console.log('    missingInfo:', step3WrongValidation.missingInfo.map(m => m.field));
console.log('    context:', step3WrongValidation.context);
console.log('');

// 正确情况：传递收集到的上下文
console.log('  ✓ 正确情况：existingContext = collectedContextFromStep1');
const step3CorrectValidation = validateFromMessage('5天', collectedContextFromStep1, {});
console.log('    isComplete:', step3CorrectValidation.isComplete);
console.log('    missingInfo:', step3CorrectValidation.missingInfo.map(m => m.field));
console.log('    context:', step3CorrectValidation.context);
