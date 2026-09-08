import { sys } from 'cc';

/** 本次原生闪退兼容与诊断的统一入口；不能用手机OS判断，否则会误伤RPK。 */
export class WZSJZ_NativePlatform {
    public static get IsSupported(): boolean {
        return sys.isNative && (sys.platform === sys.Platform.ANDROID
            || sys.platform === sys.Platform.OHOS
            || sys.platform === sys.Platform.OPENHARMONY);
    }
}
