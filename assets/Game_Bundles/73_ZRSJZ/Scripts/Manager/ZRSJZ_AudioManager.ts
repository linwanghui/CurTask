import { _decorator, AudioClip, AudioSource, Component, error, Node } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_AudioManager')
export class ZRSJZ_AudioManager extends Component {
    public static Instance: ZRSJZ_AudioManager = null;

    public AudioClipMaps: Map<string, AudioClip> = new Map();
    CyclicSoundMap: Map<string, AudioSource> = new Map();
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

    public PlayMusicByClip(audioClip: AudioClip, loop: boolean = true, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.MusicMute || this._curMusic == audioClip.name) return;
        if (!audioClip) {
            error(`音频不存在: `);
            return;
        }
        this._curMusic = audioClip.name;
        if (this._curMusicAudioSource) this.freeSource(this._curMusicAudioSource);
        this._curMusicAudioSource = this.getIdleSource();
        this._curMusicAudioSource.clip = audioClip;
        this._curMusicAudioSource.loop = loop;
        this._curMusicAudioSource.volume = valume;
        this._curMusicAudioSource.play();
    }

    public StopMusic() {
        if (this._curMusicAudioSource) {
            this.freeSource(this._curMusicAudioSource);
            this._curMusicAudioSource = null;
            this._curMusic = "";
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

    public PlayCyclicSound(audioName: string, loop: boolean = true, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!this.AudioClipMaps.has(audioName)) {
            error(`音频不存在: ${audioName}`);
            return;
        }

        const sound = this.getIdleSource();
        sound.clip = this.AudioClipMaps.get(audioName);
        sound.loop = loop;
        sound.volume = valume;
        sound.play();
        this.CyclicSoundMap.set(audioName, sound);
    }

    public StopCyclicSound(audioName: string) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!this.CyclicSoundMap.has(audioName)) {
            error(`音频不存在: ${audioName}`);
            return;
        }
        const sound = this.CyclicSoundMap.get(audioName);
        sound.clip = null;
        sound.stop();
        this.freeSource(sound);
        this.CyclicSoundMap.delete(audioName);
        console.error(2);
    }

    public PlaySoundByClip(audioClip: AudioClip, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!audioClip) {
            error(`音频不存在:`);
            return;
        }
        console.error(audioClip.name);

        const sound = this.getIdleSource();
        sound.clip = audioClip;
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
        source.clip = null;
        this.idleSources.push(source);
    }

    private onPlayEnded(event: AudioSource) {
        this.freeSource(event);
    }

}


