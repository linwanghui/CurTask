import { _decorator, Component, director, EventTouch, find, Node, tween, Tween } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ProjectEvent, ProjectEventManager } from 'db://assets/Scripts/Framework/Managers/ProjectEventManager';

const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_SettingPanel')
export class ZRSJZ_SettingPanel extends ZRSJZ_Panel {

    MusicSlide: Node = null;
    MusicOpen: Node = null;
    MusicClose: Node = null;
    SoundSlide: Node = null;
    SoundOpen: Node = null;
    SoundClose: Node = null;

    protected onLoad(): void {
        this.MusicSlide = find("Panel/音乐/音乐点击区/音乐滑块", this.node);
        this.MusicOpen = find("Panel/音乐/音乐点击区/开", this.node);
        this.MusicClose = find("Panel/音乐/音乐点击区/关", this.node);
        this.SoundSlide = find("Panel/音效/音效点击区/音乐滑块", this.node);
        this.SoundOpen = find("Panel/音效/音效点击区/开", this.node);
        this.SoundClose = find("Panel/音效/音效点击区/关", this.node);
    }

    protected start(): void {
        this.ShowState();
    }

    ShowState() {
        this.ShowMusicEffect(ZRSJZ_GameData.Instance.MusicMute);
        this.ShowSoundEffect(ZRSJZ_GameData.Instance.SoundMute);
    }

    ShowMusicEffect(flag: boolean) {
        Tween.stopAllByTarget(this.MusicSlide);
        tween(this.MusicSlide)
            .to(0.3, { x: flag ? -45 : 27 }, { easing: 'backOut' })
            .call(() => {
                this.MusicOpen.active = !flag;
                this.MusicClose.active = flag;
            })
            .start();
    }

    ShowSoundEffect(flag: boolean) {
        Tween.stopAllByTarget(this.SoundSlide);
        tween(this.SoundSlide)
            .to(0.3, { x: flag ? -45 : 27 }, { easing: 'backOut' })
            .call(() => {
                this.SoundOpen.active = !flag;
                this.SoundClose.active = flag;
            })
            .start();
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "音乐点击区":
                //位置左边X为-45，右边为27
                ZRSJZ_GameData.Instance.MusicMute = !ZRSJZ_GameData.Instance.MusicMute;
                this.ShowMusicEffect(ZRSJZ_GameData.Instance.MusicMute);
                ZRSJZ_GameData.Instance.MusicMute ? ZRSJZ_AudioManager.Instance.StopMusic() : ZRSJZ_AudioManager.Instance.PlayMusic("BGM");
                break;
            case "音效点击区":
                ZRSJZ_GameData.Instance.SoundMute = !ZRSJZ_GameData.Instance.SoundMute;
                this.ShowSoundEffect(ZRSJZ_GameData.Instance.SoundMute);
                break;
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.设置界面);
                break;
            case "主页":
                ProjectEventManager.emit(ProjectEvent.返回主页按钮事件, () => {
                    ProjectEventManager.emit(ProjectEvent.返回主页);
                    director.loadScene("Start");
                });
                break;

        }
    }
}


