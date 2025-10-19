export {};

declare global {
  interface Window {
    veera: {
      sendClass: (c: number) => Promise<any>;
      sendExperiment: (e: number) => Promise<any>;
      sendThresholdsFor: (key: string) => Promise<any>;
      onKitClassChanged: (cb: (d: any) => void) => void;
      onKitExperimentChanged: (cb: (d: any) => void) => void;
      onSensorUpdate: (cb: (d: any) => void) => void;
      onSerialConnected: (cb: () => void) => void;
      onSerialDisconnected: (cb: () => void) => void;
      onKitAck: (cb: (d: any) => void) => void;
    };
  }
}
