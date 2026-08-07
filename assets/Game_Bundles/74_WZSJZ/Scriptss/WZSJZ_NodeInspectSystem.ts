import { _decorator, Component, Node, UITransform } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';

const { ccclass } = _decorator;

export interface WZSJZ_NodeIntroduceData {
    Name: string;
    LevelText: string;
    ImagePath: string;
    DetailLines: string[];
    /** 面板显示期间用于实时刷新击杀经验、等级和对应战斗数值。 */
    RefreshData?: () => WZSJZ_NodeIntroduceData | null;
}

/** 负责节点单击详情与场景攻击范围显示，不把展示逻辑堆到GameManager中。 */
@ccclass('WZSJZ_NodeInspectSystem')
export class WZSJZ_NodeInspectSystem extends Component {
    private static _instance: WZSJZ_NodeInspectSystem = null;
    public static get Instance(): WZSJZ_NodeInspectSystem {
        return this._instance;
    }

    private _attackRangeNode: Node = null;

    protected onLoad(): void {
        WZSJZ_NodeInspectSystem._instance = this;
    }

    public Configure(attackRangeNode: Node): void {
        this._attackRangeNode = attackRangeNode;
        this.HideAttackRange();
    }

    public Show(gameNode: WZSJZ_GameNode): void {
        if (!gameNode?.node?.isValid) {
            return;
        }
        const material = WZSJZ_Constant.GetMaterialConfig(gameNode.Name);
        const level = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
        if (!material || !level) {
            return;
        }

        this.ShowAttackRange(gameNode, level.AttackRange || 0);
        const imagePath = material.ResourceType === 'none'
            && material.BattlePlacement === 'formation'
            ? `Sprites/字/${gameNode.Name}`
            : level.SpritePath;
        const data = this.BuildIntroduceData(gameNode, imagePath);
        data.RefreshData = (): WZSJZ_NodeIntroduceData | null => {
            if (!gameNode.node?.isValid) {
                return null;
            }
            const currentMaterial = WZSJZ_Constant.GetMaterialConfig(gameNode.Name);
            const currentLevel = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
            if (!currentMaterial || !currentLevel) {
                return null;
            }
            const currentImagePath = currentMaterial.ResourceType === 'none'
                && currentMaterial.BattlePlacement === 'formation'
                ? `Sprites/字/${gameNode.Name}`
                : currentLevel.SpritePath;
            return this.BuildIntroduceData(gameNode, currentImagePath);
        };
        WZSJZ_UIManager.Instance.ShowPanel(
            WZSJZ_Constant.Panel.IntroducePanel,
            [data],
        );
    }

    public HideAttackRange(): void {
        if (this._attackRangeNode?.isValid) {
            this._attackRangeNode.active = false;
        }
    }

    protected onDestroy(): void {
        this.HideAttackRange();
        WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.IntroducePanel);
        if (WZSJZ_NodeInspectSystem._instance === this) {
            WZSJZ_NodeInspectSystem._instance = null;
        }
    }

    private ShowAttackRange(gameNode: WZSJZ_GameNode, attackRange: number): void {
        const rangeNode = this._attackRangeNode;
        const maxRange = WZSJZ_Constant.NodeInteraction.MaxDisplayedAttackRange;
        if (!rangeNode?.isValid || attackRange <= 0) {
            this.HideAttackRange();
            return;
        }
        const parentTransform = rangeNode.parent?.getComponent(UITransform);
        const rangeTransform = rangeNode.getComponent(UITransform);
        if (!parentTransform || !rangeTransform) {
            this.HideAttackRange();
            return;
        }
        // 场景里的该节点目前是UI_2D层，而游戏相机使用游戏层；跟随被查看物体
        // 的Layer，确保范围图确实能被当前相机渲染。
        rangeNode.layer = gameNode.node.layer;
        rangeNode.setPosition(parentTransform.convertToNodeSpaceAR(gameNode.node.worldPosition));
        const displayedRange = Math.min(attackRange, maxRange);
        rangeTransform.setContentSize(displayedRange * 2, displayedRange * 2);
        rangeNode.active = true;
    }

    private BuildIntroduceData(
        gameNode: WZSJZ_GameNode,
        imagePath: string,
    ): WZSJZ_NodeIntroduceData {
        const material = WZSJZ_Constant.GetMaterialConfig(gameNode.Name);
        const level = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
        const levelText = material?.IsNameUnit && gameNode.CanUpgrade()
            ? `LV.${gameNode.Level}(${Math.floor(gameNode.GetExperienceProgress() * 100)}%)`
            : `LV.${gameNode.Level}`;

        let detailLines: string[];
        if ((level?.AttackDamage || 0) > 0) {
            detailLines = [
                `攻击力：${level.AttackDamage}`,
                `攻速：${this.FormatNumber(level.AttackInterval || 0)}s`,
                level.AttackRange === 99999
                    ? '攻击距离：全场'
                    : `攻击距离：${this.FormatNumber(level.AttackRange || 0)}`,
            ];
        } else if ((level?.ProductionPerSecond || 0) > 0) {
            const resourceName = material?.ResourceType === 'money' ? '钞票' : '食物';
            detailLines = [
                `每秒产出：${this.FormatNumber(level.ProductionPerSecond)}${resourceName}`,
                `最高等级：LV.${material?.MaxLevel || gameNode.Level}`,
                '类型：资源',
            ];
        } else if ((level?.MaxHealth || 0) > 0) {
            detailLines = [
                `生命值：${this.FormatNumber(level.MaxHealth)}`,
                `最高等级：LV.${material?.MaxLevel || gameNode.Level}`,
                '类型：防御建筑',
            ];
        } else if (gameNode.Name === '钥匙') {
            detailLines = ['用途：解锁格子', '不可合成', '类型：道具'];
        } else {
            detailLines = [
                '攻击力：--',
                '攻速：--',
                '攻击距离：--',
            ];
        }
        return { Name: gameNode.Name, LevelText: levelText, ImagePath: imagePath, DetailLines: detailLines };
    }

    private FormatNumber(value: number): string {
        return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
}
