import { Button, instantiate, isValid, Label, Node, Sprite, UITransform } from 'cc';
import { ZRSJZ_FISHING_BAITS } from '../ZRSJZ_Constant';
import { ZRSJZ_FishingBaitService as Bait } from '../Service/ZRSJZ_FishingBaitService';
import { ZRSJZ_UIManager as UI } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
export class ZRSJZ_FishingBaitBar {
    // 展示文案，不参与实际品质权重计算。
    private static readonly BONUS_TEXT: Record<string,string> = {
        '玉米鱼饵': '(+30%爆率)',
        '鲜虾鱼饵': '(+60%爆率)',
        '磷光鱼饵': '(+100%爆率)',
    };
    public selected = '';
    private slots: Node[] = [];
    constructor(private root: Node, private player: number, private canChange: () => boolean) {
        const template = root.getChildByName('鱼饵模板');
        ZRSJZ_FISHING_BAITS.forEach((bait,i) => {
            const slot = i === 0 ? template : instantiate(template); if(i) slot.parent=root;
            slot.name = '鱼饵'+i; slot.setPosition(-195+i*130,0);slot.active=true;
            slot.getComponent(Button).clickEvents=[];
            slot.on(Button.EventType.CLICK,()=>{
                if(!this.canChange()){UI.Instance.ShowTip('请在本次收竿后更换鱼饵');return;}
                if(bait.name && Bait.Count(bait.name,this.player)<=0){UI.Instance.ShowTip('暂无鱼饵，可以在活动-鱼获丰收购买');return;}
                this.selected=bait.name;this.Render();
            });
            slot.getChildByName('名称').getComponent(Label).string=bait.name||'空鱼饵';
            const bonus=slot.getChildByName('概率加成');
            if(bonus){
                const text=ZRSJZ_FishingBaitBar.BONUS_TEXT[bait.name]||'';
                bonus.active=!!text;
                const label=bonus.getComponent(Label);if(label)label.string=text;
            }
            const icon=slot.getChildByName('图标').getComponent(Sprite);
            icon.node.active=true;
            const iconLoad = bait.name ? UI.Instance.GetPropUI(bait.name)
                : ZRSJZ_Tools.LoadSpriteByBundle('73_ZRSJZ', 'Sprites/Prop/钓鱼活动/空鱼饵');
            iconLoad?.then(sf=>{if(sf&&isValid(icon)){icon.spriteFrame=sf;icon.sizeMode=Sprite.SizeMode.CUSTOM;icon.getComponent(UITransform).setContentSize(70,70);}}).catch(e=>console.warn('[鱼饵] 图标加载失败',e));
            this.slots.push(slot);
        });
        this.Render();
    }
    Render(): void {
        this.slots.forEach((slot,i)=>{
            const name=ZRSJZ_FISHING_BAITS[i].name;
            slot.getChildByName('选中').active=this.selected===name;
            slot.getChildByName('数量').getComponent(Label).string=name?'×'+Bait.Count(name,this.player):'不消耗';
        });
    }
}
