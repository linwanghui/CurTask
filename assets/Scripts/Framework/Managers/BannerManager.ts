import { _decorator, Component, director, Mask, Node } from 'cc';
import Banner, { BannerMode, Channel } from '../../Banner';
import { GameManager } from '../../GameManager';
import { Panel, UIManager } from './UIManager';
import { Tools } from '../Utils/Tools';
import { ProjectEventManager } from './ProjectEventManager';
const { ccclass, property } = _decorator;
export enum Strategy {//所有策略
    王勇VR = "王勇VR",
    王勇OR = "王勇OR",
    王勇VA = "王勇VA",
    荣耀RPK = "荣耀RPK",
    华为RPK = "华为RPK",
    小米RPK = "小米RPK",
    深圳VR = "深圳VR",
    深圳OR = "深圳OR",
    深圳快手 = "深圳快手",
    深圳腾逸VR = "深圳腾逸VR",
    深圳腾逸OR = "深圳腾逸OR",
    深圳腾逸左耳跳跳虎VR = "深圳腾逸左耳跳跳虎VR",
    深圳腾逸左耳跳跳虎OR = "深圳腾逸左耳跳跳虎OR",

    王灵义 = "王灵义",
    通用不加宝箱 = "通用不加宝箱",
    通用加宝箱 = "通用加宝箱",
    安卓通用 = "安卓通用"
}

export enum BannerType {//广告类型
    Banner = "Banner",
    原生 = "原生",
    视屏 = "视屏",
    宝箱 = "宝箱",
    二次原 = "二次原",
    三十秒自弹原生 = "三十秒自弹原生",//此类广告加在其他策略中，否则重复执行会导致广告异常
    三十秒自弹Banner = "三十秒自弹Banner",//此类广告加在其他策略中，否则重复执行会导致广告异常
    四十秒自弹原生 = "四十秒自弹原生",//此类广告加在其他策略中，否则重复执行会导致广告异常
    四十五秒自弹原生 = "四十五秒自弹原生",//此类广告加在其他策略中，否则重复执行会导致广告异常
    九十秒自弹原生 = "九十秒自弹原生",//此类广告加在其他策略中，否则重复执行会导致广告异常
    延迟二十秒四十秒自弹原生 = "延迟二十秒四十秒自弹原生",//此类广告加在其他策略中，否则重复执行会导致广告异常
    五分钟自弹宝箱 = "五分钟自弹宝箱",//此类广告加在其他策略中，否则重复执行会导致广告异常
    三分钟自弹视屏 = "三分钟自弹视屏",//此类广告加在其他策略中，否则重复执行会导致广告异常
    三十五秒自弹添加桌面 = "三十五秒自弹添加桌面",//此类广告加在其他策略中，否则重复执行会导致广告异常
    六十秒自弹添加桌面 = "六十秒自弹添加桌面",//此类广告加在其他策略中，否则重复执行会导致广告异常
    九十秒自弹添加桌面 = "九十秒自弹添加桌面",//此类广告加在其他策略中，否则重复执行会导致广告异常
    一百二十秒自弹添加桌面 = "一百二十秒自弹添加桌面",//此类广告加在其他策略中，否则重复执行会导致广告异常
}

export enum MaskType {//屏蔽类型
    时间屏蔽 = "时间屏蔽",
    地区屏蔽 = "地区屏蔽",
    工作日屏蔽 = "工作日屏蔽",
    主页屏蔽 = "主页屏蔽",
}

@ccclass('BannerManager')
export class BannerManager extends Component {
    private static _instance: BannerManager = null;
    public static get Instance(): BannerManager {
        if (this._instance == null) {
            this._instance = new BannerManager();
        }
        return this._instance;
    }
    protected onLoad(): void {
        BannerManager._instance = this;

    }


    //整体策略(可以自行添加)(一般情况仅需修改此处)
    public static Strategy: Strategy = Strategy.王勇VR;



    //当前游戏策略
    public CurrentStrategy = null;
    //初始化(在黑白包判断完毕或者GG1GG2判断完毕之后执行)
    Init() {
        console.log("初始化广告脚本...");
        if (BannerManager.Strategy == Strategy.王勇VR) {
            if (window['wly'].insert_interval == 1) {
                this.CurrentStrategy = this.StrategyMode28;
            }
            if (window['wly'].insert_interval == 2) {
                this.CurrentStrategy = this.StrategyMode29;
            }
            if (window['wly'].insert_interval == 3) {
                this.CurrentStrategy = this.StrategyMode30;
            }
        }
        if (BannerManager.Strategy == Strategy.王勇OR) {
            if (window['wly'].insert_interval == 1) {
                this.CurrentStrategy = this.StrategyMode31;
            }
            if (window['wly'].insert_interval == 2) {
                this.CurrentStrategy = this.StrategyMode32;
            }
        }
        if (BannerManager.Strategy == Strategy.王勇VA) {
            if (Banner.RegionMask) {
                this.CurrentStrategy = this.StrategyMode3;//黑包
            } else {
                this.CurrentStrategy = this.StrategyMode1;//白包
            }
        }
        if (BannerManager.Strategy == Strategy.荣耀RPK) {
            this.CurrentStrategy = this.StrategyMode4;
        }
        if (BannerManager.Strategy == Strategy.华为RPK) {
            this.CurrentStrategy = this.StrategyMode5;
        }
        if (BannerManager.Strategy == Strategy.小米RPK) {
            if (Banner.RegionMask) {
                this.CurrentStrategy = this.StrategyMode6;//黑包
            } else {
                this.CurrentStrategy = this.StrategyMode1;//白包
            }
        }
        if (BannerManager.Strategy == Strategy.深圳VR) {
            if (Banner.Instance.Vivo_IsBuyFlow()) {
                this.CurrentStrategy = this.StrategyMode10;
            } else {
                if (Banner.RegionMask) {
                    this.CurrentStrategy = this.StrategyMode9;//黑包
                } else {
                    this.CurrentStrategy = this.StrategyMode1;//白包
                }
            }
        }
        if (BannerManager.Strategy == Strategy.深圳OR) {
            if (window['htn'].getGGType == 0) {
                this.CurrentStrategy = this.StrategyMode7;//深圳策略GG0
            }
            if (window['htn'].getGGType == 1) {
                this.CurrentStrategy = this.StrategyMode11;//深圳OR策略GG1
            }
            if (window['htn'].getGGType == 2) {
                this.CurrentStrategy = this.StrategyMode12;//深圳OR策略GG2
            }
        }
        if (BannerManager.Strategy == Strategy.深圳腾逸VR) {
            if (window['htn'].getGGType == 1) {
                this.CurrentStrategy = this.StrategyMode13;//深圳腾逸策略GG1
            }
            if (window['htn'].getGGType == 2) {
                this.CurrentStrategy = this.StrategyMode14;//深圳腾逸策略GG2
            }
            if (window['htn'].getGGType == 3) {
                this.CurrentStrategy = this.StrategyMode15;//深圳腾逸策略GG3
            }
        }
        if (BannerManager.Strategy == Strategy.深圳腾逸OR) {
            if (window['htn'].getGGType == 1) {
                this.CurrentStrategy = this.StrategyMode16;//深圳腾逸策略GG1
            }
            if (window['htn'].getGGType == 2) {
                this.CurrentStrategy = this.StrategyMode17;//深圳腾逸策略GG2
            }
        }
        if (BannerManager.Strategy == Strategy.深圳腾逸左耳跳跳虎VR) {
            if (window['htn'].getGGType == 1) {
                this.CurrentStrategy = this.StrategyMode33;//
            }
            if (window['htn'].getGGType == 2) {
                this.CurrentStrategy = this.StrategyMode34;//
            }
            if (window['htn'].getGGType == 3) {
                this.CurrentStrategy = this.StrategyMode35;//
            }
        }
        if (BannerManager.Strategy == Strategy.深圳腾逸左耳跳跳虎OR) {
            if (window['htn'].getGGType == 1) {
                this.CurrentStrategy = this.StrategyMode36;//
            }
            if (window['htn'].getGGType == 2) {
                this.CurrentStrategy = this.StrategyMode37;//
            }

        }
        if (BannerManager.Strategy == Strategy.王灵义) {
            if (window['wly'].insert_interval == 1) {
                this.CurrentStrategy = this.StrategyMode18;
            }
            if (window['wly'].insert_interval == 2) {
                this.CurrentStrategy = this.StrategyMode19;
            }
            if (window['wly'].insert_interval == 3) {
                this.CurrentStrategy = this.StrategyMode20;
            }
        }
        if (BannerManager.Strategy == Strategy.通用不加宝箱) {
            if (Banner.RegionMask) {
                this.CurrentStrategy = this.StrategyMode21;//黑包
            } else {
                this.CurrentStrategy = this.StrategyMode1;//白包
            }
        }
        if (BannerManager.Strategy == Strategy.通用加宝箱) {
            if (Banner.RegionMask) {
                this.CurrentStrategy = this.StrategyMode22;//黑包
            } else {
                this.CurrentStrategy = this.StrategyMode1;//白包
            }
        }
        if (BannerManager.Strategy == Strategy.安卓通用) {
            if (Banner.RegionMask) {
                Banner.Instance.JudgeChannel((channel) => {
                    console.log("渠道：" + channel);
                    if (channel == Channel.VivoBtn) {
                        this.CurrentStrategy = this.StrategyMode23;//黑包
                    }
                    if (channel == Channel.OppoBtn) {
                        this.CurrentStrategy = this.StrategyMode24;//黑包
                    }
                    if (channel == Channel.XiaoMiBtn) {
                        this.CurrentStrategy = this.StrategyMode25;//黑包
                    }
                    if (channel == Channel.HuaweiBtn) {
                        this.CurrentStrategy = this.StrategyMode26;//黑包
                    }
                    if (channel == Channel.HonorBtn) {
                        this.CurrentStrategy = this.StrategyMode27;//黑包
                    }
                })
            } else {
                this.CurrentStrategy = this.StrategyMode1;//白包
            }
        }
        if (!this.CurrentStrategy) {
            console.log("广告未初始化！");
        } else {//处理其他策略
            this.ExecuteBanner(this.CurrentStrategy.首次主场景策略);
            this.ExecuteBanner(this.CurrentStrategy.其他策略);
            this.CurrentStrategy.游戏开始策略.forEach((element) => {
                if (element[0] == BannerType.宝箱 && this.GetBannerIsShow(element)) {
                    ProjectEventManager.GameStartIsShowTreasureBox = true;
                    console.log("游戏开始的时候有宝箱");
                }
            })
        }
    }


    //#region 策略
    //规范: [广告类型, 屏蔽规则1, 屏蔽规则2.....]
    //策略1(通用白包策略)可以自行增加或修改当前策略,
    public StrategyMode1 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: []//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件（不要将这些事件填入其他策略中反复调用）
    }
    //策略2(王勇VR黑包)
    public StrategyMode2 = {
        首次主场景策略: [],
        游戏开始策略: [[BannerType.宝箱, MaskType.时间屏蔽, MaskType.工作日屏蔽], [BannerType.原生], [BannerType.Banner]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略3(王勇VA)
    public StrategyMode3 = {
        首次主场景策略: [],
        游戏开始策略: [[BannerType.原生, MaskType.工作日屏蔽], [BannerType.Banner, MaskType.工作日屏蔽]],
        游戏结束策略: [[BannerType.原生, MaskType.工作日屏蔽], [BannerType.Banner, MaskType.工作日屏蔽]],
        弹出窗口策略: [[BannerType.原生, "Cd:30", MaskType.工作日屏蔽]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生, MaskType.工作日屏蔽]],
        其他策略: [[BannerType.三十秒自弹原生, MaskType.工作日屏蔽], [BannerType.九十秒自弹添加桌面, MaskType.工作日屏蔽], [BannerType.五分钟自弹宝箱, MaskType.工作日屏蔽]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略4(荣耀RPK)
    public StrategyMode4 = {
        首次主场景策略: [],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略5(华为RPK)
    public StrategyMode5 = {
        首次主场景策略: [],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略6(小米RPK)
    public StrategyMode6 = {
        首次主场景策略: [[BannerType.二次原]],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner], [BannerType.宝箱, MaskType.时间屏蔽]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner], [BannerType.宝箱, MaskType.时间屏蔽]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //(深圳正常包)
    public StrategyMode7 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [],
        页面转换策略: [],
        返回主页策略: [[BannerType.Banner]],
        其他策略: [],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略7(深圳VRGG1)
    public StrategyMode8 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [],
        页面转换策略: [],
        返回主页策略: [[BannerType.Banner]],
        其他策略: []//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略7(深圳VRGG2)
    public StrategyMode9 = {
        首次主场景策略: [],
        游戏开始策略: [[BannerType.宝箱, MaskType.时间屏蔽, MaskType.工作日屏蔽]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner, MaskType.工作日屏蔽]],
        弹出窗口策略: [[BannerType.原生, "Cd:30"]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生, "Cd:30"]],
        其他策略: [[BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略7(深圳VRGG2买量)
    public StrategyMode10 = {
        首次主场景策略: [],
        游戏开始策略: [[BannerType.宝箱, MaskType.时间屏蔽]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生, "Cd:30"]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生, "Cd:30"]],
        其他策略: [[BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略8(深圳ORGG1)
    public StrategyMode11 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略8(深圳ORGG2)
    public StrategyMode12 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生, "Cd:30"]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生, "Cd:30"]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略9(深圳腾逸VIVOGG1)
    public StrategyMode13 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生], [BannerType.Banner]],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略9(深圳腾逸VIVOGG2)
    public StrategyMode14 = {
        首次主场景策略: [[BannerType.原生]],
        游戏开始策略: [[BannerType.原生]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生], [BannerType.Banner]],
        页面转换策略: [[BannerType.原生], [BannerType.Banner]],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.四十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略9(深圳腾逸VIVOGG3)
    public StrategyMode15 = {
        首次主场景策略: [[BannerType.原生]],
        游戏开始策略: [[BannerType.原生], [BannerType.宝箱]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生], [BannerType.Banner]],
        页面转换策略: [[BannerType.原生], [BannerType.Banner]],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.四十秒自弹原生]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略10(深圳腾逸OPPOGG1)
    public StrategyMode16 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生, "Cd:90"], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生, "Cd:90"], [BannerType.Banner]],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略10(深圳腾逸OPPOGG2)
    public StrategyMode17 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [],
        弹出窗口策略: [],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.九十秒自弹原生]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略11(王灵义RPKGG1)
    public StrategyMode18 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略11(王灵义RPKGG2)
    public StrategyMode19 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.九十秒自弹原生], [BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略11(王灵义RPKGG3)
    public StrategyMode20 = {
        首次主场景策略: [],
        游戏开始策略: [[BannerType.宝箱]],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.四十五秒自弹原生], [BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略12(通用不加宝箱)
    public StrategyMode21 = {
        首次主场景策略: [[BannerType.二次原]],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.三十五秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //策略13(通用加宝箱)
    public StrategyMode22 = {
        首次主场景策略: [[BannerType.二次原]],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner], [BannerType.宝箱, MaskType.时间屏蔽]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner], [BannerType.宝箱, MaskType.时间屏蔽]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.三十五秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }

    //安卓VIVO
    public StrategyMode23 = {
        首次主场景策略: [[BannerType.二次原]],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //安卓OPPO
    public StrategyMode24 = {
        首次主场景策略: [[BannerType.二次原]],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner], [BannerType.宝箱, MaskType.时间屏蔽]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner], [BannerType.宝箱, MaskType.时间屏蔽]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //安卓XiaoMi
    public StrategyMode25 = {
        首次主场景策略: [[BannerType.二次原]],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner], [BannerType.宝箱, MaskType.时间屏蔽]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner], [BannerType.宝箱, MaskType.时间屏蔽]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //安卓HuaWei
    public StrategyMode26 = {
        首次主场景策略: [[BannerType.二次原]],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //安卓Honor
    public StrategyMode27 = {
        首次主场景策略: [[BannerType.二次原]],
        游戏开始策略: [[BannerType.原生], [BannerType.Banner]],
        游戏结束策略: [[BannerType.原生], [BannerType.Banner]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //王勇VIVOGG1
    public StrategyMode28 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //王勇VIVOGG2
    public StrategyMode29 = {
        首次主场景策略: [[BannerType.原生]],
        游戏开始策略: [[BannerType.原生]],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [[BannerType.原生]],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.四十秒自弹原生], [BannerType.九十秒自弹添加桌面]]//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //王勇VIVOGG3
    public StrategyMode30 = {
        首次主场景策略: [[BannerType.原生]],
        游戏开始策略: [[BannerType.原生], [BannerType.宝箱]],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [[BannerType.原生]],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.四十秒自弹原生]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //王勇OPPOGG1
    public StrategyMode31 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生, "Cd:90"]],
        弹出窗口策略: [[BannerType.原生, "Cd:90"]],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.九十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    //王勇OPPOGG2
    public StrategyMode32 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [],
        弹出窗口策略: [],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.九十秒自弹原生]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    public StrategyMode33 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [],
        返回主页策略: [],
        其他策略: [[BannerType.一百二十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    public StrategyMode34 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [[BannerType.原生]],
        返回主页策略: [],
        其他策略: [[BannerType.四十秒自弹原生], [BannerType.一百二十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    public StrategyMode35 = {
        首次主场景策略: [[BannerType.宝箱]],
        游戏开始策略: [[BannerType.宝箱]],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [[BannerType.原生]],
        页面转换策略: [[BannerType.原生]],
        返回主页策略: [],
        其他策略: [[BannerType.三十秒自弹原生], [BannerType.一百二十秒自弹添加桌面]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    public StrategyMode36 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [],
        页面转换策略: [[BannerType.原生]],
        返回主页策略: [],
        其他策略: [],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }
    public StrategyMode37 = {
        首次主场景策略: [],
        游戏开始策略: [],
        游戏结束策略: [[BannerType.原生]],
        弹出窗口策略: [],
        页面转换策略: [[BannerType.原生]],
        返回主页策略: [[BannerType.原生]],
        其他策略: [[BannerType.九十秒自弹原生]],//其他策略是指30s自弹，20s自弹，5分钟自弹宝箱等事件
    }

    //#endregion



    //游戏开始
    GameStart(GameName: string) {
        if (!this.CurrentStrategy) {
            console.log("广告未初始化！");
            return;
        }
        this.ExecuteBanner(this.CurrentStrategy.游戏开始策略);
    }
    //游戏结束
    GameOver(GameName: string) {
        if (!this.CurrentStrategy) {
            console.log("广告未初始化！");
            return;
        }
        this.ExecuteBanner(this.CurrentStrategy.游戏结束策略);
    }
    //弹出窗口
    OpenWindow(GameName: string) {
        if (!this.CurrentStrategy) {
            console.log("广告未初始化！");
            return;
        }
        this.ExecuteBanner(this.CurrentStrategy.弹出窗口策略);
    }
    //页面转换
    Changgepage(GameName: string) {
        if (!this.CurrentStrategy) {
            console.log("广告未初始化！");
            return;
        }
        this.ExecuteBanner(this.CurrentStrategy.页面转换策略);
    }
    //返回主页
    ReturnHomepage(GameName: string) {
        if (!this.CurrentStrategy) {
            console.log("广告未初始化！");
            return;
        }
        this.ExecuteBanner(this.CurrentStrategy.返回主页策略);
    }

    private CDData: string[][] = [];//CD池
    //传入策略执行
    ExecuteBanner(data: string[][]) {
        for (let i = 0; i < data.length; i++) {
            if (this.GetBannerIsShow(data[i])) {
                if (this.CDData.indexOf(data[i]) != -1) {
                    console.log("此广告在CD池中，不展示！");
                    return;
                }
                let BannerID: string = "";
                if (this.ReturnAdvertising(data[i], "ID:") != "") {
                    BannerID = this.ReturnAdvertising(data[i], "ID:");
                }
                let Top: number = -999;
                if (this.ReturnAdvertising(data[i], "Top:") != "") {
                    Top = Number(this.ReturnAdvertising(data[i], "Top:"));
                }
                let Left: number = -999;
                if (this.ReturnAdvertising(data[i], "Left:") != "") {
                    Left = Number(this.ReturnAdvertising(data[i], "Left:"));
                }
                let Cd: number = -999;
                if (this.ReturnAdvertising(data[i], "Cd:") != "") {
                    Cd = Number(this.ReturnAdvertising(data[i], "Cd:"));
                    if (Cd > 0) {
                        this.CDData.push(data[i]);
                        this.scheduleOnce(() => {
                            this.CDData.splice(this.CDData.indexOf(data[i]), 1);
                        }, Cd)
                    }
                }
                if (data[i][0] == BannerType.Banner) {
                    Banner.Instance.ShowBannerAd(BannerID == "" ? null : BannerID);
                }
                if (data[i][0] == BannerType.原生) {
                    Banner.Instance.ShowCustomAd(BannerID == "" ? null : BannerID, Top == -999 ? null : Top, Left == -999 ? null : Left);
                }
                if (data[i][0] == BannerType.视屏) {
                    Banner.Instance.ShowVideoAd(() => { });
                }
                if (data[i][0] == BannerType.宝箱) {
                    if (Banner.Mode == BannerMode.测试包) return;
                    UIManager.ShowPanel(Panel.TreasureBoxPanel);
                }
                if (data[i][0] == BannerType.二次原) {
                    Banner.repeatedly = 1;
                    Banner.Instance.ShowCustomAd(BannerID == "" ? null : BannerID);
                }
                if (data[i][0] == BannerType.四十秒自弹原生) {
                    Banner.Instance.StartPopupAd(40, BannerID == "" ? null : BannerID);
                }
                if (data[i][0] == BannerType.三十秒自弹原生) {
                    Banner.Instance.StartPopupAd(30);
                }
                if (data[i][0] == BannerType.四十五秒自弹原生) {
                    Banner.Instance.StartPopupAd(45);
                }
                if (data[i][0] == BannerType.九十秒自弹原生) {
                    Banner.Instance.StartPopupAd(90);
                }
                if (data[i][0] == BannerType.三十秒自弹Banner) {
                    Banner.Instance.StartBannerAd(30);
                }
                if (data[i][0] == BannerType.五分钟自弹宝箱) {
                    BannerManager.Instance.schedule(() => {
                        UIManager.ShowPanel(Panel.TreasureBoxPanel);
                    }, 300)
                }
                if (data[i][0] == BannerType.三分钟自弹视屏) {
                    Banner.Instance.StartVidoePopupAd(180);
                }
                if (data[i][0] == BannerType.三十五秒自弹添加桌面) {
                    Banner.Instance.StartPopupAddShortcut(35);
                }
                if (data[i][0] == BannerType.九十秒自弹添加桌面) {
                    Banner.Instance.StartPopupAddShortcut(90);
                }
                if (data[i][0] == BannerType.一百二十秒自弹添加桌面) {
                    Banner.Instance.StartPopupAddShortcut(120);
                }
                if (data[i][0] == BannerType.六十秒自弹添加桌面) {
                    Banner.Instance.StartPopupAddShortcut(60);
                }
                if (data[i][0] == BannerType.延迟二十秒四十秒自弹原生) {
                    this.scheduleOnce(() => {
                        Banner.Instance.StartPopupAd(40, BannerID == "" ? null : BannerID);
                    }, 20)
                }
            }
        }
    }

    //返回数组中的字符数据
    ReturnAdvertising(data: string[], _type: string): string {
        data = data.slice();
        data.splice(0, 1);
        let _TypeLeng = _type.length;
        for (let index = 0; index < data.length; index++) {
            if (Tools.GetEnumValues(MaskType).indexOf(data[index]) == -1 && data[index].slice(0, _TypeLeng) == _type) {
                return data[index].slice(_TypeLeng, data[index].length);
            }
        }
        return "";
    }

    //判断广告屏蔽条件是否满足
    GetBannerIsShow(data: string[]): boolean {
        let isCanShow: boolean = true;
        for (let i = 1; i < data.length; i++) {
            if (data[i] == MaskType.地区屏蔽) {
                if (Banner.RegionMask == false) isCanShow = false;
            }
            if (data[i] == MaskType.时间屏蔽) {
                if (Banner.TimeMask == false) isCanShow = false;
            }
            if (data[i] == MaskType.工作日屏蔽) {
                if (Banner.WorkdayMask == false) isCanShow = false;
            }
            if (data[i] == MaskType.主页屏蔽) {
                if (director.getScene().name == GameManager.StartScene) isCanShow = false;
            }
        }
        return isCanShow;
    }












    /**
            * @zh 微信专项广告(请勿在master分支的脚本中调用，只有在模板无法提供的特殊广告规则情况下调用)。
            * 
            * @example
            * Type是广告类型，left和top填0-1,例如left为0在最左边，left为1在最右边(需要适当减去广告宽度)
            */

    public ShowWxAdvertising(Type: WXBannerType, left: number = 0, top: number = 0) {
        switch (Type) {
            case WXBannerType.Banner:
                Banner.Instance.CreateWXBanner();
                break;
            case WXBannerType.插屏:
                Banner.Instance.CreateWXCustomAd();
                break;
            case WXBannerType.视屏:
                Banner.Instance.CreateWXVideo(() => { });
                break;
            case WXBannerType.原生左单格子:
                Banner.Instance.ShowLeftGridAds(left, top);
                break;
            case WXBannerType.原生右单格子:
                Banner.Instance.ShowRightGridAds(left, top);
                break;
            case WXBannerType.原生矩阵格子:
                Banner.Instance.ShowGridAds();
                break;
            case WXBannerType.垂直单列格子左:
                Banner.Instance.ShowLeftColumnGridAds(left, top);
                break;
            case WXBannerType.垂直单列格子右:
                Banner.Instance.ShowRightColumnGridAds(left, top);
                break;
            case WXBannerType.平行单行格子:
                Banner.Instance.ShowLineGridAds(left, top);
                break;
        }

    }


}


export enum WXBannerType {//微信广告类型
    Banner = "Banner",
    插屏 = "插屏",//原生
    视屏 = "视屏",
    原生左单格子 = "原生左单格子",
    原生右单格子 = "原生右单格子",
    原生矩阵格子 = "原生矩阵格子",
    垂直单列格子左 = "垂直单列格子左",
    垂直单列格子右 = "垂直单列格子右",
    平行单行格子 = "平行单行格子"
}