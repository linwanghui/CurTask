/** 金额显示按亿、万分组；支付金额传 exact=true 保留尾数，其余万以上截去尾数。 */
export function FormatMoney(value: number, exact: boolean = false): string {
    const amount = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    const yi = Math.floor(amount / 100000000);
    const wan = Math.floor(amount % 100000000 / 10000);
    const rest = exact || amount < 10000 ? amount % 10000 : 0;
    return (yi ? yi + "亿" : "") + (wan ? wan + "万" : "")
        + (rest || (!yi && !wan) ? String(rest) : "");
}
