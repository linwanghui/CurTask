import { Button, instantiate, isValid, Label, Node, Sprite, UITransform } from 'cc';
import { ZRSJZ_FISHING_BAITS } from '../ZRSJZ_Constant';
import { ZRSJZ_FishingBaitService as Bait } from '../Service/ZRSJZ_FishingBaitService';
import { ZRSJZ_UIManager as UI } from '../Manager/ZRSJZ_UIManager';
export class ZRSJZ_FishingBaitBar {
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
                if(bait.name && Bait.Count(bait.name,this.player)<=0){UI.Instance.ShowTip('背包和仓库鱼饵不足');return;}
                this.selected=bait.name;this.Render();
            });
            slot.getChildByName('名称').getComponent(Label).string=bait.name||'空鱼饵';
            const icon=slot.getChildByName('图标').getComponent(Sprite);
            icon.node.active=!!bait.name;
            if(bait.name) UI.Instance.GetPropUI(bait.name)?.then(sf=>{if(sf&&isValid(icon)){icon.spriteFrame=sf;icon.sizeMode=Sprite.SizeMode.CUSTOM;icon.getComponent(UITransform).setContentSize(70,70);}}).catch(e=>console.warn('[鱼饵] 图标加载失败',e));
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
