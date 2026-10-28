import { Button, instantiate, isValid, Label, Node, Sprite, UITransform } from 'cc';
import { ZRSJZ_FishingFestivalService as Fish } from '../Service/ZRSJZ_FishingFestivalService';
import { ZRSJZ_FISH_CATALOG, ZRSJZ_FISHING_BAITS, ZRSJZ_PROP_CONFIG, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager as UI } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
export class ZRSJZ_FishingFestivalPage {
    busy = false;
    private offers: Node[] = [];
    private fish: Node[] = [];
    private names: string[] = [];
    private requests = new WeakMap<Sprite,string>();
    private iconBounds = new WeakMap<Sprite, { width: number; height: number }>();
    constructor(private page: Node) {
        Fish.Ensure();
        const offerTemplate=page.getChildByName('兑换模板');
        const offerOrigin=offerTemplate?.position.clone();
        const offerSize=offerTemplate?.getComponent(UITransform);
        const offerStepX=(offerSize?.width ?? 225)*Math.abs(offerTemplate?.scale.x ?? 1)+40;
        const offerStepY=(offerSize?.height ?? 300)*Math.abs(offerTemplate?.scale.y ?? 1)+30;
        for(let i=0;offerTemplate && i<6;i++){
            const n=i?instantiate(offerTemplate):offerTemplate;if(i)n.parent=page;
            if(i)n.name='兑换'+i;
            n.setPosition(offerOrigin.x+(i%3)*offerStepX,offerOrigin.y-Math.floor(i/3)*offerStepY,offerOrigin.z);n.active=true;
            this.Bind(n.getChildByName('按钮'),()=>void this.Exchange(i));
            this.Bind(n.getChildByName('详情'),()=>{const o=Fish.State.offers[i];if(o)UI.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗,0,o.name,0);});
            this.offers.push(n);
        }
        const fishTemplate=page.getChildByName('渔获模板');
        const fishOrigin=fishTemplate?.position.clone();
        const fishSize=fishTemplate?.getComponent(UITransform);
        const fishStepX=(fishSize?.width ?? 135)*Math.abs(fishTemplate?.scale.x ?? 1)+37;
        const fishStepY=(fishSize?.height ?? 192)*Math.abs(fishTemplate?.scale.y ?? 1)+38;
        if(fishTemplate) ZRSJZ_FISH_CATALOG.forEach((f,i)=>{
            const n=i?instantiate(fishTemplate):fishTemplate;if(i)n.parent=page;
            if(i)n.name='渔获'+i;
            n.setPosition(fishOrigin.x+(i%5)*fishStepX,fishOrigin.y-Math.floor(i/5)*fishStepY,fishOrigin.z);n.active=true;
            this.Text(n,'名称',f.name);this.Text(n.getChildByName('按钮'),'文字','+'+f.points+'分');
            this.Icon(n,f.name,false);this.Bind(n.getChildByName('按钮'),()=>{
                if(this.busy)return;UI.Instance.ShowTip(Fish.Submit(f.name)||`提交成功，积分 +${f.points}`);this.Render();
            });
            this.Bind(n.getChildByName('详情'),()=>UI.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗,0,f.name,0));
            this.fish.push(n);
        });
        this.Bind(page.getChildByName('刷新'),()=>{if(!this.busy){UI.Instance.ShowTip(Fish.Refresh()||'奖励已刷新');this.Render();}});
        ZRSJZ_FISHING_BAITS.slice(1).forEach((b,i)=>{
            const n=page.getChildByName('购买鱼饵'+i),cost=ZRSJZ_PROP_CONFIG.get(b.name).UnitPrice*5;
            this.Text(n,'文字',`${b.name}×5\n${cost.toLocaleString()}货币`);
            this.Bind(n,()=>{
                if(this.busy)return;const error=Fish.BuyBait(b.name);
                if(error)UI.Instance.ShowTip(error);else void this.Exchange();
            });
        });
    }
    private Bind(n:Node,fn:()=>void):void {
        const button=n?.getComponent(Button);if(!button)return;
        button.clickEvents=[];n.on(Button.EventType.CLICK,fn);
    }
    private Text(n:Node,path:string,value:string):void {
        const label=n?.getChildByName(path)?.getComponent(Label);if(label)label.string=value;
    }
    private Icon(n:Node,name:string,fitToBounds=true):void {
        const icon=n.getChildByName('图标')?.getComponent(Sprite);
        const frame=n.getChildByName('品质框')?.getComponent(Sprite);
        const transform=icon?.getComponent(UITransform);
        if(icon){
            if(fitToBounds && transform && !this.iconBounds.has(icon))this.iconBounds.set(icon,{width:transform.width,height:transform.height});
            this.requests.set(icon,name);icon.spriteFrame=null;
            UI.Instance.GetPropUI(name)?.then(sf=>{
            if(!sf||!isValid(icon)||this.requests.get(icon)!==name)return;
            icon.spriteFrame=sf;
            // 渔获图标只换图，CUSTOM 模式及节点宽高由预制体控制。
            if(!fitToBounds || !transform)return;
            icon.sizeMode=Sprite.SizeMode.CUSTOM;
            const bounds=this.iconBounds.get(icon);
            const k=Math.min(bounds.width/Math.max(1,sf.originalSize.width),bounds.height/Math.max(1,sf.originalSize.height));
            icon.getComponent(UITransform)?.setContentSize(sf.originalSize.width*k,sf.originalSize.height*k);
        }).catch(e=>console.warn('[渔获] 图标加载失败',e));
        }
        const quality=ZRSJZ_PROP_CONFIG.get(name)?.Quality;
        if(!frame || !quality)return;
        this.requests.set(frame,name);
        UI.Instance.GetPropGridUI(quality+'1_1')?.then(sf=>{
            if(sf&&isValid(frame)&&this.requests.get(frame)===name){frame.sizeMode=Sprite.SizeMode.CUSTOM;frame.spriteFrame=sf;}
        }).catch(e=>console.warn('[渔获] 品质框加载失败',e));
    }
    Render():void {
        if(!isValid(this.page))return;
        this.Text(this.page,'积分','渔获积分：'+Fish.State.points);
        this.Text(this.page.getChildByName('刷新'),'文字',`刷新奖励 · ${Fish.RefreshCost}积分`);
        this.fish.forEach((n,i)=>this.Text(n,'数量','仓库 ×'+Fish.Count(ZRSJZ_FISH_CATALOG[i].name)));
        this.offers.forEach((n,i)=>{
            if(!isValid(n))return;
            const o=Fish.State.offers[i];n.active=!!o;if(!o)return;
            this.Text(n,'名称',(o.name==='英雄碎片'?'角色碎片':o.name)+'×'+o.count);
            this.Text(n.getChildByName('按钮'),'文字',o.cost+' 积分兑换');
            const button=n.getChildByName('按钮'),sold=n.getChildByName('售罄');
            if(button)button.active=!o.sold;if(sold)sold.active=o.sold;
            if(this.names[i]!==o.name){this.names[i]=o.name;this.Icon(n,o.name);}
        });
    }
    async Exchange(index?:number):Promise<void>{
        if(this.busy)return;
        if(index!==undefined){const error=Fish.BeginExchange(index);if(error){UI.Instance.ShowTip(error);return;}}
        const pending=Fish.State.pending;if(!pending)return;
        this.busy=true;this.Render();
        try{
            const ids=pending.ids.filter(id=>{const p=ZRSJZ_GameData.Instance.PropData[id];return p&&!p.GridData?.some(g=>g.GridX>=0&&g.GridY>=0);});
            const mail=await UI.Instance.ReceiveExistingProps(ids);Fish.CompleteExchange();
            if(isValid(this.page)){
                UI.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗,{Awards:[{TaskAwardName:pending.name,TaskAwardCount:pending.count}],DisplayOnly:true});
                if(mail.length)UI.Instance.ShowTip('仓库已满，奖励已发送邮箱');
            }
        }catch(e){console.error('[渔获] 奖励保留待领取',e);UI.Instance.ShowTip('奖励已保存，请重新打开活动继续领取');}
        finally{this.busy=false;this.Render();}
    }
}
