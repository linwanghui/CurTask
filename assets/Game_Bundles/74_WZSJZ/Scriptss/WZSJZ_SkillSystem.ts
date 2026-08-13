import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
import { WZSJZ_CommonEffectSystem } from './WZSJZ_CommonEffectSystem';
import { WZSJZ_Constant, WZSJZ_SkillConfig } from './WZSJZ_Constant';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_SkillButtom } from './WZSJZ_SkillButtom';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass } = _decorator;

interface WZSJZ_ActiveSkillButton {
    Config: WZSJZ_SkillConfig;
    ButtonNode: Node;
}

/** 根据场上的组合角色维护技能栏；多个角色拥有同一技能时只显示一个共享按钮。 */
@ccclass('WZSJZ_SkillSystem')
export class WZSJZ_SkillSystem extends Component {
    private _skillBar: Node = null;
    private _wallDisplayNode: Node = null;
    private _owners: WZSJZ_GameNode[] = [];
    private _buttonPrefabs: Map<string, Prefab> = new Map();
    private _activeButtons: WZSJZ_ActiveSkillButton[] = [];

    protected onLoad(): void {
        this.node.on(
            WZSJZ_EventManager.组合单位变化,
            this.OnCombinationUnitsChanged,
            this,
        );
    }

    public Configure(preparationZone: Node, wallDisplayNode: Node): void {
        this._skillBar = preparationZone?.getChildByName("技能栏") || null;
        this._wallDisplayNode = wallDisplayNode;
        if (!this._skillBar) {
            console.error("[WZSJZ] 操作区下没有找到“技能栏”节点。");
            return;
        }
        for (const config of WZSJZ_Constant.CharacterSkills) {
            void this.PrepareSkillResources(config);
        }
        this.SyncSkillButtons();
    }

    private OnCombinationUnitsChanged(owners: WZSJZ_GameNode[]): void {
        this._owners = (owners || []).filter((owner) => !!owner?.node?.isValid);
        this.SyncSkillButtons();
    }

    private async PrepareSkillResources(config: WZSJZ_SkillConfig): Promise<void> {
        try {
            const effectSystem = WZSJZ_CommonEffectSystem.Instance;
            const [buttonPrefab] = await Promise.all([
                WZSJZ_Incident.Loadprefab(config.ButtonPrefabPath),
                effectSystem?.RegisterEffect(
                    config.EffectName,
                    config.EffectPrefabPath,
                    config.Duration,
                    config.EffectPrewarm,
                ) || Promise.resolve(false),
            ]);
            if (!this.node?.isValid) {
                return;
            }
            this._buttonPrefabs.set(this.GetConfigKey(config), buttonPrefab);
            this.SyncSkillButtons();
        } catch (error) {
            console.error(`[WZSJZ] 技能资源加载失败：${config.Id}`, error);
        }
    }

    private SyncSkillButtons(): void {
        if (!this._skillBar) {
            return;
        }
        const desiredConfigs = new Set<WZSJZ_SkillConfig>();
        for (const owner of this._owners) {
            if (!owner?.node?.isValid) {
                continue;
            }
            for (const config of this.GetOwnerSkillConfigs(owner)) {
                desiredConfigs.add(config);
            }
        }
        for (let index = this._activeButtons.length - 1; index >= 0; index--) {
            const entry = this._activeButtons[index];
            if (desiredConfigs.has(entry.Config)) {
                continue;
            }
            if (entry.ButtonNode?.isValid) {
                entry.ButtonNode.destroy();
            }
            this._activeButtons.splice(index, 1);
        }

        for (const config of desiredConfigs) {
            if (this._activeButtons.some((entry) => entry.Config === config)) {
                continue;
            }
            const prefab = this._buttonPrefabs.get(this.GetConfigKey(config));
            if (!prefab) {
                continue;
            }
            const buttonNode = instantiate(prefab);
            buttonNode.setParent(this._skillBar);
            buttonNode.setPosition(0, 0, 0);
            this.SetLayerRecursively(buttonNode, this._skillBar.layer);
            const button = buttonNode.getComponent(WZSJZ_SkillButtom)
                || buttonNode.addComponent(WZSJZ_SkillButtom);
            button.Configure(config.Cooldown, () => this.ExecuteSkill(config));
            this._activeButtons.push({ Config: config, ButtonNode: buttonNode });
        }
    }

    private ExecuteSkill(config: WZSJZ_SkillConfig): boolean {
        switch (config.EffectType) {
            case "wall_invincible": {
                const wall = this._wallDisplayNode?.getComponent(WZSJZ_Wall);
                if (!wall?.IsAlive) {
                    WZSJZ_UIManager.Instance.ShowText("当前没有可保护的围墙");
                    return false;
                }
                wall.SetInvincible(config.Duration);
                WZSJZ_CommonEffectSystem.Instance?.Play(
                    config.EffectName,
                    wall.node.worldPosition,
                    config.Duration,
                );
                return true;
            }
            default:
                return false;
        }
    }

    private GetOwnerSkillConfigs(owner: WZSJZ_GameNode): WZSJZ_SkillConfig[] {
        return WZSJZ_Constant.CharacterSkills.filter((config) => config.OwnerName === owner.Name);
    }

    private GetConfigKey(config: WZSJZ_SkillConfig): string {
        return `${config.OwnerName}:${config.Id}`;
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }
}
