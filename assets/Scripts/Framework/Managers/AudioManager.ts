import { _decorator, AudioClip, AudioSource, Component, director, game, Node, resources } from 'cc';
import { Tools } from '../Utils/Tools';
import PrefsManager from './PrefsManager';
import { Constant } from '../Const/Constant';
const { ccclass, property } = _decorator;

export enum Audios {
    ButtonClick = "Audios/ButtonClick",
}

@ccclass('AudioManager')
export class AudioManager extends Component {
    //是否打开音乐
    public static get IsMusicOn(): boolean {
        return PrefsManager.GetBool(Constant.Key.IsMusicOn, true);
    }
    public static set IsMusicOn(value: boolean) {
        PrefsManager.SetBool(Constant.Key.IsMusicOn, value);
    }

    //是否打开音效
    public static get IsSoundOn(): boolean {
        return PrefsManager.GetBool(Constant.Key.IsSoundOn, true);
    }
    public static set IsSoundOn(value: boolean) {
        PrefsManager.SetBool(Constant.Key.IsSoundOn, value);
    }

    //是否打开震动
    public static get IsVibrateOn(): boolean {
        return PrefsManager.GetBool(Constant.Key.IsVibrateOn, true);
    }
    public static set IsVibrateOn(value: boolean) {
        PrefsManager.SetBool(Constant.Key.IsVibrateOn, value);
    }

    public static Instance: AudioManager = null;
    private bgmSource: AudioSource = null!; // 用于背景音乐
    private sfxSource: AudioSource = null!; // 用于音效
    private audioClips: Map<string, AudioClip> = new Map();

    onLoad() {
        AudioManager.Instance = this;
        this.audioClips = new Map();

        this.bgmSource = this.node.addComponent(AudioSource);
        this.sfxSource = this.node.addComponent(AudioSource);

        this.bgmSource.loop = true; // 背景音乐循环播放
        this.sfxSource.loop = false; // 音效单次播放

        director.addPersistRootNode(this.node);

        this.LoadAllClips();
    }

    private LoadAllClips() {
        let audios = Tools.GetEnumValues(Audios);
        this.LoadAudioClips(audios);
    }

    public LoadAudioClips(clipPaths: string[], callback?: () => void): void {
        let loadedCount = 0;
        clipPaths.forEach((clipName) => {
            resources.load(`${clipName}`, AudioClip, (err, clip) => {
                if (err) {
                    console.error(`Failed to load audio clip: ${clipName}`);
                    return;
                }
                this.audioClips.set(clipName, clip);
                loadedCount++;
                if (loadedCount === clipPaths.length && callback) {
                    callback();
                }
            });
        });
    }

    private LoadAudioClip(clipPath: string, callback?: () => void): void {
        resources.load(`${clipPath}`, AudioClip, (err, clip) => {
            if (err) {
                console.error(`Failed to load audio clip: ${clipPath}`);
                return;
            }
            this.audioClips.set(clipPath, clip);
            callback();
        });
    }

    public PlayCommonBGM(audio: Audios): void {
        if (!AudioManager.IsMusicOn) return;
        const play = () => {
            this.bgmSource.clip = this.audioClips.get(audio);
            this.bgmSource.play();
        }

        if (this.audioClips.has(audio)) {
            play();
        } else {
            this.LoadAudioClip(audio, () => { play(); });
        }
    }

    public PlayCommonSFX(audio: Audios): void {
        if (!AudioManager.IsSoundOn) return;
        if (this.audioClips.has(audio)) {
            this.sfxSource.playOneShot(this.audioClips.get(audio));
        } else {
            this.LoadAudioClip(audio, () => {
                this.sfxSource.playOneShot(this.audioClips.get(audio));
            });
        }
    }

    public PlayBGM(clip: AudioClip): void {
        if (!AudioManager.IsMusicOn) return;
        this.bgmSource.clip = clip;
        this.bgmSource.play();
    }

    public PlaySFX(clip: AudioClip): void {
        if (!AudioManager.IsSoundOn) return;
        this.sfxSource.playOneShot(clip);
    }

    public StopBGM(): void {
        this.bgmSource.stop();
    }

    /**
     * 设置背景音乐音量
     * @param volume 音量值（0.0 - 1.0）
     */
    public SetBGMVolume(volume: number): void {
        this.bgmSource.volume = volume;
    }

    /**
     * 设置音效音量
     * @param volume 音量值（0.0 - 1.0）
     */
    public SetSFXVolume(volume: number): void {
        this.sfxSource.volume = volume;
    }

}