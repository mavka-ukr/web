window.MAVKA_WEB_URL = "https://веб.мавка.укр";

class Mavka {
  version;
  options;
  worker;
  loading;
  ready;
  readyListener;
  eid;
  listeners;

  constructor(version, options) {
    this.reset();
  }

  reset() {
    this.version = version;
    this.options = options || {};
    this.worker = null;
    this.loading = false;
    this.ready = false;
    this.readyListener = null;
    this.eid = 0;
    this.listeners = new Map();
  }

  load() {
    return new Promise(async (res, rej) => {
      if (this.ready) {
        rej(new Error("Mavka already loaded!"));
        return;
      }
      if (this.loading) {
        rej(new Error("Mavka is loading!"));
        return;
      }

      async function createCrossOriginWorker(url) {
        const response = await fetch(url);
        const scriptText = await response.text();

        const blob = new Blob([scriptText], { type: 'application/javascript' });

        const blobURL = URL.createObjectURL(blob);

        return new Worker(blobURL);
      }

      this.worker = await createCrossOriginWorker(`${window.MAVKA_WEB_URL}/версії/${this.version}/mavka_worker.js`);

      this.readyListener = { res, rej };

      this.worker.postMessage({ type: "INIT", mavkaWebUrl: window.MAVKA_WEB_URL });

      this.worker.onmessage = (event) => {
        const eventData = event.data;

        if (eventData && typeof eventData === "object") {
          const type = eventData.type;
          const id = eventData.id;

          if (type === "MAVKA_READY") {
            this.ready = true;
            this.readyListener.res();
            this.readyListener = null;
            return;
          }

          if (type === "WRITE_RESULT") {
            const l = this.listeners.get(id);
            this.listeners.delete(id);

            if (eventData.error) {
              l.rej(eventData.error);
            } else {
              l.res();
            }
          }

          if (type === "READ_RESULT") {
            const l = this.listeners.get(id);
            this.listeners.delete(id);

            if (eventData.error) {
              l.rej(eventData.error);
            } else {
              l.res(eventData.result);
            }
          }

          if (type === "RUN_RESULT") {
            const l = this.listeners.get(id);
            this.listeners.delete(id);

            if (eventData.error) {
              l.rej(eventData.error);
            } else {
              l.res(eventData.resultCode);
            }
          }

          if (type === "PRINT") {
            const value = eventData.value;
            const color = eventData.color;

            if (this.options.print) {
              this.options.print(value, color);
            } else {
              alert(value);
            }
          }

          if (type === "READLINE") {
            const prefix = eventData.prefix;

            if (this.options.readline) {
              this.options.readline((value) => {
                this.worker.postMessage({ type: "READLINE_RESULT", id, value });
              }, prefix);
            } else {
              const value = prompt(prefix);
              this.worker.postMessage({ type: "READLINE_RESULT", id, value });
            }
          }
        }
      };
    })
  }

  write(path, value) {
    return new Promise((res, rej) => {
      if (!this.ready) {
        rej(new Error("Mavka not ready!"));
        return;
      }

      const id = this.eid++;

      this.worker.postMessage({ type: "WRITE", id, path, value });

      this.listeners.set(id, { res, rej });
    });
  }

  read(path, resultType) {
    return new Promise((res, rej) => {
      if (!this.ready) {
        rej(new Error("Mavka not ready!"));
        return;
      }

      const id = this.eid++;

      this.worker.postMessage({ type: "READ", id, path, resultType });

      this.listeners.set(id, { res, rej });
    });
  }

  readBytes(path) {
    return this.read(path, "bytes");
  }

  readString(path) {
    return this.read(path, "string");
  }

  run(args) {
    if (!args) {
      args = [];
    }
    if (typeof args === "string") {
      args = [args];
    }

    return new Promise((res, rej) => {
      if (!this.ready) {
        rej(new Error("Mavka not ready!"));
        return;
      }

      const id = this.eid++;

      this.worker.postMessage({ type: "RUN", id, args });

      this.listeners.set(id, { res, rej });
    });
  }

  terminate() {
    if (!this.worker) {
      rej(new Error("No worker!"));
      return;
    }

    this.worker.terminate();

    this.reset();
  }

  static async fetchAvailableVersions() {
    const url = `${window.MAVKA_WEB_URL}/версії/версії.txt`;

    const response = await fetch(url);
    const text = await response.text();
    const lines = text.trim().split("\n");

    return lines
      .map((line) => line.split(":"))
      .map(([pkg, mavka]) => ({ pkg, mavka }))
  }
}