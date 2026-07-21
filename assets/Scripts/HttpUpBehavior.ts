import { native, sys } from "cc";

const isReport = false;//上报开关，控制要不要上报行为
const pkg = "com.sjf.sfksctz100t.app.huawei";//此处给包名
const appId = "6917602774335321572"; //此处给appId


//查询买量地址
const url_http = "https://hwmail.slykji.com/api/index";
//华为平台行为上报接口
const url_http_action_hw = "https://hwmail.slykji.com/api/game/hw";
//鸿蒙平台行为上报接口
const url_http_action_hm = "https://hwmail.slykji.com/api/index/hos";

const IS_HarmonyOSNext_GAME = sys.platform === sys.Platform.OPENHARMONY;
const IS_ANDROID = sys.platform === sys.Platform.ANDROID;
// 是否鸿蒙平台
const isHarmony: boolean = IS_HarmonyOSNext_GAME;
const isAndroid: boolean = IS_ANDROID;

//行为上限定义
const CLICK_MAX = 6;
const VCLICK_MAX = 5;
const TIME_MAX = 30;
const LEVEL_MAX_HUAWEI = 5; // 华为L5后不上报
const SCREEN_MAX_HUAWEI = 10; // 华为screen10后不上报

/**
*华为买量行为上报组件
*步骤1: 请在初始化广告API 后再初始化关键行为上传 
*步骤2: 在通关页面加上 levelUpdate()
*步骤3: 在看完视频后调用 videoUpdate() 
*步骤4: 在插屏广告显示完成后调用 screenUpdate()
*步骤5: 在点击插屏广告回调事件后调用 adClickUpdate()
**/
export default class HttpUpBehavior {
    private static mInstance: HttpUpBehavior = null;
    public static getInstance(): HttpUpBehavior {
        if (this.mInstance === null) {
            this.mInstance = new HttpUpBehavior();
        }
        return this.mInstance;
    }
    public static imei: string | null = null; // 没有获取到传null
    public static oaid = "";
    //是否存在买量
    public static is_buy_m = 0;
    /**serrectKey用于区别本地储存用户行为数据 */
    private static serrectKey: string = "buydatalst";
    //用户行为信息
    public static buyLstData = {
        //关卡数量
        level_num: 0,
        //视频数量
        video_num: 0,
        //插屏广告展示数量
        screen_num: 0,
        //插屏广告点击
        click_num: 0,
        //游戏时长(分钟)
        time_num: 0,
    };

    //时长计时器
    private timeTimer: any = null;
    //862949038405374
    private constructor() {
    }



    private initHuaweiDeviceId(): void {
        console.log("[HttpUpBehavior] 开始获取设备OAID, isHarmony=" + isHarmony);

        if (isHarmony) {
            // 鸿蒙平台：使用OHOSSDK API
            this.getOaidFromHarmony();
        } else if (isAndroid) {
            // Android平台：
            this.getOaidFromAndroid();
        } else {
            // 华为APK/RPK平台：使用qg.getOAID API
            this.getOaidFromHuawei();
        }
    }

    /**
     * 鸿蒙平台获取OAID - 通过OHOSSDK
     */
    private getOaidFromHarmony(): void {
        console.log("[HttpUpBehavior] 使用鸿蒙OHOSSDK API");
        // ✅ 同步调用，isSync = true
        let oaid = native.reflection.callStaticMethod(
            "entry/src/main/ets/interface/OHOSSDK",
            "entry/getOAID",
            "",
            true
        );
        if (oaid) {
            console.log("[HttpUpBehavior] 获取OAID成功:", oaid);
            HttpUpBehavior.oaid = oaid;
            console.log("[HttpUpBehavior] 处理后OAID:", HttpUpBehavior.oaid);
        } else {
            console.log("[H 获取Oaid");
        }
    }

    /**
     * Android平台获取OAID - 
     */
    private getOaidFromAndroid(): void {

    }

    /**
     * 华为RPK平台获取OAID - 通过qg.getOAID
     */
    private getOaidFromHuawei(): void {
        console.log("[HttpUpBehavior] 使用华为qg.getOAID API");
        // @ts-ignore
        if (qg && qg.getOAID) {
            // @ts-ignore
            qg.getOAID({
                success: (ret: any) => {
                    console.log("[HttpUpBehavior] 获取OAID成功 qg.getOAID:", ret.oaid);
                    HttpUpBehavior.oaid = ret.oaid;
                },
                fail: (errormsg: string, errcode: number) => {
                    console.log("[HttpUpBehavior] qg.getOAID失败:", errcode, errormsg);
                },
                complete: () => {
                    console.log("[HttpUpBehavior] qg.getOAID 完成");
                }
            });
        } else {
            console.warn("[HttpUpBehavior] qg.getOAID API不可用");
        }
    }

    //注册广告点击回调
    initCb() {
        // 鸿蒙平台：注册广告点击回调（注册多个函数名）
        if (isHarmony) {
            const adClickHandler = () => {
                console.log("鸿蒙原生广告被点击");
                HttpUpBehavior.getInstance().adClickUpdate();
            };
            //@ts-ignore
            window.interstitialAdClick = adClickHandler;
            console.log("鸿蒙广告回调已注册");
        }
    }
    /**初始化 */
    public onInit(cb?: Function) {
        this.initCb();

        if (!isReport) {
            return;
        }
        console.log("买量行为上传初始化");


        this.initHuaweiDeviceId();

        //此处开始计时
        let temp_is_buy = sys.localStorage.getItem("ismailiang");
        temp_is_buy = parseInt(temp_is_buy);
        switch (temp_is_buy) {
            case 1:
                HttpUpBehavior.is_buy_m = 1;
                this.indexres();
                setTimeout(() => { this.gameTime(); }, 1000);
                cb && cb();
                break;
            case 2:
                HttpUpBehavior.is_buy_m = 2;
                cb && cb();
                break;
            default:
                this.isPkgConfig(cb);
                break;
        }
    }
    public indexres(cb?: Function) {
        if (!isReport) {
            return;
        }
        if (sys.localStorage.getItem(HttpUpBehavior.serrectKey)) {
            const savedData = JSON.parse(sys.localStorage.getItem(HttpUpBehavior.serrectKey));
            // 合并数据，确保time_num有默认值
            HttpUpBehavior.buyLstData = {
                level_num: savedData.level_num || 0,
                video_num: savedData.video_num || 0,
                screen_num: savedData.screen_num || 0,
                click_num: savedData.click_num || 0,
                time_num: savedData.time_num || 0
            };
        } else {
            HttpUpBehavior.storage();
        }
        console.log("这里的值:" + sys.localStorage.getItem("ismailiang"));
        HttpUpBehavior.is_buy_m = parseInt(sys.localStorage.getItem("ismailiang") || "0");
        if (HttpUpBehavior.is_buy_m == 1) {
            console.log("关键行为初始化OAID " + HttpUpBehavior.oaid);
            setTimeout(() => { this.gameTime(); }, 1000);
            this.userActive();
        }
        cb && cb();
    }
    /**存储本地数据单独存,用存储到先前的数据里面*/
    public static storage() {
        sys.localStorage.setItem(this.serrectKey, JSON.stringify(this.buyLstData));
    }
    //GET请求 - 用于检测买量
    public functionGet(path: string, param: string, callBack?: Function) {
        try {
            console.log("开始发送GET请求");
            var httpRequest = new XMLHttpRequest();
            const fullUrl = param ? path + "?" + param : path;
            // console.log(`[HttpUpBehavior] GET请求开始 - URL: ${fullUrl}`);
            httpRequest.open('GET', fullUrl, true);
            httpRequest.onreadystatechange = function () {
                if (httpRequest.readyState == 4) {
                    if (httpRequest.status == 200) {
                        try {
                            var json = JSON.parse(httpRequest.responseText);
                            console.log(`[HttpUpBehavior] GET请求成功 - 状态码: ${httpRequest.status}, 响应: ${httpRequest.responseText}`);
                            callBack(json);
                        } catch (parseErr) {
                            console.error(`[HttpUpBehavior] GET响应解析失败 - 响应文本: ${httpRequest.responseText}, 错误:`, parseErr);
                            callBack && callBack({ "code": 0, "status": 0, "error": "parse_error" });
                        }
                    }
                    else {
                        console.error(`[HttpUpBehavior] GET请求失败 - 状态码: ${httpRequest.status}, 响应: ${httpRequest.responseText}`);
                        callBack && callBack({ "code": 0, "status": httpRequest.status, "error": "http_error" });
                    }
                }
            };
            httpRequest.send();
        } catch (err) {
            console.error(`[HttpUpBehavior] GET请求异常 - 错误:`, err);
            callBack && callBack({ "code": 0, "status": 0, "error": "exception", "exception": err });
        }
    }

    //GET请求 - 用于行为上报（改为GET方式）
    public functionPost(path: string, param: string, callBack?: Function) {
        try {
            console.log("开始发送POST请求");
            var httpRequest = new XMLHttpRequest();
            // ✅ 使用GET请求，参数拼接在URL后面
            const url = path + "?" + param;
            // console.log(`[HttpUpBehavior] GET请求开始 - URL: ${url}`);
            httpRequest.open('GET', url, true);
            httpRequest.onreadystatechange = function () {
                if (httpRequest.readyState == 4) {
                    if (httpRequest.status == 200) {
                        try {
                            var json = JSON.parse(httpRequest.responseText);
                            console.log(`[HttpUpBehavior] GET请求成功 - 状态码: ${httpRequest.status}, 响应:`, JSON.stringify(json));
                            let rescode = json.code ? json.code : json.status;
                            if (rescode !== undefined) {
                                if (rescode === 1) {
                                    console.log(`[HttpUpBehavior] GET响应正常 - code=1`);
                                } else if (rescode === 0) {
                                    console.warn(`[HttpUpBehavior] GET响应失败 - code=0, msg=${json.msg || '无消息'}`);
                                } else if (rescode === -1) {
                                    console.error(`[HttpUpBehavior] GET参数异常 - code=-1, msg=${json.msg || '无消息'}`);
                                } else {
                                    console.warn(`[HttpUpBehavior] GET响应code未知 - code=${json.code}`);
                                }
                            } else {
                                console.warn(`[HttpUpBehavior] GET响应缺少code字段 - 响应:`, JSON.stringify(json));
                            }
                            callBack(json);
                        } catch (parseErr) {
                            console.error(`[HttpUpBehavior] GET响应解析失败 - 响应文本: ${httpRequest.responseText}, 错误:`, parseErr);
                            callBack && callBack({ "code": 0, "status": 0, "error": "parse_error" });
                        }
                    }
                    else {
                        console.error(`[HttpUpBehavior] GET请求失败 - 状态码: ${httpRequest.status}, 响应: ${httpRequest.responseText}`);
                        callBack && callBack({ "code": 0, "status": httpRequest.status, "error": "http_error" });
                    }
                }
            };
            httpRequest.send();
        } catch (err: any) {
            console.error(`[HttpUpBehavior] POST请求异常 - 错误类型: ${typeof err}`);
            console.error(`[HttpUpBehavior] POST请求异常 - 错误消息: ${err.message || err}`);
            console.error(`[HttpUpBehavior] POST请求异常 - 完整错误:`, err);
            callBack && callBack({ "code": 0, "status": 0, "error": "exception", "exception": err.message || JSON.stringify(err) });
        }
    }
    //查询是否设置买量参数
    private isPkgConfig(cb?: Function) {
        let self = this;
        let startTime = Date.now();
        // console.log(`[HttpUpBehavior] ====== 开始查询买量配置 ======`);
        // console.log(`[HttpUpBehavior] 请求URL: ${url_http}`);
        // console.log(`[HttpUpBehavior] 请求参数: pkg=${pkg}&APPID=${appId}`);
        // console.log(`[HttpUpBehavior] 请求开始时间: ${startTime}`);

        // 检测买量只传pkg参数
        this.functionGet(url_http, `pkg=${pkg}`, (data) => {
            if (data && data.code === 1) {
                sys.localStorage.setItem("ismailiang", "1");
            } else {
                sys.localStorage.setItem("ismailiang", "2");
            }
            self.indexres(cb);
        });

        setTimeout(() => {
            let elapsed = Date.now() - startTime;
            if (!sys.localStorage.getItem("ismailiang")) {
                // console.log(`[HttpUpBehavior] ⏰ 请求超时！已等待 ${elapsed}ms，ismailiang未设置`);
                // console.log(`[HttpUpBehavior] ⏰ 执行默认逻辑（自然用户）`);
                self.indexres(cb);
            } else {
                // console.log(`[HttpUpBehavior] ✓ 请求在 ${elapsed}ms 内完成，ismailiang已设置`);
            }
        }, 3000);
    }
    //用户激活注册
    private userActive() {
        if (!isReport) {
            return;
        }
        if (sys.localStorage.getItem("oppoactive") != 1) {
            console.log(`[HttpUpBehavior] oaid: ${HttpUpBehavior.oaid} 开始用户激活注册`);
            //检查oaid是否为空
            if (!HttpUpBehavior.oaid || HttpUpBehavior.oaid === "") {
                console.error("[HttpUpBehavior] oaid为空，无法进行用户激活");
                return;
            }
            console.log(`[HttpUpBehavior] ====== 开始用户激活 ======`);
            // ✅ 使用字符串拼接格式 + 添加 app_id 参数
            let param = "pkg=" + encodeURIComponent(pkg) +
                "&imei=" + encodeURIComponent(HttpUpBehavior.imei || "") +
                "&oaid=" + encodeURIComponent(HttpUpBehavior.oaid || "") +
                "&action=" + encodeURIComponent("active") +
                "&APPID=C" + encodeURIComponent(appId);
            // console.log(`[HttpUpBehavior] 激活参数:`, param);
            let url = isHarmony ? url_http_action_hm : url_http_action_hw;
            this.functionPost(url, param, function (data) {
                let rescode = data.code ? data.code : data.status;
                if (data && rescode == 1) {
                    console.log("[HttpUpBehavior] 用户激活成功，设置oppoactive=1");
                    sys.localStorage.setItem("oppoactive", 1);
                } else {
                    console.error("[Httpcodevior] 用户激活失败 - response: ", data);
                }
            });
        } else {
            console.log("[HttpUpBehavior] 用户已激活，跳过激活流程");
        }
    }

    //通用行为上报方法
    private reportAction(action: string) {
        if (HttpUpBehavior.is_buy_m != 1) {
            console.log(`[HttpUpBehavior] is_buy_m=${HttpUpBehavior.is_buy_m}，跳过行为上报: ${action}`);
            return;
        }
        console.log(`[HttpUpBehavior] oaid: ${HttpUpBehavior.oaid} 开始上报行为`);

        //检查oaid是否为空
        if (!HttpUpBehavior.oaid || HttpUpBehavior.oaid === "") {
            console.error(`[HttpUpBehavior] oaid为空，无法上报行为: ${action}`);
            return;
        }
        console.log(`[HttpUpBehavior] ====== 上报行为: ${action} ======`);
        // ✅ 使用字符串拼接格式 + 添加 app_id 参数
        let param = "pkg=" + encodeURIComponent(pkg) +
            "&imei=" + encodeURIComponent(HttpUpBehavior.imei || "") +
            "&oaid=" + encodeURIComponent(HttpUpBehavior.oaid || "") +
            "&action=" + encodeURIComponent(action) +
            "&APPID=C" + encodeURIComponent(appId);
        // console.log(`[HttpUpBehavior] 上报参数:`, param);
        let url = isHarmony ? url_http_action_hm : url_http_action_hw;
        this.functionPost(url, param, function (data) {
            let rescode = data.code ? data.code : data.status;
            if (data && rescode == 1) {
                console.log("[HttpUpBehavior] 行为上报成功:", action);
            } else {
                console.error("[HttpUpBehavior] 行为上报失败 - action:", action, "响应:", data);
            }
        });
    }
    //用户关卡行为上报服务器
    public levelUpdate() {
        if (!isReport) {
            return;
        }
        console.log("关键行为关卡——————————————————   ");
        if (HttpUpBehavior.is_buy_m != 1) {
            return;
        }
        // 鸿蒙平台全程不上报关卡
        if (isHarmony) {
            console.log("[HttpUpBehavior] 鸿蒙平台，跳过关卡上报");
            return;
        }
        let temp_num = HttpUpBehavior.buyLstData.level_num;
        // 华为L5后不上报
        if (temp_num > LEVEL_MAX_HUAWEI) {
            console.log("[HttpUpBehavior] 已达到L5上限，不上报");
            return;
        }
        temp_num = temp_num + 1;
        HttpUpBehavior.buyLstData.level_num = temp_num;
        HttpUpBehavior.storage();
        this.reportAction("L" + temp_num);
    }

    //用户看完激励视频次数上报服务器
    public videoUpdate() {
        if (!isReport) {
            return;
        }
        console.log("关键行为视频——————————————————   ");
        if (HttpUpBehavior.is_buy_m != 1) {
            return;
        }
        let temp_num = HttpUpBehavior.buyLstData.video_num;
        if (temp_num > VCLICK_MAX) {
            console.log("[HttpUpBehavior] vclick已达上限，不上报");
            return;
        }
        temp_num = temp_num + 1;
        HttpUpBehavior.buyLstData.video_num = temp_num;
        HttpUpBehavior.storage();
        this.reportAction("vclick" + temp_num);
    }

    //插屏广告展示上报
    public screenUpdate() {
        if (!isReport) {
            return;
        }
        console.log("关键行为插屏——————————————————   ");
        if (HttpUpBehavior.is_buy_m != 1) {
            return;
        }
        // 鸿蒙平台全程不上报插屏展示
        if (isHarmony) {
            console.log("[HttpUpBehavior] 鸿蒙平台，跳过插屏展示上报");
            return;
        }
        let temp_num = HttpUpBehavior.buyLstData.screen_num;
        // 华为screen10后不上报
        if (temp_num > SCREEN_MAX_HUAWEI) {
            console.log("[HttpUpBehavior] screen已达上限，不上报");
            return;
        }
        temp_num = temp_num + 1;
        HttpUpBehavior.buyLstData.screen_num = temp_num;
        HttpUpBehavior.storage();
        this.reportAction("screen" + temp_num);
    }

    //更新插屏广告点击次数
    public adClickUpdate() {
        if (!isReport) {
            return;
        }
        console.log("关键行为插屏广告点击——————————————————   ");
        if (HttpUpBehavior.is_buy_m != 1) {
            return;
        }
        let temp_num = HttpUpBehavior.buyLstData.click_num;
        if (temp_num > CLICK_MAX) {
            console.log("[HttpUpBehavior] click已达上限，不上报");
            return;
        }
        temp_num = temp_num + 1;
        HttpUpBehavior.buyLstData.click_num = temp_num;
        HttpUpBehavior.storage();
        this.reportAction("click" + temp_num);
    }

    //游戏时长 - 根据文档要求，只在特定分钟数上报
    public gameTime() {
        if (!isReport) {
            return;
        }
        if (HttpUpBehavior.is_buy_m == 1) {
            let temp_time = HttpUpBehavior.buyLstData.time_num;
            if (temp_time > TIME_MAX) {
                console.log("[HttpUpBehavior] 时长已达上限，停止追踪");
                return;
            }
            temp_time = temp_time + 1;
            HttpUpBehavior.buyLstData.time_num = temp_time;
            HttpUpBehavior.storage();

            // ✅ 根据文档要求：只在达到特定分钟数时上报
            const TIME_THRESHOLDS = [1, 5, 10, 15, 20, 25, 30];
            if (TIME_THRESHOLDS.includes(temp_time)) {
                console.log("[HttpUpBehavior] 时长上报:", temp_time);
                this.reportAction("time" + temp_time);
            }

            this.timeTimer = setTimeout(() => { this.gameTime(); }, 60000); // 每分钟检查一次
        }
    }

    //停止时长追踪
    public stopGameTime() {
        if (this.timeTimer) {
            clearTimeout(this.timeTimer);
            this.timeTimer = null;
        }
    }

    //清理资源
    public destroy() {
        this.stopGameTime();
    }
}