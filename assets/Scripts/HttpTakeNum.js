var HKT_PKG = "com.vivo.cptan"//小游戏包名

var Changle = "cqsggl";//小游戏渠道

var HTN = {
    getGGType: 0,//获取到的广告策略
    GD: 0,
    onLoad() {
        this.sfcity = '';
        this.dealTakeNum();
        console.log("------------");
        window['htn'] = this;
    },

    dealTakeNum() {
        console.log('---dealTakeNum----');
        let self = this;

        let url = 'http://datacenter.zywxgames.com:15850/api/index/params?pkm=' + HKT_PKG + '&canshu=' + Changle + '&url=new&yys=yd';
        console.log(url);
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status < 400)) {
                var response = xhr.responseText;
                console.log("onreadystatechange:" + response);
                self.dealMessage(response);
            }

        };
        xhr.open("GET", url, true);
        xhr.send();
    },
    dealMessage(str1) {

        let ggarr_b = str1.split("&")

        let ggarr = ggarr_b[0]
        let gi = 0
        if (ggarr_b.length > 1) {
            gi = ggarr_b[1];
        }
        let ggar = ggarr.split("#")

        let str = ggar[gi];

        let index = str.indexOf("GG");
        if (index != -1) {
            let num = parseInt(str.substring(index + 2,
                index + 3));

            this.getGGType = num;
            console.log("getGGType:" + this.getGGType);
        }
        index = str.indexOf("GD");
        if (index != -1) {
            let num = parseInt(str.substring(index + 2,
                index + 3));

            this.GD = num;
            console.log("GD:" + this.GD);
        }
        console.log(this.getGGType);

    },

};
HTN.onLoad();

module.exports = HTN;