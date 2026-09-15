import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { EnhancementNode, EnhancementStat, ZRSJZ_ENHANCEMENT_MAX_LEVEL, ZRSJZ_ENHANCEMENT_NODES, ZRSJZ_ENHANCEMENT_STATS } from '../ZRSJZ_EnhancementConfig';
import { ZRSJZ_InventoryService } from './ZRSJZ_InventoryService';
import { ZRSJZ_AccountService } from './ZRSJZ_AccountService';
import { ZRSJZ_TaskService } from './ZRSJZ_TaskService';

/** 新强化唯一入口；旧设施字段只用于一次性迁移，不参与属性计算。 */
export class ZRSJZ_EnhancementService {
    private static busy = false;
    public static get Level(): number {
        const value = ZRSJZ_GameData.Instance.EnhancementLevel;
        return Number.isFinite(value) ? Math.max(0, Math.min(ZRSJZ_ENHANCEMENT_MAX_LEVEL, Math.floor(value))) : 0;
    }
    public static GetNode(id: string): EnhancementNode | undefined { return ZRSJZ_ENHANCEMENT_NODES.find(n => n.ID === id); }
    public static IsOwned(node: EnhancementNode): boolean {
        return node.Special ? node.Level <= this.Level && (ZRSJZ_GameData.Instance.EnhancementSpecials ?? []).includes(node.ID) : node.Level <= this.Level;
    }
    public static IsAvailable(node: EnhancementNode): boolean {
        return !this.IsOwned(node) && (node.Special ? this.Level >= node.Level : this.Level + 1 === node.Level);
    }
    public static GetBonus(stat: EnhancementStat): number {
        return ZRSJZ_ENHANCEMENT_NODES.reduce((value, n) => value + (n.Stat === stat && this.IsOwned(n) ? n.Value : 0), 0);
    }
    public static Format(stat: EnhancementStat, value: number): string {
        return `${stat === '技能冷却' ? '−' : '+'}${value}${ZRSJZ_ENHANCEMENT_STATS[stat].Suffix}`;
    }
    public static GetCooldownDuration(base: number): number { return Math.max(0, base) * (1 - Math.min(0.5, this.GetBonus('技能冷却') / 100)); }
    public static GetReloadDuration(base: number): number { return Math.max(0, base) / (1 + this.GetBonus('换弹速度') / 100); }
    public static GetSkillDamage(base: number): number { return base * (1 + this.GetBonus('技能伤害') / 100); }
    public static GetBlockReason(node: EnhancementNode): string {
        if (this.IsOwned(node)) return '已强化';
        if (!this.IsAvailable(node)) return node.Special ? `强化达到 Lv.${node.Level} 后解锁` : `请先完成 Lv.${node.Level - 1}`;
        if (ZRSJZ_GameData.Instance.Gold < node.Gold) return '金币不足';
        const lack = node.Materials.find(m => ZRSJZ_InventoryService.GetPropCountByName(m.PropName) < m.Count);
        return lack ? `${lack.PropName}不足` : '';
    }
    /** 全程同步，先校验全部花费，防止连点和异步回调造成重复购买。 */
    public static Purchase(id: string): string {
        const node = this.GetNode(id);
        if (!node) return '强化项目不存在';
        if (this.busy) return '正在强化';
        const reason = this.GetBlockReason(node);
        if (reason) return reason;
        this.busy = true;
        try {
            for (const material of node.Materials) {
                if (!ZRSJZ_InventoryService.ConsumeProp(material.PropName, material.Count)) return '材料发生变化，请重试';
            }
            const data = ZRSJZ_GameData.Instance;
            if (node.Special) (data.EnhancementSpecials ??= []).push(node.ID);
            else data.EnhancementLevel = node.Level;
            ZRSJZ_AccountService.ChangeGold(-node.Gold);
            ZRSJZ_GameData.SaveData();
            ZRSJZ_TaskService.CompleteTask('强化1次', 1);
            return '';
        } finally { this.busy = false; }
    }
}
