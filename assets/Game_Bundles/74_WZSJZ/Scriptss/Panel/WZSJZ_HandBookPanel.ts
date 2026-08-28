import {
    _decorator,
    Button,
    EventTouch,
    instantiate,
    Label,
    Layout,
    Node,
    Sprite,
    SpriteFrame,
} from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_Incident } from '../WZSJZ_Incident';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';

const { ccclass } = _decorator;

/** 组合角色图鉴；条目数量和内容完全由Constant.NameCombinations驱动。 */
@ccclass('WZSJZ_HandBookPanel')
export class WZSJZ_HandBookPanel extends PanelBase {
    private _entries: Node[] = [];
    private _isBuilt: boolean = false;
    private _selectedIndex: number = 0;
    private _selectionVersion: number = 0;

    public Show(): void {
        super.Show(this.node.getChildByName("Panel"));
        this.BuildEntries();
        this.SelectEntry(Math.max(
            0,
            Math.min(this._selectedIndex, WZSJZ_Constant.NameCombinations.length - 1),
        ));
    }

    public OnButtonClick(event: EventTouch): void {
        if (event.getCurrentTarget().name === "关闭") {
            WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.HandBookPanel);
        }
    }

    private BuildEntries(): void {
        if (this._isBuilt) return;
        const content = this.node.getChildByPath("Panel/弹版/选择框/Mask/Content");
        const template = content?.getChildByName("选择框");
        if (!content || !template) {
            console.error('[WZSJZ] HandBookPanel缺少选择框/Mask/Content/选择框模板。');
            return;
        }
        this._isBuilt = true;
        const recipes = WZSJZ_Constant.NameCombinations;
        for (let index = 0; index < recipes.length; index++) {
            const recipe = recipes[index];
            const entry = index === 0 ? template : instantiate(template);
            if (index > 0) entry.setParent(content);
            entry.name = `选择框_${recipe.Name}`;
            entry.getChildByName("选中").active = false;
            if (!entry.getComponent(Button)) entry.addComponent(Button);
            entry.on(Button.EventType.CLICK, () => this.SelectEntry(index), this);
            this._entries.push(entry);
            void this.LoadImage(
                entry.getChildByName("图片")?.getComponent(Sprite),
                recipe.Name,
            );
        }
        content.getComponent(Layout)?.updateLayout();
    }

    private SelectEntry(index: number): void {
        const recipe = WZSJZ_Constant.NameCombinations[index];
        if (!recipe) return;
        this._selectedIndex = index;
        for (let entryIndex = 0; entryIndex < this._entries.length; entryIndex++) {
            const selected = this._entries[entryIndex]?.getChildByName("选中");
            if (selected) selected.active = entryIndex === index;
        }

        const root = this.node.getChildByPath("Panel/弹版");
        const version = ++this._selectionVersion;
        void this.LoadSelectedImage(
            root?.getChildByName("字0")?.getComponent(Sprite),
            recipe.Parts[0],
            version,
        );
        void this.LoadSelectedImage(
            root?.getChildByName("字1")?.getComponent(Sprite),
            recipe.Parts[1],
            version,
        );

        const skill = WZSJZ_Constant.CharacterSkills
            .find((config) => config.OwnerName === recipe.Name);
        const skillName = root?.getChildByName("文本")?.getComponent(Label);
        if (skillName) skillName.string = skill ? `技能：${skill.Id}` : "技能：暂无";
        const description = root?.getChildByName("技能描述")?.getComponent(Label);
        if (description) {
            description.string = skill
                ? `${skill.Description}\n冷却时间：${skill.Cooldown}秒`
                : "该组合单位暂未配置技能。";
        }
    }

    private async LoadImage(sprite: Sprite, imageName: string): Promise<void> {
        if (!sprite || !imageName) return;
        sprite.spriteFrame = null;
        const frame = await WZSJZ_Incident.LoadSprite(
            `Sprites/字/${imageName}`,
        ) as SpriteFrame;
        if (sprite.node?.isValid) sprite.spriteFrame = frame;
    }

    private async LoadSelectedImage(
        sprite: Sprite,
        imageName: string,
        version: number,
    ): Promise<void> {
        if (!sprite || !imageName) {
            if (sprite) sprite.spriteFrame = null;
            return;
        }
        sprite.spriteFrame = null;
        const frame = await WZSJZ_Incident.LoadSprite(
            `Sprites/字/${imageName}`,
        ) as SpriteFrame;
        if (version === this._selectionVersion && sprite.node?.isValid) {
            sprite.spriteFrame = frame;
        }
    }
}
