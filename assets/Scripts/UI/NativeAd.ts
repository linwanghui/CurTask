import { Component, Label, Sprite, SpriteFrame, _decorator, Node, Texture2D, UITransform, assetManager, find } from "cc";
import Banner from "../Banner";
import HttpUpBehavior from "../HttpUpBehavior";

const { ccclass, property } = _decorator;

@ccclass
export default class NativeAd extends Component {
  content: Node = null;
  closeButton: Node = null;
  title: Node = null;
  source: Node = null;
  current_Ad = null;

  start() {
    this.content = find("AD/Content", this.node);
    this.closeButton = find("AD/CloseButton", this.node);
    this.title = find("AD/TitleLb", this.node);
    this.source = find("AD/SourceLb", this.node);
    if (!this.content) console.error(`找不到 content。`);
    if (!this.closeButton) console.error(`找不到 closeButton。`);
    if (!this.title) console.error(`找不到 title。`);
    if (!this.source) console.error(`找不到 source。`);

    this.display_Ad();
    //@ts-ignore
    qg.onShow(this.report_Ad_Show);

    let self = this;
    self.closeButton.on(Node.EventType.TOUCH_END, function (event) {
      console.log("原生自渲染-点击关闭");
      self.off_YuanSheng();
    }, self);
  }

  /**
  * 展示广告
  ** adId	string	广告标识，用来上报曝光与点击
  ** title	string	广告标题
  ** desc	string	广告描述
  ** icon	string	推广应用的Icon图标
  ** imgUrlList	Array	广告图片，建议使用该图片资源
  ** logoUrl	string	广告标签图片
  ** clickBtnTxt	string	点击按钮文本描述
  ** creativeType	number	获取广告类型，取值说明：0：无 1：纯文字 2：图片 3：图文混合 4：视频 6. 640x320 大小图文混合 7. 320x210 大小图文单图 8. 320x210 大小图文多图
  ** interactionType	number	获取广告点击之后的交互类型，取值说明：0：无 1：浏览类 2：下载类 3：浏览器（下载中间页广告） 4：打开应用首页 5：打开应用详情页
  */
  display_Ad() {
    console.log("原生自渲染-展示广告...");
    let self = this;
    // 原生广告在没有被曝光或者点击的情况下，再去拉去原生广告就会返回空广告
    // 所以load完要去执行reportAdShow和reportAdClick 才能正常拉取下一条广告
    // 注意：需要先调用reportAdShow上报广告曝光，才能调用reportAdClick去上报点击！！！
    self.report_Ad_Show();
    let adId = Banner.Instance.adUnitAdid;      //广告标识，用来上报曝光与点击
    let imgURL = Banner.Instance.adUnitImgUrl;
    let title = Banner.Instance.title;          //广告标题
    let desc = Banner.Instance.clickBtnTxt;     //广告描述
    let source = Banner.Instance.source;        //广告来源

    if (!imgURL) {
      //this.off_YuanSheng();
      console.error("原生自渲染-没有图片路径");
      Banner.Instance.yuansheng_Node.destroy();
    }

    self.title.getComponent(Label).string = title ? title : '';
    self.source.getComponent(Label).string = source ? source : '';

    self.content.on(Node.EventType.TOUCH_END, function (event) {
      console.log("原生自渲染-广告点击");
      self.report_Ad_Click();
    });

    assetManager.loadRemote(imgURL, (err, res) => {
      if (err) {
        console.error(`原生自渲染-没有图片路径[${err.message || err}]`);
        // self.node.destroy();
        // return;
      }
      try {
        let texture = new Texture2D();
        texture.image = res;

        const sprite = new SpriteFrame();
        sprite.texture = texture;

        self.content.getComponent(Sprite).spriteFrame = sprite;
        self.content.getComponent(UITransform).setContentSize(720, 400);
        console.log("原生自渲染-图片加载成功");
      } catch (e) {
        console.error(`原生自渲染-图片加载失败：[${e}]`);
      }
    });

    console.log("原生自渲染-展示广告成功");
  }

  report_Ad_Show() {
    console.log("原生自渲染-广告上报展示");
    Banner.Instance.nativeAd.reportAdShow({
      adId: Banner.Instance.adUnitAdid
    });
  }

  report_Ad_Click() {
    console.log("原生自渲染-广告上报点击");
    let self = this;
    Banner.Instance.nativeAd.reportAdClick({
      adId: Banner.Instance.adUnitAdid
    });
    HttpUpBehavior.getInstance().adClickUpdate();
    self.off_YuanSheng();
  }

  off_YuanSheng() {
    console.log("原生自渲染-广告销毁");

    if (Banner.Instance.nativeAd) {
      Banner.Instance.nativeAd.offLoad();
      Banner.Instance.nativeAd.offError();
    }

    Banner.Instance.nativeAd.destroy()
    Banner.Instance.nativeAd = null;
    this.node.destroy();
  }

}