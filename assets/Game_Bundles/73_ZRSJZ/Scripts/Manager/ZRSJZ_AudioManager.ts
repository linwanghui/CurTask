import { _decorator, AudioClip, AudioSource, Component, error, Node } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_AudioManager')
export class ZRSJZ_AudioManager extends Component {
    public static Instance: ZRSJZ_AudioManager = null;

    public AudioClipMaps: Map<string, AudioClip> = new Map();
    private idleSources: AudioSource[] = [];
    private _curMusic: string = "";
    private _curMusicAudioSource: AudioSource = null;

    Init() {
        this.node.on(AudioSource.EventType.ENDED, this.onPlayEnded, this);
    }
    public PlayMusic(audioName: string, loop: boolean = true, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.MusicMute || this._curMusic == audioName) return;
        if (!this.AudioClipMaps.has(audioName)) {
            error(`音频不存在: ${audioName}`);
            return;
        }
        this._curMusic = audioName;
        if (this._curMusicAudioSource) this.freeSource(this._curMusicAudioSource);
        this._curMusicAudioSource = this.getIdleSource();
        this._curMusicAudioSource.clip = this.AudioClipMaps.get(audioName);
        this._curMusicAudioSource.loop = loop;
        this._curMusicAudioSource.volume = valume;
        this._curMusicAudioSource.play();
    }

    public StopMusic() {
        if (this._curMusicAudioSource) {
            this.freeSource(this._curMusicAudioSource);
            this._curMusicAudioSource = null;
        }
    }

    public PlaySound(audioName: string, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!this.AudioClipMaps.has(audioName)) {
            error(`音频不存在: ${audioName}`);
            return;
        }
        const sound = this.getIdleSource();
        sound.clip = this.AudioClipMaps.get(audioName);
        sound.loop = false;
        sound.volume = valume;
        sound.play();
    }

    private getIdleSource(): AudioSource {
        if (this.idleSources.length <= 0) {
            this.idleSources.push(this.node.addComponent(AudioSource));
        }
        return this.idleSources.shift();
    }

    private freeSource(source: AudioSource) {
        source.stop();
        this.idleSources.push(source);
    }

    private onPlayEnded(event: AudioSource) {
        console.error(event);
    }

}


