import { _decorator, AudioSource, Component, Node } from 'cc';
import { ZRSJZ_GameData } from '../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_AudioCircularly')
export class ZRSJZ_AudioCircularly extends Component {

    AudioSource: AudioSource = null;

    start() {
        this.AudioSource = this.getComponent(AudioSource);
        this.AudioSource.loop = true;
        this.AudioSource.volume = 0.5;
        if (!ZRSJZ_GameData.Instance.MusicMute) this.AudioSource.play();
    }

}


