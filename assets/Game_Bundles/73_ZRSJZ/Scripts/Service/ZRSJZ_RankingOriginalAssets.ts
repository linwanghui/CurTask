import { Asset, assetManager, ImageAsset, sp } from 'cc';

const MANIFEST = {
  "images": [
    {
      "key": "art/row.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/排行榜/榜单框"
    },
    {
      "key": "art/self.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/排行榜/未上榜"
    },
    {
      "key": "art/medal1.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/排行榜/第一"
    },
    {
      "key": "art/medal2.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/排行榜/第二"
    },
    {
      "key": "art/medal3.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/排行榜/第三"
    },
    {
      "key": "art/currency.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/金币框/金币"
    },
    {
      "key": "art/avatar0.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/威蓝"
    },
    {
      "key": "art/avatar1.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/烬猎"
    },
    {
      "key": "art/avatar2.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/弑岚"
    },
    {
      "key": "art/avatar3.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/泠汐"
    },
    {
      "key": "art/avatar4.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/夜喵"
    },
    {
      "key": "art/avatar5.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/绯朔"
    },
    {
      "key": "art/avatar6.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/灼戈"
    },
    {
      "key": "art/avatar7.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/星栗"
    },
    {
      "key": "art/avatar8.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/黯祁"
    },
    {
      "key": "art/avatar9.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/沧戈"
    },
    {
      "key": "art/avatar10.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/狩荒"
    },
    {
      "key": "art/avatar11.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/煌罡"
    },
    {
      "key": "art/avatar12.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/霁锋"
    },
    {
      "key": "art/avatar13.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/赤骁"
    },
    {
      "key": "art/avatar14.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/鸦暝"
    },
    {
      "key": "art/avatar15.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/浅燎"
    },
    {
      "key": "art/avatar16.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/鸢铠"
    },
    {
      "key": "art/avatar17.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像/凌魇"
    },
    {
      "key": "art/frame1.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像框/Icon/1"
    },
    {
      "key": "art/frame2.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像框/Icon/2"
    },
    {
      "key": "art/frame3.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像框/Icon/3"
    },
    {
      "key": "art/frame4.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像框/Icon/4"
    },
    {
      "key": "art/frame5.png",
      "bundle": "73_ZRSJZ_DLC",
      "path": "Sprites/头像框/头像框/Icon/5"
    },
    {
      "key": "art/weapon0.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/1/CN8-突击步枪"
    },
    {
      "key": "art/weapon1.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/1/CN8-毒剂"
    },
    {
      "key": "art/weapon2.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/1/CN8-红魔"
    },
    {
      "key": "art/weapon3.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/2/DX9-冲锋枪"
    },
    {
      "key": "art/weapon4.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/2/DX9-零"
    },
    {
      "key": "art/weapon5.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/2/DX9-未来金属"
    },
    {
      "key": "art/weapon6.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/3/K50-轻机枪"
    },
    {
      "key": "art/weapon7.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/3/K50-云雾"
    },
    {
      "key": "art/weapon8.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/4/RK77-轻机枪"
    },
    {
      "key": "art/weapon9.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/4/RK77-鼓手"
    },
    {
      "key": "art/weapon10.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/HK416-突击步枪"
    },
    {
      "key": "art/weapon11.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/SCAR-H-战斗步枪"
    },
    {
      "key": "art/weapon12.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/MCX-突击步枪"
    },
    {
      "key": "art/weapon13.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/AK12-突击步枪"
    },
    {
      "key": "art/weapon14.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/M249-轻机枪"
    },
    {
      "key": "art/weapon15.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/MG5-轻机枪"
    },
    {
      "key": "art/weapon16.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/霜月狼"
    },
    {
      "key": "art/weapon17.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/裂海鲨"
    },
    {
      "key": "art/weapon18.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/冲锋枪/焚天龙"
    },
    {
      "key": "art/weapon19.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/狙击枪/1/ssv-狙击枪"
    },
    {
      "key": "art/weapon20.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/狙击枪/1/ssv-星零"
    },
    {
      "key": "art/weapon21.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/狙击枪/1/ssv-鎏光"
    },
    {
      "key": "art/weapon22.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/狙击枪/2/W76-狙击枪"
    },
    {
      "key": "art/weapon23.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/狙击枪/2/W76-寒汐"
    },
    {
      "key": "art/weapon24.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/狙击枪/2/W76-紫墟"
    },
    {
      "key": "art/weapon25.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/狙击枪/AWM-狙击枪"
    },
    {
      "key": "art/weapon26.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/狙击枪/M82A1-狙击枪"
    },
    {
      "key": "art/weapon27.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/散弹枪/1/FS-霰弹枪"
    },
    {
      "key": "art/weapon28.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/散弹枪/1/FS-白弧"
    },
    {
      "key": "art/weapon29.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/散弹枪/1/FS-橙灼"
    },
    {
      "key": "art/weapon30.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/散弹枪/2/KK41-霰弹枪"
    },
    {
      "key": "art/weapon31.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/散弹枪/2/KK41-见雪"
    },
    {
      "key": "art/weapon32.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/散弹枪/2/KK41-绫虹"
    },
    {
      "key": "art/weapon33.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/散弹枪/AA12-霰弹枪"
    },
    {
      "key": "art/weapon34.png",
      "bundle": "73_ZRSJZ",
      "path": "Sprites/Weaponry/散弹枪/DP12-霰弹枪"
    }
  ],
  "skeletons": [
    {
      "id": "player",
      "path": "Spine/玩家/1"
    },
    {
      "id": "frame6",
      "path": "Sprites/头像框/头像框/Spine/6/1"
    },
    {
      "id": "frame7",
      "path": "Sprites/头像框/头像框/Spine/7/1"
    },
    {
      "id": "frame8",
      "path": "Sprites/头像框/头像框/Spine/8/1"
    },
    {
      "id": "frame9",
      "path": "Sprites/头像框/头像框/Spine/9/1"
    },
    {
      "id": "frame10",
      "path": "Sprites/头像框/头像框/Spine/10/1"
    }
  ]
};

/** 只向开放域提供固定游戏美术及本地路径，不接收其他玩家数据。 */
export class ZRSJZ_RankingOriginalAssets {
    private static retained = new Map<string, Asset>();
    private static paths = new Map<string, Promise<string>>();
    private static Load<T extends Asset>(bundleName: string, path: string, type: new (...args: any[]) => T): Promise<T> {
        return new Promise((resolve, reject) => {
            const bundle = assetManager.getBundle(bundleName);
            if (!bundle) { reject(new Error('资源包尚未加载：' + bundleName)); return; }
            bundle.load(path, type, (error, asset) => {
                if (error) { reject(error); return; }
                const key = bundleName + ':' + path;
                if (!this.retained.has(key)) { asset.addRef(); this.retained.set(key, asset); }
                resolve(asset);
            });
        });
    }
    private static LocalPath(image: ImageAsset): Promise<string> {
        const url = image.nativeUrl;
        let pending = this.paths.get(url);
        if (pending) return pending;
        pending = new Promise((resolve, reject) => {
            const manager = (assetManager as any).cacheManager;
            const cached = manager?.getCache(url) || manager?.getTemp(url);
            if (cached) { resolve(cached); return; }
            const source = (image.data as any)?.src || url;
            if (!/^https?:/.test(source)) { resolve(source); return; }
            let done = false;
            const finish = (path?: string, error?: any) => {
                if (done) return; done = true; clearTimeout(timer);
                if (path) resolve(path); else reject(error || new Error('美术文件下载失败'));
            };
            const timer = setTimeout(() => finish(undefined, new Error('美术文件下载超时')), 30000);
            try { (globalThis as any).tt.downloadFile({ url, success: (r: any) => finish(r.tempFilePath), fail: (e: any) => finish(undefined, e) }); }
            catch (error) { finish(undefined, error); }
        });
        this.paths.set(url, pending); pending.catch(() => this.paths.delete(url));
        return pending;
    }
    public static async Send(context: any): Promise<void> {
        const post = (command: string, args: Record<string, string | number | boolean>) => context.postMessage({ranking:true,command,...args});
        const errors: string[] = [];
        const attempt = async (name: string, action: () => Promise<void>) => {
            try { await action(); }
            catch(error) { errors.push(name);console.warn('[排行榜美术] 加载失败：'+name,error); }
        };
        // 角色优先、逐个交付；任意武器图片或头像框失败都不会阻断前三名。
        for (const item of MANIFEST.skeletons) await attempt(item.id, async () => {
            const data = await this.Load('73_ZRSJZ_DLC', item.path, sp.SkeletonData);
            const raw = data.skeletonJson as any;
            const original = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!original || !data.atlasText) throw new Error('缺少Spine原始数据：'+item.path);
            const animations: Record<string, any> = {};
            const names = item.id === 'player' ? ['daiji_q','daiji_dao1'] : Object.keys(original.animations);
            for (const name of names) if(original.animations[name]) animations[name]=original.animations[name];
            const pages: Record<string, string> = {};
            // 单独按ImageAsset加载图集图片，避免依赖已上传/释放的Texture2D.image。
            const folder=item.path.slice(0,item.path.lastIndexOf('/')+1);
            for(const name of data.textureNames) {
                const path=folder+name.replace(/\\/g,'/').replace(/\.[^/.]+$/,'');
                const image=await this.Load('73_ZRSJZ_DLC',path,ImageAsset);
                pages[name]=await this.LocalPath(image);
            }
            if(!Object.keys(pages).length)throw new Error('Spine图集缺少图片：'+item.path);
            const skeleton={json:{...original,animations},atlas:data.atlasText,pages};
            const json=JSON.stringify({version:2,skeletons:{[item.id]:skeleton}}),token=item.id+':'+Date.now(),size=16384,count=Math.ceil(json.length/size);
            if(count>320)throw new Error('排行榜美术数据超出传输容量');
            post('artBegin',{token,count,length:json.length});
            for(let i=0;i<count;i++) {
                post('artChunk',{token,index:i,data:json.slice(i*size,(i+1)*size)});
                await new Promise<void>(resolve=>setTimeout(resolve,0));
            }
            post('artEnd',{token});
            console.log('[排行榜美术] 已发送原始资源：'+item.id);
        });
        const tasks = MANIFEST.images.map(item => async () => attempt(item.key, async () => {
            const image = await this.Load(item.bundle,item.path,ImageAsset);
            post('artPath',{key:item.key,path:await this.LocalPath(image)});
        }));
        let index=0;
        await Promise.all([0,1,2,3].map(async()=>{while(index<tasks.length)await tasks[index++]();}));
        if(errors.length)throw new Error('部分外观加载失败：'+errors.join('、'));
    }
}
