// 测试 extractTripInfo 和 normalizeDestination 函数

// 模拟 normalizeDestination 函数
function normalizeDestination(input) {
  const destinationMap = {
    'huaqiao': '花桥',
    'hua qiao': '花桥',
    '花桥': '花桥',
    '上海': '上海',
    '北京': '北京',
  };

  const normalizedInput = input.toLowerCase().replace(/\s+/g, '');
  console.log('[normalizeDestination] Normalized input:', normalizedInput);

  for (const [key, value] of Object.entries(destinationMap)) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
    if (normalizedInput === normalizedKey || normalizedInput.includes(normalizedKey) || normalizedKey.includes(normalizedInput)) {
      console.log('[normalizeDestination] Matched:', key, '->', value);
      return value;
    }
  }

  // Check if input itself matches a Chinese destination
  const chineseDestinations = ['花桥', '上海', '北京'];
  for (const dest of chineseDestinations) {
    if (input.includes(dest)) {
      console.log('[normalizeDestination] Matched Chinese destination:', dest);
      return dest;
    }
  }

  console.log('[normalizeDestination] No match found for:', input);
  return null;
}

// 模拟 extractTripInfo 函数
function extractTripInfo(message) {
  let destination = null;

  const cleanedMessage = message
    .replace(/(\d+)\s*(?:[天日][游旅]*|days?)/gi, '')
    .replace(/[游旅]计划|行程|旅游|trip|travel/gi, '')
    .trim();

  console.log('[extractTripInfo] Original message:', message);
  console.log('[extractTripInfo] Cleaned message:', cleanedMessage);

  if (cleanedMessage) {
    destination = normalizeDestination(cleanedMessage);
    console.log('[extractTripInfo] Normalized destination:', destination);
  }

  let daysMatch = message.match(/(\d+)\s*(?:天|日|days?)/i);
  if (!daysMatch) {
    daysMatch = message.match(/(\d+)$/);
  }
  const days = daysMatch ? parseInt(daysMatch[1]) : 0;

  return { destination, days };
}

console.log('=== Test Case 1: 花桥 ===');
const result1 = extractTripInfo('花桥');
console.log('Result:', result1);
console.log('');

console.log('=== Test Case 2: 我想去花桥旅游 ===');
const result2 = extractTripInfo('我想去花桥旅游');
console.log('Result:', result2);
console.log('');

console.log('=== Test Case 3: 花桥5天游 ===');
const result3 = extractTripInfo('花桥5天游');
console.log('Result:', result3);
