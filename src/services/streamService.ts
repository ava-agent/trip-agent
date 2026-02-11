export interface StreamChunk {
  content: string
  done: boolean
}

export class StreamService {
  /**
   * 模拟流式 AI 响应
   */
  static async *streamResponse(
    _prompt: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // 模拟 AI 思考延迟
    await this.delay(500)

    const responses = [
      "好的，我来为你规划",
      "东京之旅",
      "。\n\n根据你的需求，我建议以下",
      "行程：\n\n",
      "第一天：抵达东京，入住酒店，浅草寺游览\n",
      "第二天：东京迪士尼乐园全天游玩\n",
      "第三天：涩谷、原宿、新宿购物体验\n",
      "第四天：富士山一日游\n",
      "第五天：秋叶原动漫购物，返程\n\n",
      "需要我帮你预订酒店和门票吗？",
    ]

    for (const chunk of responses) {
      await this.delay(100)
      yield { content: chunk, done: false }
    }

    yield { content: "", done: true }
  }

  /**
   * 根据用户输入生成智能响应（模拟）
   */
  static async *generateStreamingResponse(
    userMessage: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // 简单的关键词匹配模拟
    const destination = this.extractDestination(userMessage)

    if (destination) {
      const response = this.buildDestinationResponse(destination)
      for (const chunk of response) {
        await this.delay(80)
        yield { content: chunk, done: false }
      }
    } else {
      yield { content: "请告诉我你想去哪里旅行，我将为你制定详细的行程计划！", done: false }
    }

    yield { content: "", done: true }
  }

  /**
   * 从消息中提取目的地
   */
  private static extractDestination(message: string): string | null {
    const destinations = ["东京", "巴黎", "纽约", "伦敦", "北京", "上海", "香港", "首尔", "新加坡"]
    for (const dest of destinations) {
      if (message.includes(dest)) {
        return dest
      }
    }
    return null
  }

  /**
   * 构建目的地响应
   */
  private static *buildDestinationResponse(destination: string): Generator<string> {
    yield `收到！为你规划${destination}之旅。\n\n`
    yield `📅 **建议行程（5天4夜）**\n\n`
    yield `**第1天** - 抵达与初探\n`
    yield `• 上午：抵达${destination}，酒店办理入住\n`
    yield `• 下午：市中心观光，熟悉环境\n`
    yield `• 晚上：欢迎晚餐\n\n`
    yield `**第2天** - 标志性景点\n`
    yield `• 上午：参观著名博物馆\n`
    yield `• 下午：地标建筑游览\n`
    yield `• 晚上：夜景观赏\n\n`
    yield `**第3天** - 文化体验\n`
    yield `• 上午：当地市场体验\n`
    yield `• 下午：文化遗址探索\n`
    yield `• 晚上：特色表演\n\n`
    yield `**第4天** - 自由活动\n`
    yield `• 购物、美食或深度游览\n\n`
    yield `**第5天** - 返程\n`
    yield `• 上午：最后采购，前往机场\n\n`
    yield `💰 预估预算：约 ¥15,000 - ¥25,000/人\n\n`
    yield `需要我帮你预订酒店和机票吗？`
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
