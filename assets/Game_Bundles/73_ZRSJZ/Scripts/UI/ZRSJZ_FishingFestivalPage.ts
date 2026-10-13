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
    constructor(private page: Node) {
        Fish.Ensure();
        const offerTemplate=page.getChildByName('兑换模板');
        for(let i=0;i<6;i++){
            const n=i?instantiate(offerTemplate):offerTemplate;if(i)n.parent=page;
            n.name='兑换'+i;n.setPosition(-695+(i%3)*265,190-Math.floor(i/3)*330);n.active=true;
            this.Bind(n.getChildByName('按钮'),()=>void this.Exchange(i));
            this.Bind(n.getChildByName('详情'),()=>{const o=Fish.State.offers[i];if(o)UI.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗,0,o.name,0);});
            this.offers.push(n);
        }
        const fishTemplate=page.getChildByName('渔获模板');
        ZRSJZ_FISH_CATALOG.forEach((f,i)=>{
            const n=i?instantiate(fishTemplate):fishTemplate;if(i)n.parent=page;
            n.name='渔获'+i;n.setPosition(15+(i%5)*172,195-Math.floor(i/5)*230);n.active=true;
            this.Text(n,'名称',f.name);this.Text(n.getChildByName('按钮'),'文字','提交 +'+f.points+'分');
            this.Icon(n,f.name,90);this.Bind(n.getChildByName('按钮'),()=>{
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
    private Bind(n:Node,fn:()=>void):void { n.getComponent(Button).clickEvents=[];n.on(Button.EventType.CLICK,fn); }
    private Text(n:Node,path:string,value:string):void { n.getChildByName(path).getComponent(Label).string=value; }
    private Icon(n:Node,name:string,max:number):void {
        const icon=n.getChildByName('图标').getComponent(Sprite),frame=n.getChildByName('品质框').getComponent(Sprite);
        this.requests.set(icon,name);icon.spriteFrame=null;
        UI.Instance.GetPropUI(name)?.then(sf=>{
            if(!sf||!isValid(icon)||this.requests.get(icon)!==name)return;
            icon.spriteFrame=sf;icon.sizeMode=Sprite.SizeMode.CUSTOM;
            const k=Math.min(max/sf.originalSize.width,max/sf.originalSize.height);
            icon.getComponent(UITransform).setContentSize(sf.originalSize.width*k,sf.originalSize.height*k);
        }).catch(e=>console.warn('[渔获] 图标加载失败',e));
        UI.Instance.GetPropGridUI(ZRSJZ_PROP_CONFIG.get(name).Quality+'1_1')?.then(sf=>{
            if(sf&&isValid(frame)&&this.requests.get(icon)===name)frame.spriteFrame=sf;
        }).catch(e=>console.warn('[渔获] 品质框加载失败',e));
    }
    Render():void {
        if(!isValid(this.page))return;
        this.Text(this.page,'积分','渔获积分：'+Fish.State.points);
        this.fish.forEach((n,i)=>this.Text(n,'数量','仓库 ×'+Fish.Count(ZRSJZ_FISH_CATALOG[i].name)));
        this.offers.forEach((n,i)=>{
            const o=Fish.State.offers[i];n.active=!!o;if(!o)return;
            this.Text(n,'名称',(o.name==='英雄碎片'?'角色碎片':o.name)+'×'+o.count);
            this.Text(n.getChildByName('按钮'),'文字',o.cost+' 积分兑换');
            n.getChildByName('按钮').active=!o.sold;n.getChildByName('售罄').active=o.sold;
            if(this.names[i]!==o.name){this.names[i]=o.name;this.Icon(n,o.name,140);}
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
