import { _decorator } from 'cc';
import { ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_Box } from './ZRSJZ_Box';

const { ccclass, property } = _decorator;

/**
 * 可在编辑器中指定掉落池的箱子。
 * 将本组件挂到箱子节点上（替代 ZRSJZ_Box），玩家即可沿用原有开箱和搜索流程。
 */
@ccclass('ZRSJZ_CustomLootBox')
export class ZRSJZ_CustomLootBox extends ZRSJZ_Box {
    @property({
        type: [String],
        displayName: '可出现物资',
        tooltip: '填写 ZRSJZ_PROP_CONFIG 中的道具名称；只有列表中的物资会在该箱子中出现。',
    })
    AvailableProps: string[] = [];

    @property({ displayName: '最少物资数量', min: 0, step: 1 })
    MinPropCount: number = 1;

    @property({ displayName: '最多物资数量', min: 0, step: 1 })
    MaxPropCount: number = 3;

    @property({
        displayName: '允许重复物资',
        tooltip: '关闭时，同一个箱子中不会随机出两件同名物资。',
    })
    AllowDuplicate: boolean = false;

    protected start(): void {
        this.ConfigureFixedLoot(this.GenerateEditorLoot());
    }

    /** 重新按 Inspector 配置生成物资，方便运行时复用或调试。 */
    public RefreshLoot(): void {
        this.ConfigureFixedLoot(this.GenerateEditorLoot());
    }

    private GenerateEditorLoot(): string[] {
        const configuredProps = (this.AvailableProps ?? [])
            .map(propName => propName.trim())
            .filter(propName => propName.length > 0);
        const validProps = configuredProps.filter(propName => {
            if (ZRSJZ_PROP_CONFIG.has(propName)) {
                return true;
            }
            console.warn(`[ZRSJZ_CustomLootBox] 未找到道具配置，已忽略: ${propName}`);
            return false;
        });
        const pool = this.AllowDuplicate
            ? validProps
            : Array.from(new Set(validProps));

        if (pool.length === 0) {
            console.warn(`[ZRSJZ_CustomLootBox] ${this.node.name} 未配置有效的可出现物资`);
            return [];
        }

        const minCount = Math.max(0, Math.floor(this.MinPropCount));
        const maxCount = Math.max(minCount, Math.floor(this.MaxPropCount));
        let count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
        if (!this.AllowDuplicate) {
            count = Math.min(count, pool.length);
        }

        const loot: string[] = [];
        const candidates = [...pool];
        for (let index = 0; index < count; index++) {
            const selectedIndex = Math.floor(Math.random() * candidates.length);
            loot.push(candidates[selectedIndex]);
            if (!this.AllowDuplicate) {
                candidates.splice(selectedIndex, 1);
            }
        }
        return loot;
    }
}
