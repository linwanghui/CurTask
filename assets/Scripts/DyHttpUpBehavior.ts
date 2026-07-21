//激活接口
const url_http = "https://mailiangtest.zywxgames.com/api/dy/userActive";
//视频行为接口
const url_http_video = "https://mailiangtest.zywxgames.com/api/dy/dyVideo";
//APPID 必填
const appId = ""; //抖音小游戏小游戏ID

/**
 *------------------注意-----------------
 *前置条件 
 *let query=tt.getLaunchOptionsSync().query;
 *1. 保存query.clickid 到缓存 dy_click_id 保存query.projectid 到缓存 dy_projectid 保存query.promotionid 到缓存 dy_promotionid
 *   保存query.requestid 到缓存 dy_requestid
 *2. 获取tt.login 
 *  当isLogin为true时,存'code'到缓存dy_code,当isLogin为false时存 'anonymous_code' 到缓存dy_code中
 *  保存isLogin到缓存dy_is_login isLogin为true时 dy_is_login值为1 为false时 dy_is_login值为0 。
 */
export default class DyHttpUpBehavior {
    private static mInstance: DyHttpUpBehavior = null;
    public static getInstance(): DyHttpUpBehavior {
        if (this.mInstance === null) {
            this.mInstance = new DyHttpUpBehavior();
        }
        return this.mInstance;
    }
    //是否存在广告点击Id
    public static dy_click_id = '';
    public static dy_open_id = '';
    /**serrectKey用于区别本地储存用户行为数据 */
    private static serrectKey: string = "buydatalst";
    //用户行为信息
    public static buyLstData = {
        //视频数量
        video_num: 0,
    };
    private constructor() {
    }
    public onInit(cb?: Function) {
        if (cc.sys.localStorage.getItem(DyHttpUpBehavior.serrectKey)) {
            DyHttpUpBehavior.buyLstData = JSON.parse(cc.sys.localStorage.getItem(DyHttpUpBehavior.serrectKey));
        } else {
            DyHttpUpBehavior.storage();
        }
        console.log("这里的值:" + cc.sys.localStorage.getItem("dy_click_id"));
        DyHttpUpBehavior.dy_click_id = cc.sys.localStorage.getItem("dy_click_id");
        //代表是从广告来的用户
        if (DyHttpUpBehavior.dy_click_id) {
            if (cc.sys.localStorage.getItem("dy_game_active") != 1) {
                let code = cc.sys.localStorage.getItem("dy_code");
                //获取open_id
                let isLogin = cc.sys.localStorage.getItem("dy_is_login");
                this.userActiveLst(code, isLogin);
            } else {//再次进入游戏  只需要 open_id 与 点击Id
                //获取缓存中的open_id
                DyHttpUpBehavior.dy_open_id = cc.sys.localStorage.getItem("dy_open_id");
                //获取激活的click_id
                DyHttpUpBehavior.dy_click_id = cc.sys.localStorage.getItem("dy_effective_click_id");
                console.log("再次进入游戏");
                console.log(DyHttpUpBehavior.dy_click_id);
                console.log(DyHttpUpBehavior.dy_open_id);
                cb && cb();
            }
        } else {
            cb && cb();
        }
    }
    /**存储本地数据单独存,用存储到先前的数据里面*/
    public static storage() {
        cc.sys.localStorage.setItem(this.serrectKey, JSON.stringify(this.buyLstData));
    }
    //url Post请求
    public functionPost(path: string, param: string, callBack?: Function) {
        try {
            var httpRequest = new XMLHttpRequest();//第一步：创建需要的对象
            httpRequest.open('POST', path, true); //第二步：打开连接
            httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");//设置请求头 注：post方式必须设置请求头（在建立连接后设置请求头）
            httpRequest.send(param);//发送请求 将情头体写在send中
            /**
             * 获取数据后的处理程序
             */
            httpRequest.onreadystatechange = function () {//请求后的回调接口，可将请求成功后要执行的程序写在其中
                if (httpRequest.readyState == 4 && httpRequest.status == 200) {//验证请求是否发送成功
                    console.log("httpRequest.responseText", httpRequest.responseText);
                    var json = JSON.parse(httpRequest.responseText);//获取到服务端返回的数据
                    callBack(json);
                    console.log(json);
                }
            };
        } catch (err) {
            callBack && callBack({ "code": 0 });
        }
    }
    //用户激活
    private userActiveLst(code: string, isLogin: Boolean) {
        var self = this;
        console.log("用户是否登录:" + isLogin);
        if (cc.sys.localStorage.getItem("dy_game_active") != 1) {
            console.log("userActiveLst url:" + url_http);
            let promotionid = cc.sys.localStorage.getItem("dy_promotionid");//计划id
            let projectid = cc.sys.localStorage.getItem("dy_projectid");//项目id
            let requestid = cc.sys.localStorage.getItem("dy_requestid");//请求id
            let param = "open_id=" + code + "&click_id=" + DyHttpUpBehavior.dy_click_id + "&app_id=" + appId + "&promotion_id=" + promotionid;
            param = param + "&isLogin=" + isLogin + "&project_id=" + projectid + "&request_id=" + requestid;
            console.log("userActiveLst param:" + param);
            self.functionPost(url_http, param, function (data) {
                if (data.code == 1) {
                    console.log("用户激活");
                    //保存open_id 到缓存
                    cc.sys.localStorage.setItem("dy_open_id", data.open_id);
                    //保存当前激活使用的click_id到缓存再次进入游戏的时候使用
                    cc.sys.localStorage.setItem("dy_effective_click_id", DyHttpUpBehavior.dy_click_id);
                    //保存当前激活使用的adid到缓存再次进入游戏的时候使用
                    DyHttpUpBehavior.dy_open_id = data.open_id;
                    //保存激活状态到缓存
                    cc.sys.localStorage.setItem("dy_game_active", 1);
                }
            });
        }
    }
    //用户看完激励视频次数上报服务器
    public videoUpdate() {
        if (DyHttpUpBehavior.dy_click_id) {//判断是否有点击ID 如果没有就不上报给后端
            console.log("用户open_id:" + DyHttpUpBehavior.dy_open_id);
            if (DyHttpUpBehavior.dy_open_id == undefined || DyHttpUpBehavior.dy_open_id == null) {
                DyHttpUpBehavior.dy_open_id = cc.sys.localStorage.getItem("dy_open_id");
            }
            let temp_num = DyHttpUpBehavior.buyLstData.video_num;
            temp_num = temp_num + 1;
            //视频只需要 上报open_id  点击Id 视频次数 app_id
            let param = "open_id=" + DyHttpUpBehavior.dy_open_id + "&click_id=" + DyHttpUpBehavior.dy_click_id + "&video_num=" + temp_num + "&app_id=" + appId;
            this.functionPost(url_http_video, param, function (data) {
                if (data.code == 1) {
                    console.log("用户激励视频次数:" + temp_num);
                }
            });
            DyHttpUpBehavior.buyLstData.video_num = temp_num;
            DyHttpUpBehavior.storage();
        }
    }
}