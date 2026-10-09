/** 超算余额独立于仓库道具，时间戳使用毫秒。 */
export interface MatrixState {
    cards: number;
    /** 旧存档没有槽位信息时，按原显卡数量从前向后补齐。 */
    slots?: boolean[];
    coins: number;
    pending: number;
    progress: number;
    lastTime: number;
    purchaseDay: number;
    purchased: number;
}
export function CreateMatrixState(): MatrixState {
    return { cards: 0, coins: 0, pending: 0, progress: 0, lastTime: 0, purchaseDay: 0, purchased: 0 };
}
